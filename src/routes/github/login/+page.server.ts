import { fail, redirect } from "@sveltejs/kit";
import { Octokit } from "@octokit/rest";
import { setTokenCookie } from "$lib/server/auth";
import { getFormValue } from "$lib/server/forms";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const token = getFormValue(data, "token").trim();

    if (!token) {
      return fail(400, { error: "Enter a GitHub personal access token." });
    }

    try {
      const octokit = new Octokit({ auth: token });
      await octokit.rest.users.getAuthenticated();
    } catch {
      return fail(401, { error: "Invalid token. Check your personal access token." });
    }

    setTokenCookie(cookies, token);
    throw redirect(302, "/github");
  },
};
