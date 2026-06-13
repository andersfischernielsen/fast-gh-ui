import { fail, redirect } from "@sveltejs/kit";
import { getFormValue } from "$lib/server/forms";
import { createReview, mergePullRequest } from "$lib/server/github/pulls";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  throw redirect(307, `/github/${params.owner}/${params.repo}/pull/${params.number}/conversation`);
};

export const actions: Actions = {
  createReview: async ({ request, locals, params }) => {
    const token = locals.token!;
    const data = await request.formData();
    const event = getFormValue(data, "event") as "APPROVE" | "REQUEST_CHANGES";
    const body = getFormValue(data, "body");
    if (!event) return fail(400, { error: "Invalid input" });
    await createReview(
      token,
      params.owner,
      params.repo,
      Number(params.number),
      event,
      body || undefined,
    );
    return {};
  },
  merge: async ({ locals, params }) => {
    const token = locals.token!;
    await mergePullRequest(token, params.owner, params.repo, Number(params.number));
    return {};
  },
};
