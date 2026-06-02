import { createClient } from "./client";

let emojiMap: Record<string, string> | null = null;

async function loadEmojiMap(): Promise<Record<string, string>> {
  if (emojiMap) return emojiMap;
  const octokit = createClient();
  const response = await octokit.request("GET /emojis");
  emojiMap = response.data as Record<string, string>;
  return emojiMap;
}

function replaceEmojis(text: string, map: Record<string, string>): string {
  return text.replace(/:([\w+-]+):/g, (match, name) => {
    const url = map[name];
    if (!url) return match;
    const filename = url.split("/").pop()?.replace(".png", "") ?? "";
    const hexes = filename.split("-").filter((h) => h.length >= 4);
    return hexes.map((h) => String.fromCodePoint(parseInt(h, 16))).join("");
  });
}

export { loadEmojiMap, replaceEmojis };
