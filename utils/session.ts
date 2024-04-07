import headers, { baseUrl } from "./headers";

export function randomUUID() {
  let d = new Date().getTime();
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    d += performance.now();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default async function () {
  let device = randomUUID();

  const res = await fetch(
    `${baseUrl}/backend-anon/sentinel/chat-requirements`,
    {
      method: "POST",
      headers: {
        ...headers,
        "oai-device-id": device,
      },
    },
  ).then((r) => r.json());

  console.log(res);

  return { device, token: res.token };
}
