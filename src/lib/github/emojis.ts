function replaceEmojis(text: string, emojiMap: Record<string, string>): string {
  return text.replace(/:\w+:/g, (match) => {
    const name = match.slice(1, -1);
    return emojiMap[name] ?? match;
  });
}

export { replaceEmojis };
