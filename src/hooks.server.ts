import { redirect, type Handle, type HandleServerError } from "@sveltejs/kit";
import { getTokenFromCookies, githubErrorMessage } from "$lib/server/auth";

function needsAuth(pathname: string): boolean {
  return pathname.startsWith("/github") && pathname !== "/github/login";
}

export const handle: Handle = async ({ event, resolve }) => {
  const token = getTokenFromCookies(event.cookies);
  event.locals.token = token;

  if (!token && needsAuth(event.url.pathname)) {
    throw redirect(302, "/github/login");
  }

  return resolve(event);
};

export const handleError: HandleServerError = ({ error }) => {
  return { message: githubErrorMessage(error) };
};
