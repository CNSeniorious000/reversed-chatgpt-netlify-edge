import type { ChatCompletionChunk, ChatCompletionCreateParams } from "openai/src/resources/index.js";
import { createParser } from "eventsource-parser";
import { Config } from "@netlify/edge-functions";

export const baseUrl = "https://chat.openai.com";
export const apiUrl = `${baseUrl}/backend-anon/conversation`;

const headers = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "content-type": "application/json",
  "oai-language": "en-US",
  origin: baseUrl,
  pragma: "no-cache",
  referer: baseUrl,
  "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

function randomUUID() {
  let d = new Date().getTime();
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    d += performance.now();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function getSession() {
  let device = randomUUID();

  const res = await fetch(`${baseUrl}/backend-anon/sentinel/chat-requirements`, {
    method: "POST",
    headers: {
      ...headers,
      "oai-device-id": device,
    },
  }).then((r) => r.text());

  console.log(res);

  return { device, token: JSON.parse(res).token };
}

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

            if (json.message.author.role === "assistant" && json.message.metadata.message_type === "next") {
              const now: string = json.message.content.parts.at(-1);
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
                    finish_reason: json.message.status === "in_progress" ? null : "stop",
                  },
                ],
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
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
    }
  );
}

export default (request: Request) => {
  if (request.method === "POST") {
    return POST(request);
  }

  return new Response(null, { status: 405 });
};

export const config: Config = { path: "/v1/chat/completions" };
