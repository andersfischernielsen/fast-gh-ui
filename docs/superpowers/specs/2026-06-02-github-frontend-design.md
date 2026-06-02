# GitHub Frontend Design Spec

A fast, browser-based frontend for GitHub notifications and PR review. Token stored client-side only. All API communication through Octokit.js.

## Target User

Personal power user — single GitHub account, single user. No multi-account switching, no org management UI.

## Architecture

**SSR SvelteKit** — SvelteKit in SSR mode for fast first paint, then client-side hydration for SPA-like navigation. Token stored in `localStorage`, Octokit instantiated and called exclusively in the browser. SvelteKit load functions are NOT used for API data (token is unavailable server-side). Deployable via `adapter-auto` as static-ish output.

### Routes

| Route                            | Page              | Description                                    |
| -------------------------------- | ----------------- | ---------------------------------------------- |
| `/login`                         | TokenGate         | Enter and save GitHub personal access token    |
| `/`                              | NotificationsList | Default view — chronological notification feed |
| `/[owner]/[repo]/pulls/[number]` | PRDetail          | Full PR detail with tabs                       |
| `/settings`                      | Settings          | Token management, preferences                  |

### Component Tree

```
App
├── TokenGate — login screen, token input
└── Shell — authenticated layout
    ├── Sidebar — repo list, filters
    └── MainPanel
        ├── NotificationsList — chronological, filterable
        └── PRView
            ├── PRHeader — title, status, meta
            ├── PRTabs — Conversation | Commits | Checks | Files
            ├── Conversation — threaded comments
            ├── Commits — commit list with expand
            ├── Checks — check runs with status/conclusion
            └── FilesChanged — file tree + diff viewer
                ├── FileTree — collapsible file list with +/- counts
                ├── DiffViewer — unified/split toggle, syntax highlight
                └── InlineComment — read/write comments on diff lines
```

### State Management

Svelte 5 runes in `.svelte.ts` module files — no external state library.

- `token.svelte.ts` — token state persisted to localStorage
- `notifications.svelte.ts` — notification list + active filters
- `current-pr.svelte.ts` — active PR data, tabs, diff state

### Token Flow

1. User enters token on `/login`
2. Validated by making a lightweight Octokit call (`/user`)
3. Stored in `localStorage`, loaded into `$state` on app init
4. `+layout.svelte` checks for token — redirects to `/login` if missing
5. Octokit client created per-session from token
6. Logout clears `localStorage` + redirects to `/login`

## UI Layout

Three-panel desktop layout:

- **Left sidebar (220px):** Repository list with quick filter — shows repos the user has notifications in
- **Center panel (380px):** Chronological notification feed — each item shows repo, PR/issue title, number, timestamp, type badge
- **Right panel (flex):** Detail view — PR/issue content loaded when item is selected

### Responsive

- ≥1024px — three panels
- 768–1023px — sidebar collapses to icon strip, two-panel (list + detail)
- <768px — single panel with navigation between views

## Data Layer

### Module Structure

```
src/lib/github/
├── client.ts              — createOctokit(token) factory
├── cache/
│   ├── db.ts              — IndexedDB schema + connection
│   ├── cache-middleware.ts — Octokit plugin for cache-first reads
│   └── types.ts           — cache entry shapes
├── notifications.ts       — fetch + transform notifications
├── pulls.ts               — fetch PRs, diffs, comments, checks
├── repos.ts               — fetch repo metadata
└── types.ts               — shared response types
```

### Cache Strategy

**Cache-first, background-refresh** pattern implemented as an Octokit plugin:

1. Check IndexedDB for cached response matching the request URL
2. If found and fresh — return cached data immediately
3. If found but stale — return cached data, then trigger background refresh
4. If not found — fetch from API, cache result, return
5. On refresh — send conditional request with ETag, update cache on 200, extend TTL on 304

### IndexedDB Stores

| Store         | Data                    | TTL  |
| ------------- | ----------------------- | ---- |
| notifications | Notification threads    | 30s  |
| pulls         | PR metadata             | 60s  |
| diffs         | Patch/diff content      | 5min |
| comments      | PR review comments      | 60s  |
| checks        | Check run statuses      | 30s  |
| cache-meta    | ETags, timestamps, TTLs | —    |

On mutation (posting a comment, submitting a review), immediately re-fetch the affected resource.

## Notification Feed

- Flat chronological list (newest first), matching GitHub notifications API
- Each item shows: repo name, PR/issue title with number, reason for notification (comment, review, mention, etc.), timestamp, read/unread indicator
- Click-to-mark-read via Octokit API
- Filters: unread only, by repository, by type (PR vs issue)
- Pull-to-refresh or header refresh button

## PR Detail View

Four tabs rendered client-side:

### Conversation

- PR description at top (markdown → HTML rendered client-side)
- Threaded comments below with author, avatar, timestamp, markdown body
- Comment reply input at bottom — posts via Octokit `issues.createComment`
- Live updates via polling or manual refresh

### Commits

- Flat commit list: author, message (first line), SHA (abbreviated), timestamp
- Click to expand commit diff in the diff viewer
- Pagination for PRs with 30+ commits

### Checks

- List of check suites/runs from GitHub Checks API
- Each check shows: name, status (queued/in_progress/completed), conclusion (success/failure/neutral/skipped/cancelled)
- Color-coded badges
- Expand to show logs/details

### Files Changed

- File tree sidebar: collapsible, shows +/- line counts per file
- Click file to show diff in main area
- Diff viewer:
  - Unified diff (default) and split diff — toggleable
  - Syntax-highlighted code
  - Line numbers on both sides
  - Green/red background for added/removed lines
  - Hover + icon on each line for inline commenting
- Inline comments:
  - Existing comments shown below their diff line with thread
  - Click + icon to open inline textarea
  - POST via Octokit `pulls.createReviewComment`
  - Comments attached to diff position (file path, line number, side), not absolute line
  - Support for pending review drafts submitted as batch

## Performance Targets

- Time-to-interactive < 1s (SSR first paint)
- Notification list: cached render < 50ms, network refresh < 500ms
- Diff render: < 100ms for files under 500 lines, < 500ms for large files
- Cache hit rate target: > 80% for repeated views

## Non-Goals (Phase 1)

- No issue creation/management (read notifications only)
- No release notifications
- No GitHub Actions management beyond viewing check status
- No multi-account switching
- No search
- No offline mode (cache aids performance, not offline capability)

## Implementation Sequence

1. Project scaffold + token gate + routing skeleton
2. Octokit client + IndexedDB cache layer
3. Notification list + sidebar
4. PR detail: conversation tab
5. PR detail: files changed + diff viewer + inline comments
6. PR detail: commits + checks tabs
7. Polish: responsive layout, loading states, error handling, token validation
