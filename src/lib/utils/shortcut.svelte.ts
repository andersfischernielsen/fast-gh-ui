export function useShortcut(
  key: string,
  action: () => void,
  options?: { shift?: boolean },
): () => void {
  function onKeydown(e: KeyboardEvent) {
    if (
      (e.metaKey || e.ctrlKey) &&
      e.key.toLowerCase() === key.toLowerCase() &&
      (!options?.shift || e.shiftKey)
    ) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      action();
    }
  }
  document.addEventListener("keydown", onKeydown);
  return () => document.removeEventListener("keydown", onKeydown);
}

export function shortcutHint(
  key: string,
  options?: { shift?: boolean },
): string {
  const mod = navigator.platform.includes("Mac") ? "⌘" : "^";
  const shiftKey = navigator.platform.includes("Mac") ? "⇧" : "Shift+";
  return `${options?.shift ? shiftKey : ""}${mod}${key}`;
}
