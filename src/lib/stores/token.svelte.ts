const TOKEN_KEY = "github-frontend-token";

let stored = typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

const token = $state<{ value: string | null }>({ value: stored });

function getToken(): string | null {
  return token.value;
}

function isValid(): boolean {
  return token.value !== null && token.value.length > 0;
}

function setToken(t: string): void {
  token.value = t;
  localStorage.setItem(TOKEN_KEY, t);
}

function clearToken(): void {
  token.value = null;
  localStorage.removeItem(TOKEN_KEY);
}

export { token, getToken, isValid, setToken, clearToken };
