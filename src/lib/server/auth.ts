import { redirect, type Cookies } from "@sveltejs/kit";
import { Octokit } from "@octokit/rest";
import { dev } from "$app/environment";

const TOKEN_COOKIE = "gh-token";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getTokenFromCookies(cookies: Cookies): string | null {
  return cookies.get(TOKEN_COOKIE) ?? null;
}

function requireToken(cookies: Cookies, redirectTo = "/github/login"): string {
  const token = getTokenFromCookies(cookies);
  if (!token) {
    throw redirect(302, redirectTo);
  }
  return token;
}

function createGitHubClient(token: string): Octokit {
  return new Octokit({ auth: token });
}

function setTokenCookie(cookies: Cookies, token: string): void {
  cookies.set(TOKEN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: !dev,
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
  });
}

function clearTokenCookie(cookies: Cookies): void {
  cookies.delete(TOKEN_COOKIE, { path: "/" });
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Authorization:[^\r\n]*/gi, "Authorization: [redacted]")
    .replace(/Cookie:[^\r\n]*/gi, "Cookie: [redacted]");
}

function githubErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : "GitHub request failed";
  return sanitizeErrorMessage(raw);
}

export {
  getTokenFromCookies,
  requireToken,
  createGitHubClient,
  setTokenCookie,
  clearTokenCookie,
  sanitizeErrorMessage,
  githubErrorMessage,
  TOKEN_COOKIE,
};
