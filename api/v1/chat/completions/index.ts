import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from "openai/src/resources/index.js";
import { createParser } from "eventsource-parser";
import getSession, { randomUUID } from "../../../../utils/session";
import headers, { apiUrl } from "../../../../utils/headers";

export async function POST(request: Request) {
  const { device, token } = await getSession();

  const inputBody: ChatCompletionCreateParams = await request.json();

  const body = {
    action: "next",
    messages: inputBody.messages.map(({ role, content }) => ({
      author: { role },
      content: { content_type: "text", parts: [content] },
    })),
    parent_message_id: randomUUID(),
    model: "text-davinci-002-render-sha",
    timezone_offset_min: -180,
    suggestions: [],
    history_and_traing_disabled: true,
    conversation_mode: { kind: "primary_assistant" },
    websocket_request_id: randomUUID(),
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...headers,
      "oai-device-id": device,
      "openai-sentinel-chat-requirements-token": token,
    },
    body: JSON.stringify(body),
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        let last = "";

        const parser = createParser((event) => {
          if (event.type === "event") {
            const { data } = event;

            if (data === "[DONE]") {
              controller.close();
              return;
            }

            const json = JSON.parse(data);

            if (json.message.author.role === "assistant") {
              const now: string = json.message.content.parts.join("");
              const delta = now.replace(last, "");
              last = now;

              const event: ChatCompletionChunk = {
                id: json.message.id,
                created: Math.round(json.message.create_time),
                object: "chat.completion.chunk",
                model: inputBody.model,
                choices: [
                  {
                    delta: { content: delta },
                    index: 0,
                    finish_reason:
                      json.message.status === "in_progress" ? null : "stop",
                  },
                ],
                // @ts-ignore
                raw: json,
              };

              console.log(event);

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
            }
          }
        });

        for await (const chunk of res.body as any) {
          parser.feed(decoder.decode(chunk));
        }
      },
    }),
    {
      status: res.status,
      statusText: res.statusText,
      headers: { "content-type": "text/event-stream; charset=utf8" },
    },
  );
}
