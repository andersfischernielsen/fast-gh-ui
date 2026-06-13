import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ params }) => {
  throw redirect(
    307,
    `/github/${params.owner}/${params.repo}/issues/${params.number}/conversation`,
  );
};
