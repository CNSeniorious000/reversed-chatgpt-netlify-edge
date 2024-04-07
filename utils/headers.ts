export const baseUrl = "https://chat.openai.com";
export const apiUrl = `${baseUrl}/backend-anon/conversation`;

export default {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  "content-type": "application/json",
  "oai-language": "en-US",
  origin: baseUrl,
  pragma: "no-cache",
  referer: baseUrl,
  "sec-ch-ua":
    '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};
