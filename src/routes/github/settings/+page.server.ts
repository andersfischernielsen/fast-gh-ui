import { redirect } from "@sveltejs/kit";
import { clearTokenCookie } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  return {};
};

export const actions: Actions = {
  logout: async ({ cookies }) => {
    clearTokenCookie(cookies);
    throw redirect(302, "/github/login");
  },
};
