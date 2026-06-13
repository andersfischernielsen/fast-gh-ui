# fast-gh-ui

A faster UI for GitHub notifications, PRs and Issues.

![screenshot-1.png](screenshots/1.png)

![screenshot-2.png](screenshots/2.png)

---

Written using Svelte with all data being fetched from the GitHub API, focusing on performant fetching and rendering.

## Token handling

Requires a Classic GitHub token (fine-grained tokens do not support the Notifications API).

- The token is stored as a client-side `gh-token` cookie with `HttpOnly`, `SameSite=Lax`, and `Secure`.
- The token value is sent in server requests. The token only ever lives in server memory for the duration of a request.
- Logging out will clear the cookie and redirect to `/github/login`.
- Errors surfaced from GitHub are sanitized to redact any headers Octokit may include in error messages before reaching the page.

You can revoke the token at any time at <https://github.com/settings/tokens>.
