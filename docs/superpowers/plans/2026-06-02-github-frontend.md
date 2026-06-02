# GitHub Fast Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast GitHub frontend with notifications inbox, PR reading (description, comments, diffs, checks, inline comments). Token stored client-side. All API via Octokit.js.

**Architecture:** SSR SvelteKit with client-side data fetching. IndexedDB cache-first layer wraps Octokit. Three-panel UI (sidebar / notification list / PR detail). Svelte 5 runes for state. No external state library.

**Tech Stack:** SvelteKit 2.x, Svelte 5 (runes mode), TypeScript, Octokit.js, vite-plus (vp), Vitest

**Source tree:** Only the src/ directory; no `.svelte-kit/` files

---

### Task 1: Project Foundation — Install Dependencies & Set Up Structure

**Files:**

- Modify: `package.json`
- Create: `src/lib/stores/token.svelte.ts`
- Create: `src/routes/login/+page.svelte`
- Modify: `src/routes/+layout.svelte`
- Modify: `src/app.d.ts`

- [ ] **Step 1: Install Octokit**

```bash
npm install @octokit/rest @octokit/types
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p src/lib/stores src/lib/github/cache src/lib/components src/routes/login src/routes/settings src/routes/\[owner\]/\[repo\]/pulls/\[number\]
```

- [ ] **Step 3: Create token store in `src/lib/stores/token.svelte.ts`**

```typescript
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
```

- [ ] **Step 4: Create login page `src/routes/login/+page.svelte`**

```svelte
<script lang="ts">
  import { setToken } from '$lib/stores/token.svelte';
  import { goto } from '$app/navigation';
  import { Octokit } from '@octokit/rest';

  let input = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      error = 'Enter a GitHub token';
      return;
    }
    loading = true;
    error = '';
    try {
      const octokit = new Octokit({ auth: trimmed });
      await octokit.rest.users.getAuthenticated();
      setToken(trimmed);
      goto('/');
    } catch {
      error = 'Invalid token. Check your personal access token.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login — GitHub Frontend</title>
</svelte:head>

<main class="page">
  <h1>GitHub Frontend</h1>
  <p>Enter a GitHub personal access token to get started.</p>
  <form onsubmit={handleSubmit}>
    <label for="token">Personal Access Token</label>
    <input id="token" type="password" bind:value={input} placeholder="ghp_..." disabled={loading} />
    {#if error}
      <p class="error-message">{error}</p>
    {/if}
    <button type="submit" disabled={loading}>
      {loading ? 'Verifying...' : 'Sign In'}
    </button>
  </form>
</main>

<style>
  .page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    max-width: 420px;
    margin: 0 auto;
    padding: 2rem;
  }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  form { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
  label { font-size: 0.875rem; font-weight: 500; }
  input {
    padding: 0.625rem 0.75rem;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 0.875rem;
  }
  button {
    padding: 0.625rem 1rem;
    background: #1f883d;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  .error-message {
    color: #cf222e;
    font-size: 0.8125rem;
    margin: 0;
  }
</style>
```

- [ ] **Step 5: Modify `src/routes/+layout.svelte` to add token guard**

```svelte
<script lang="ts">
  import { isValid } from '$lib/stores/token.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();

  $effect(() => {
    if ($page.url.pathname !== '/login' && !isValid()) {
      goto('/login');
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
```

- [ ] **Step 6: Add global reset styles. Create `src/app.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2328;
  background: #ffffff;
}
```

- [ ] **Step 7: Import `src/app.css` in `src/routes/+layout.svelte`**

Add this import at the top of the script block in `src/routes/+layout.svelte`:

```typescript
import "../app.css";
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Visit `http://localhost:5173` — should redirect to `/login`. Enter any token — should show error. The page should render.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add token store and login page"
```

---

### Task 2: Octokit Client + API Types

**Files:**

- Create: `src/lib/github/types.ts`
- Create: `src/lib/github/client.ts`
- Create: `src/lib/github/notifications.ts`
- Create: `src/lib/github/pulls.ts`
- Create: `src/lib/github/repos.ts`

- [ ] **Step 1: Create API types in `src/lib/github/types.ts`**

```typescript
export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: string;
  updatedAt: string;
  lastReadAt: string | null;
  subject: {
    title: string;
    url: string;
    type: string;
    latestCommentUrl: string | null;
  };
  repository: {
    id: number;
    name: string;
    fullName: string;
    owner: string;
    htmlUrl: string;
  };
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  body: string | null;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  user: { login: string; avatarUrl: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  merged: boolean;
  draft: boolean;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface PRComment {
  id: number;
  body: string;
  user: { login: string; avatarUrl: string };
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface PRCommit {
  sha: string;
  author: { login: string; avatarUrl: string };
  message: string;
  date: string;
}

export interface CheckRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
  steps: Array<{ name: string; status: string; conclusion: string | null }>;
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface InlineComment {
  id: number;
  body: string;
  user: { login: string; avatarUrl: string };
  createdAt: string;
  path: string;
  position: number | null;
  originalPosition: number;
  line: number | null;
  originalLine: number | null;
  inReplyToId: number | null;
  replyTo: InlineComment[];
}
```

- [ ] **Step 2: Create Octokit client factory in `src/lib/github/client.ts`**

```typescript
import { Octokit } from "@octokit/rest";
import { getToken } from "$lib/stores/token.svelte";

let _client: Octokit | null = null;

function createClient(): Octokit {
  if (_client) return _client;
  const token = getToken();
  if (!token) throw new Error("No token available");
  _client = new Octokit({ auth: token });
  return _client;
}

function resetClient(): void {
  _client = null;
}

export { createClient, resetClient };
```

- [ ] **Step 3: Create notifications fetcher in `src/lib/github/notifications.ts`**

```typescript
import { createClient } from "./client";

interface FetchParams {
  all?: boolean;
  participating?: boolean;
  since?: string;
  before?: string;
  perPage?: number;
  page?: number;
}

async function fetchNotifications(params: FetchParams = {}): Promise<
  Array<{
    id: string;
    unread: boolean;
    reason: string;
    updated_at: string;
    last_read_at: string | null;
    subject: { title: string; url: string; type: string; latest_comment_url: string | null };
    repository: {
      id: number;
      name: string;
      full_name: string;
      owner: { login: string };
      html_url: string;
    };
  }>
> {
  const octokit = createClient();
  const response = await octokit.rest.activity.listNotificationsForAuthenticatedUser({
    all: params.all ?? false,
    participating: params.participating ?? false,
    since: params.since,
    before: params.before,
    per_page: params.perPage ?? 50,
    page: params.page ?? 1,
  });
  return response.data;
}

async function markThreadAsRead(threadId: number): Promise<void> {
  const octokit = createClient();
  await octokit.rest.activity.markThreadAsRead({ thread_id: threadId });
}

export { fetchNotifications, markThreadAsRead };
```

- [ ] **Step 4: Create PR fetcher in `src/lib/github/pulls.ts`**

```typescript
import { createClient } from "./client";

async function fetchPullRequest(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  return response.data;
}

async function listPRComments(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });
  return response.data;
}

async function createPRComment(owner: string, repo: string, pullNumber: number, body: string) {
  const octokit = createClient();
  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
  return response.data;
}

async function listPRCommits(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response.data;
}

async function listPRFiles(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response.data;
}

async function listInlineComments(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return response.data;
}

async function createInlineComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
  commitId: string,
  path: string,
  line: number,
) {
  const octokit = createClient();
  const response = await octokit.rest.pulls.createReviewComment({
    owner,
    repo,
    pull_number: pullNumber,
    body,
    commit_id: commitId,
    path,
    line,
  });
  return response.data;
}

async function listChecks(owner: string, repo: string, ref: string) {
  const octokit = createClient();
  const response = await octokit.rest.checks.listForRef({
    owner,
    repo,
    ref,
    per_page: 100,
  });
  return response.data;
}

export {
  fetchPullRequest,
  listPRComments,
  createPRComment,
  listPRCommits,
  listPRFiles,
  listInlineComments,
  createInlineComment,
  listChecks,
};
```

- [ ] **Step 5: Create repos fetcher in `src/lib/github/repos.ts`**

```typescript
import { createClient } from "./client";

async function fetchRepo(owner: string, repo: string) {
  const octokit = createClient();
  const response = await octokit.rest.repos.get({ owner, repo });
  return response.data;
}

export { fetchRepo };
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add Octokit client and API fetchers"
```

---

### Task 3: IndexedDB Cache Layer

**Files:**

- Create: `src/lib/github/cache/types.ts`
- Create: `src/lib/github/cache/db.ts`
- Create: `src/lib/github/cache/middleware.ts`

- [ ] **Step 1: Create cache types in `src/lib/github/cache/types.ts`**

```typescript
interface CacheEntry {
  url: string;
  data: unknown;
  etag: string | null;
  timestamp: number;
}

interface CacheStore {
  get(url: string): Promise<CacheEntry | undefined>;
  set(url: string, entry: CacheEntry): Promise<void>;
  delete(url: string): Promise<void>;
  clear(): Promise<void>;
}

export type { CacheEntry, CacheStore };
```

- [ ] **Step 2: Create IndexedDB connection in `src/lib/github/cache/db.ts`**

```typescript
import { type CacheStore, type CacheEntry } from "./types";

const DB_NAME = "github-frontend-cache";
const DB_VERSION = 1;
const STORE_NAME = "cache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getEntry(url: string): Promise<CacheEntry | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(url);
    req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function setEntry(url: string, entry: CacheEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteEntry(url: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(url);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const cacheStore: CacheStore = {
  get: getEntry,
  set: setEntry,
  delete: deleteEntry,
  clear: clearAll,
};

export { cacheStore, openDB };
```

- [ ] **Step 3: Create cache middleware in `src/lib/github/cache/middleware.ts`**

```typescript
import { cacheStore } from "./db";

const TTL_MAP: Record<string, number> = {
  notifications: 30_000,
  pulls: 60_000,
  diffs: 300_000,
  comments: 60_000,
  checks: 30_000,
  default: 60_000,
};

function getTTL(url: string): number {
  if (url.includes("/notifications")) return TTL_MAP.notifications;
  if (url.includes("/pulls") && url.includes("/files")) return TTL_MAP.diffs;
  if (url.includes("/comments")) return TTL_MAP.comments;
  if (url.includes("/pulls") || url.includes("/issues")) return TTL_MAP.pulls;
  if (url.includes("/check-runs")) return TTL_MAP.checks;
  return TTL_MAP.default;
}

function isExpired(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp > ttl;
}

async function getCached(url: string, fetchFn: () => Promise<Response>): Promise<Response> {
  const cached = await cacheStore.get(url);
  const ttl = getTTL(url);

  if (cached) {
    if (!isExpired(cached.timestamp, ttl)) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }
    const response = await fetchFn();
    const cloned = response.clone();
    const data = await cloned.json();
    await cacheStore.set(url, {
      url,
      data,
      etag: response.headers.get("etag") || null,
      timestamp: Date.now(),
    });
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Cache": "STALE" },
    });
  }

  const response = await fetchFn();
  const cloned = response.clone();
  const data = await cloned.json();
  await cacheStore.set(url, {
    url,
    data,
    etag: response.headers.get("etag") || null,
    timestamp: Date.now(),
  });
  response.headers.set("X-Cache", "MISS");
  return response;
}

export { getCached };
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add IndexedDB cache layer"
```

---

### Task 4: Notification Store & API Integration

**Files:**

- Create: `src/lib/stores/notifications.svelte.ts`

- [ ] **Step 1: Create notification store in `src/lib/stores/notifications.svelte.ts`**

```typescript
import { fetchNotifications, markThreadAsRead } from "$lib/github/notifications";
import type { NotificationItem } from "$lib/github/types";

const notifications = $state<NotificationItem[]>([]);
const loading = $state(false);
const error = $state<string | null>(null);

function mapNotification(raw: {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: { title: string; url: string; type: string; latest_comment_url: string | null };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    html_url: string;
  };
}): NotificationItem {
  return {
    id: raw.id,
    unread: raw.unread,
    reason: raw.reason,
    updatedAt: raw.updated_at,
    lastReadAt: raw.last_read_at,
    subject: {
      title: raw.subject.title,
      url: raw.subject.url,
      type: raw.subject.type,
      latestCommentUrl: raw.subject.latest_comment_url,
    },
    repository: {
      id: raw.repository.id,
      name: raw.repository.name,
      fullName: raw.repository.full_name,
      owner: raw.repository.owner.login,
      htmlUrl: raw.repository.html_url,
    },
  };
}

async function loadNotifications(): Promise<void> {
  loading = true;
  error = null;
  try {
    const raw = await fetchNotifications({ all: true, perPage: 50 });
    notifications = raw.map(mapNotification);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load notifications";
  } finally {
    loading = false;
  }
}

async function markAsRead(threadId: string): Promise<void> {
  try {
    await markThreadAsRead(Number(threadId));
    notifications = notifications.map((n) => (n.id === threadId ? { ...n, unread: false } : n));
  } catch (e) {
    console.error("Failed to mark as read:", e);
  }
}

export { notifications, loading, error, loadNotifications, markAsRead };
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add notification store"
```

---

### Task 5: Basic Notification List & Shell Layout

**Files:**

- Create: `src/lib/components/NotificationItem.svelte`
- Modify: `src/routes/+page.svelte`
- Create: `src/lib/components/Sidebar.svelte`

- [ ] **Step 1: Create NotificationItem component in `src/lib/components/NotificationItem.svelte`**

```svelte
<script lang="ts">
  import type { NotificationItem } from '$lib/github/types';
  import { markAsRead } from '$lib/stores/notifications.svelte';

  let { item, selected = false, onclick }: {
    item: NotificationItem;
    selected?: boolean;
    onclick: () => void;
  } = $props();

  function getTypeBadge(type: string): string {
    switch (type) {
      case 'PullRequest': return 'PR';
      case 'Issue': return 'Issue';
      case 'Discussion': return 'Discuss';
      case 'Release': return 'Release';
      default: return type.slice(0, 8);
    }
  }

  function parsePRNumber(url: string): string {
    const match = url.match(/\/(\d+)$/);
    return match ? `#${match[1]}` : '';
  }

  function formatTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  async function handleClick() {
    if (item.unread) await markAsRead(item.id);
    onclick();
  }

  let prNumber = $derived(parsePRNumber(item.subject.url));
</script>

<button class="item" class:selected class:unread={item.unread} onclick={handleClick}>
  <span class="repo">{item.repository.fullName}</span>
  <span class="title">
    <span class="number">{prNumber}</span>
    {item.subject.title}
  </span>
  <span class="meta">
    <span class="badge">{getTypeBadge(item.subject.type)}</span>
    <span class="time">{formatTime(item.updatedAt)}</span>
  </span>
</button>

<style>
  .item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 16px;
    border: none;
    border-bottom: 1px solid #f0f0f0;
    background: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }
  .item:hover { background: #f6f8fa; }
  .item.selected { background: #e8f0fe; }
  .item.unread { font-weight: 600; }
  .item.unread::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1a7f37;
  }
  .repo { font-size: 12px; color: #656d76; }
  .title { font-size: 14px; line-height: 1.4; }
  .number { color: #656d76; font-weight: 400; }
  .meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 2px;
  }
  .badge {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    background: #ddf4ff;
    color: #0969da;
  }
  .time { font-size: 12px; color: #656d76; }
</style>
```

- [ ] **Step 2: Create Sidebar component in `src/lib/components/Sidebar.svelte`**

```svelte
<script lang="ts">
  import { notifications } from '$lib/stores/notifications.svelte';
  import { clearToken } from '$lib/stores/token.svelte';
  import { goto } from '$app/navigation';

  let repos = $derived([...new Set(notifications.map(n => n.repository.fullName))].sort());
  let selectedRepo = $state<string | null>(null);

  function logout() {
    clearToken();
    goto('/login');
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">Repositories</div>
  <input class="filter" type="text" placeholder="Filter repos..." />
  <nav class="repo-list">
    {#each repos as repo}
      <button
        class="repo-item"
        class:active={selectedRepo === repo}
        onclick={() => selectedRepo = selectedRepo === repo ? null : repo}
      >
        {repo}
      </button>
    {/each}
  </nav>
  <div class="sidebar-footer">
    <button class="settings-btn" onclick={() => goto('/settings')}>Settings</button>
    <button class="logout-btn" onclick={logout}>Logout</button>
  </div>
</aside>

<style>
  .sidebar {
    width: 240px;
    min-width: 240px;
    background: #f6f8fa;
    border-right: 1px solid #d0d7de;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .sidebar-header {
    padding: 12px 16px;
    font-weight: 600;
    font-size: 13px;
    color: #656d76;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .filter {
    margin: 0 12px 8px;
    padding: 5px 10px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 12px;
  }
  .repo-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 8px;
  }
  .repo-item {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: none;
    background: none;
    text-align: left;
    font-size: 13px;
    cursor: pointer;
    border-radius: 6px;
    font-family: inherit;
  }
  .repo-item:hover { background: #eaeef2; }
  .repo-item.active { background: #d0d7de; }
  .sidebar-footer {
    border-top: 1px solid #d0d7de;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sidebar-footer button {
    padding: 6px 8px;
    border: none;
    background: none;
    font-size: 12px;
    cursor: pointer;
    text-align: left;
    border-radius: 6px;
    font-family: inherit;
  }
  .sidebar-footer button:hover { background: #eaeef2; }
  .logout-btn { color: #cf222e; }
</style>
```

- [ ] **Step 3: Modify `src/routes/+page.svelte` to show notification list with sidebar**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { notifications, loading, error, loadNotifications } from '$lib/stores/notifications.svelte';
  import NotificationItem from '$lib/components/NotificationItem.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import type { NotificationItem } from '$lib/github/types';
  import { goto } from '$app/navigation';

  let selectedId = $state<string | null>(null);

  onMount(() => {
    loadNotifications();
  });

  function select(item: NotificationItem) {
    selectedId = item.id;
    const match = item.subject.url.match(/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)/);
    if (match) {
      goto(`/${match[1]}/${match[2]}/pull/${match[3]}`);
    }
  }
</script>

<div class="app-shell">
  <Sidebar />
  <div class="list-panel">
    <div class="list-header">
      <h2>Notifications</h2>
      <button onclick={() => loadNotifications()} disabled={loading}>Refresh</button>
    </div>
    {#if loading}
      <p class="status">Loading...</p>
    {:else if error}
      <p class="status error">{error}</p>
    {:else if notifications.length === 0}
      <p class="status">No notifications</p>
    {:else}
      <div class="list">
        {#each notifications as item (item.id)}
          <NotificationItem {item} selected={selectedId === item.id} onclick={() => select(item)} />
        {/each}
      </div>
    {/if}
  </div>
  <div class="detail-panel">
    <p class="placeholder">Select a notification to view details</p>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  .list-panel {
    width: 380px;
    min-width: 300px;
    border-right: 1px solid #d0d7de;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #d0d7de;
  }
  .list-header h2 { font-size: 16px; }
  .list-header button {
    padding: 4px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    font-size: 12px;
    cursor: pointer;
  }
  .list {
    flex: 1;
    overflow-y: auto;
  }
  .status { padding: 16px; color: #656d76; font-size: 14px; }
  .status.error { color: #cf222e; }
  .detail-panel {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .placeholder { color: #656d76; font-size: 14px; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add notification list and sidebar shell"
```

---

### Task 6: PR Detail Page — Header & Tabs

**Files:**

- Create: `src/lib/stores/pr.svelte.ts`
- Create: `src/lib/components/PRHeader.svelte`
- Create: `src/lib/components/PRTabs.svelte`
- Create: `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`

- [ ] **Step 1: Create PR store in `src/lib/stores/pr.svelte.ts`**

```typescript
import { fetchPullRequest } from "$lib/github/pulls";
import type { PullRequest } from "$lib/github/types";

const pr = $state<PullRequest | null>(null);
const loading = $state(false);
const error = $state<string | null>(null);
const activeTab = $state<"conversation" | "commits" | "checks" | "files">("conversation");

async function loadPR(owner: string, repo: string, number: number): Promise<void> {
  loading = true;
  error = null;
  try {
    const raw = await fetchPullRequest(owner, repo, number);
    pr = {
      number: raw.number,
      title: raw.title,
      state: raw.state,
      body: raw.body,
      htmlUrl: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      user: { login: raw.user?.login ?? "", avatarUrl: raw.user?.avatar_url ?? "" },
      head: { ref: raw.head.ref, sha: raw.head.sha },
      base: { ref: raw.base.ref, sha: raw.base.sha },
      merged: raw.merged ?? false,
      draft: raw.draft ?? false,
      additions: raw.additions ?? 0,
      deletions: raw.deletions ?? 0,
      changedFiles: raw.changed_files ?? 0,
    };
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load PR";
  } finally {
    loading = false;
  }
}

export { pr, loading, error, activeTab, loadPR };
```

- [ ] **Step 2: Create PR Header component in `src/lib/components/PRHeader.svelte`**

```svelte
<script lang="ts">
  import type { PullRequest } from '$lib/github/types';

  let { pr }: { pr: PullRequest } = $props();

  function stateColor(state: string): string {
    if (state === 'open') return '#1a7f37';
    if (state === 'merged') return '#8250df';
    return '#cf222e';
  }

  function stateBg(state: string): string {
    if (state === 'open') return '#dafbe1';
    if (state === 'merged') return '#fbefff';
    return '#ffebe9';
  }
</script>

<header class="header">
  <div class="title-row">
    <h1>
      <span class="number">#{pr.number}</span>
      {pr.title}
    </h1>
  </div>
  <div class="meta-row">
    <span
      class="state"
      style="background:{stateBg(pr.state)};color:{stateColor(pr.state)}"
    >{pr.state}</span>
    <span>{pr.user.login}</span>
    <span>{pr.head.ref} → {pr.base.ref}</span>
    <span class="stats">+{pr.additions} −{pr.deletions} ({pr.changedFiles} files)</span>
  </div>
</header>

<style>
  .header {
    padding: 16px 24px;
    border-bottom: 1px solid #d0d7de;
  }
  .title-row h1 {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }
  .number { color: #656d76; font-weight: 400; }
  .meta-row {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 8px;
    font-size: 13px;
    color: #656d76;
  }
  .state {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .stats { font-family: monospace; }
</style>
```

- [ ] **Step 3: Create Tab component in `src/lib/components/PRTabs.svelte`**

```svelte
<script lang="ts">
  import { activeTab } from '$lib/stores/pr.svelte';

  let { commitsCount = 0, filesCount = 0 }: { commitsCount?: number; filesCount?: number } = $props();
</script>

<nav class="tabs">
  <button
    class="tab"
    class:active={activeTab === 'conversation'}
    onclick={() => activeTab = 'conversation'}
  >Conversation</button>
  <button
    class="tab"
    class:active={activeTab === 'commits'}
    onclick={() => activeTab = 'commits'}
  >Commits ({commitsCount})</button>
  <button
    class="tab"
    class:active={activeTab === 'checks'}
    onclick={() => activeTab = 'checks'}
  >Checks</button>
  <button
    class="tab"
    class:active={activeTab === 'files'}
    onclick={() => activeTab = 'files'}
  >Files changed ({filesCount})</button>
</nav>

<style>
  .tabs {
    display: flex;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
    padding: 0 16px;
  }
  .tab {
    padding: 10px 16px;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    font-size: 14px;
    cursor: pointer;
    color: #656d76;
    font-family: inherit;
  }
  .tab:hover { color: #1f2328; }
  .tab.active {
    color: #1f2328;
    border-bottom-color: #fd8c73;
    font-weight: 500;
  }
</style>
```

- [ ] **Step 4: Create PR detail page in `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`**

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { pr, loading, error, loadPR, activeTab } from '$lib/stores/pr.svelte';
  import PRHeader from '$lib/components/PRHeader.svelte';
  import PRTabs from '$lib/components/PRTabs.svelte';

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(() => {
    loadPR(owner, repo, number);
  });
</script>

<div class="page">
  {#if loading}
    <p class="status">Loading PR...</p>
  {:else if error}
    <p class="status error">{error}</p>
  {:else if pr}
    <PRHeader {pr} />
    <PRTabs
      commitsCount={(pr as unknown as { commitsCount?: number }).commitsCount ?? 0}
      filesCount={pr.changedFiles}
    />
    <div class="tab-content">
      {#if activeTab === 'conversation'}
        <p>TODO: Conversation tab</p>
      {:else if activeTab === 'commits'}
        <p>TODO: Commits tab</p>
      {:else if activeTab === 'checks'}
        <p>TODO: Checks tab</p>
      {:else if activeTab === 'files'}
        <p>TODO: Files changed tab</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  .tab-content { flex: 1; overflow-y: auto; padding: 16px 24px; }
  .status { padding: 24px; color: #656d76; }
  .status.error { color: #cf222e; }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add PR detail page with header and tabs"
```

---

### Task 7: Conversation Tab — Comments & Markdown

**Files:**

- Create: `src/lib/components/Conversation.svelte`
- Create: `src/lib/components/Comment.svelte`
- Create: `src/lib/components/CommentInput.svelte`
- Create: `src/lib/components/Markdown.svelte`
- Modify: `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`

- [ ] **Step 1: Create Markdown renderer in `src/lib/components/Markdown.svelte`**

```svelte
<script lang="ts">
  let { text = '' }: { text?: string | null } = $props();

  let html = $derived(
    text
      ? text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/__([^_]+)__/g, '<strong>$1</strong>')
          .replace(/_([^_]+)_/g, '<em>$1</em>')
          .replace(/~~([^~]+)~~/g, '<del>$1</del>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/^- (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>.*<\/li>\n?)+/g, (m: string) => `<ul>${m}</ul>`)
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(.+)$/gm, (m: string) => m.startsWith('<') ? m : `<p>${m}</p>`)
          .replace(/<\/p><p>/g, '</p>\n<p>')
      : ''
  );
</script>

<div class="markdown">{@html html}</div>

<style>
  .markdown :global(p) { margin-bottom: 0.75rem; }
  .markdown :global(h2),
  .markdown :global(h3) { margin: 1rem 0 0.5rem; font-weight: 600; }
  .markdown :global(code) {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
  .markdown :global(ul) { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  .markdown :global(del) { opacity: 0.6; }
</style>
```

- [ ] **Step 2: Create Comment component in `src/lib/components/Comment.svelte`**

```svelte
<script lang="ts">
  import Markdown from './Markdown.svelte';

  interface CommentData {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    htmlUrl: string;
  }

  let { comment }: { comment: CommentData } = $props();

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
</script>

<article class="comment">
  <div class="comment-header">
    <img class="avatar" src={comment.user.avatarUrl} alt="" width="32" height="32" />
    <strong>{comment.user.login}</strong>
    <a class="date" href={comment.htmlUrl} target="_blank" rel="noopener">{formatDate(comment.createdAt)}</a>
  </div>
  <div class="comment-body">
    <Markdown text={comment.body} />
  </div>
</article>

<style>
  .comment {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .comment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-size: 14px;
  }
  .avatar { border-radius: 50%; }
  .date { font-weight: 400; color: #656d76; font-size: 12px; }
  .comment-body { padding: 12px 16px; font-size: 14px; }
</style>
```

- [ ] **Step 3: Create CommentInput component in `src/lib/components/CommentInput.svelte`**

```svelte
<script lang="ts">
  let { onsubmit }: { onsubmit: (body: string) => Promise<void> } = $props();

  let body = $state('');
  let submitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    submitting = true;
    try {
      await onsubmit(body);
      body = '';
    } finally {
      submitting = false;
    }
  }
</script>

<form class="input" onsubmit={handleSubmit}>
  <textarea bind:value={body} placeholder="Write a comment..." rows={3} disabled={submitting}></textarea>
  <button type="submit" disabled={submitting || !body.trim()}>Comment</button>
</form>

<style>
  .input {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
  textarea {
    padding: 10px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
  }
  button {
    align-self: flex-end;
    padding: 6px 16px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #1f883d;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 4: Create Conversation component in `src/lib/components/Conversation.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import Markdown from './Markdown.svelte';
  import Comment from './Comment.svelte';
  import CommentInput from './CommentInput.svelte';
  import { listPRComments, createPRComment } from '$lib/github/pulls';
  import type { PRComment } from '$lib/github/types';

  let { body }: { body: string | null } = $props();

  let comments = $state<PRComment[]>([]);
  let loading = $state(true);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(async () => {
    try {
      const raw = await listPRComments(owner, repo, number);
      comments = raw.map(c => ({
        id: c.id,
        body: c.body ?? '',
        user: { login: c.user?.login ?? '', avatarUrl: c.user?.avatar_url ?? '' },
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        htmlUrl: c.html_url,
      }));
    } finally {
      loading = false;
    }
  });

  async function postComment(body: string) {
    const raw = await createPRComment(owner, repo, number, body);
    comments = [...comments, {
      id: raw.id,
      body: raw.body ?? '',
      user: { login: raw.user?.login ?? '', avatarUrl: raw.user?.avatar_url ?? '' },
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      htmlUrl: raw.html_url,
    }];
  }
</script>

<div class="conversation">
  {#if body}
    <div class="description">
      <h3>Description</h3>
      <Markdown text={body} />
    </div>
  {/if}
  {#if loading}
    <p class="status">Loading comments...</p>
  {:else}
    <div class="comments">
      {#each comments as c (c.id)}
        <Comment comment={c} />
      {/each}
      {#if comments.length === 0}
        <p class="status">No comments yet</p>
      {/if}
    </div>
  {/if}
  <CommentInput onsubmit={postComment} />
</div>

<style>
  .conversation { max-width: 900px; }
  .description {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 12px 16px;
    margin-bottom: 16px;
  }
  .description h3 { font-size: 14px; color: #656d76; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .comments { margin-bottom: 16px; }
  .status { padding: 16px 0; color: #656d76; font-size: 14px; }
</style>
```

- [ ] **Step 5: Update PR detail page to include Conversation tab in `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`**

Replace the `<p>TODO: Conversation tab</p>` placeholder in the file with:

```svelte
<Conversation body={pr.body} />
```

Add the import at the top:

```typescript
import Conversation from "$lib/components/Conversation.svelte";
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add conversation tab with comments and markdown"
```

---

### Task 8: Files Changed Tab — File Tree

**Files:**

- Create: `src/lib/components/FileTree.svelte`
- Create: `src/lib/components/FilesChanged.svelte`
- Modify: `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`

- [ ] **Step 1: Create FileTree component in `src/lib/components/FileTree.svelte`**

```svelte
<script lang="ts">
  import type { PRFile } from '$lib/github/types';

  let { files, selectedFile, onselect }:
    { files: PRFile[]; selectedFile: string | null; onselect: (filename: string) => void } = $props();

  function fileIcon(status: string): string {
    if (status === 'added') return '+';
    if (status === 'removed') return '−';
    return '•';
  }
</script>

<aside class="file-tree">
  <div class="tree-header">
    <span>{files.length} files</span>
  </div>
  <div class="tree-list">
    {#each files as file (file.filename)}
      <button
        class="file-item"
        class:selected={selectedFile === file.filename}
        onclick={() => onselect(file.filename)}
      >
        <span class="icon" class:added={file.status === 'added'} class:removed={file.status === 'removed'}>{fileIcon(file.status)}</span>
        <span class="name">{file.filename}</span>
        <span class="counts">
          <span class="add">+{file.additions}</span>
          <span class="del">−{file.deletions}</span>
        </span>
      </button>
    {/each}
  </div>
</aside>

<style>
  .file-tree {
    width: 240px;
    min-width: 200px;
    border-right: 1px solid #d0d7de;
    overflow-y: auto;
    background: #f6f8fa;
  }
  .tree-header {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #656d76;
    border-bottom: 1px solid #d0d7de;
  }
  .tree-list { padding: 4px 0; }
  .file-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 12px;
    border: none;
    background: none;
    text-align: left;
    font-size: 12px;
    font-family: monospace;
    cursor: pointer;
  }
  .file-item:hover { background: #eaeef2; }
  .file-item.selected { background: #ddf4ff; }
  .icon { width: 14px; text-align: center; }
  .icon.added { color: #1a7f37; }
  .icon.removed { color: #cf222e; }
  .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .counts { display: flex; gap: 6px; font-size: 11px; }
  .add { color: #1a7f37; }
  .del { color: #cf222e; }
</style>
```

- [ ] **Step 2: Create FilesChanged component in `src/lib/components/FilesChanged.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import FileTree from './FileTree.svelte';
  import { listPRFiles } from '$lib/github/pulls';
  import type { PRFile } from '$lib/github/types';

  let files = $state<PRFile[]>([]);
  let loading = $state(true);
  let selectedFile = $state<string | null>(null);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(async () => {
    try {
      const raw = await listPRFiles(owner, repo, number);
      files = raw.map(f => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch,
      }));
      if (files.length > 0) selectedFile = files[0].filename;
    } finally {
      loading = false;
    }
  });

  let currentFile = $derived(files.find(f => f.filename === selectedFile) ?? null);
</script>

{#if loading}
  <p class="status">Loading files...</p>
{:else}
  <div class="files-changed">
    <FileTree {files} {selectedFile} onselect={(f) => selectedFile = f} />
    <div class="diff-panel">
      {#if currentFile}
        <div class="diff-header">
          <span>{currentFile.filename}</span>
          <span class="diff-stats">+{currentFile.additions} −{currentFile.deletions}</span>
        </div>
        <div class="diff-body">
          <p class="status">TODO: Diff viewer</p>
        </div>
      {:else}
        <p class="status">Select a file</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .status { padding: 24px; color: #656d76; font-size: 14px; }
  .files-changed { display: flex; height: 100%; overflow: hidden; }
  .diff-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .diff-header {
    padding: 10px 16px;
    border-bottom: 1px solid #d0d7de;
    font-size: 13px;
    font-family: monospace;
    display: flex;
    justify-content: space-between;
  }
  .diff-stats { font-size: 12px; }
  .diff-stats .add { color: #1a7f37; }
  .diff-stats .del { color: #cf222e; }
  .diff-body { flex: 1; overflow-y: auto; }
</style>
```

- [ ] **Step 3: Update PR detail page to include FilesChanged tab in `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`**

Replace the `<p>TODO: Files changed tab</p>` placeholder with:

```svelte
<FilesChanged />
```

Add the import:

```typescript
import FilesChanged from "$lib/components/FilesChanged.svelte";
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add files changed tab with file tree"
```

---

### Task 9: Diff Viewer — Unified & Split

**Files:**

- Create: `src/lib/components/DiffViewer.svelte`
- Modify: `src/lib/components/FilesChanged.svelte`

- [ ] **Step 1: Create DiffViewer component in `src/lib/components/DiffViewer.svelte`**

```svelte
<script lang="ts">
  let { patch }: { patch: string } = $props();
  let viewMode = $state<'unified' | 'split'>('unified');

  interface DiffLine {
    type: 'add' | 'remove' | 'context' | 'header';
    oldLine: number | null;
    newLine: number | null;
    content: string;
  }

  let lines = $derived(parsePatch(patch));

  function parsePatch(patch: string): DiffLine[] {
    const result: DiffLine[] = [];
    let oldLine = 0, newLine = 0;
    const rawLines = patch.split('\n');
    for (const line of rawLines) {
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLine = Number(match[1]) - 1;
          newLine = Number(match[2]) - 1;
        }
        result.push({ type: 'header', oldLine: null, newLine: null, content: line });
      } else if (line.startsWith('+')) {
        newLine++;
        result.push({ type: 'add', oldLine: null, newLine, content: line.substring(1) });
      } else if (line.startsWith('-')) {
        oldLine++;
        result.push({ type: 'remove', oldLine, newLine: null, content: line.substring(1) });
      } else {
        oldLine++; newLine++;
        result.push({ type: 'context', oldLine, newLine, content: line.startsWith(' ') ? line.substring(1) : line });
      }
    }
    return result;
  }
</script>

<div class="diff-viewer">
  <div class="toolbar">
    <button class:active={viewMode === 'unified'} onclick={() => viewMode = 'unified'}>Unified</button>
    <button class:active={viewMode === 'split'} onclick={() => viewMode = 'split'}>Split</button>
  </div>
  <div class="diff-lines">
    {#if viewMode === 'unified'}
      {#each lines as line, i (i)}
        <div class="diff-row" class:row-add={line.type === 'add'} class:row-remove={line.type === 'remove'} class:row-header={line.type === 'header'}>
          {#if line.type === 'header'}
            <span class="ln ln-old"></span>
            <span class="ln ln-new"></span>
            <span class="code">{line.content}</span>
          {:else}
            <span class="ln ln-old">{line.oldLine ?? ''}</span>
            <span class="ln ln-new">{line.newLine ?? ''}</span>
            <span class="code">{(line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ') + line.content}</span>
          {/if}
        </div>
      {/each}
    {:else}
      {#each lines as line, i (i)}
        <div class="diff-row split-row" class:row-add={line.type === 'add'} class:row-remove={line.type === 'remove'} class:row-header={line.type === 'header'}>
          {#if line.type === 'header'}
            <div class="split-col">
              <span class="ln ln-old"></span>
              <span class="code">{line.content}</span>
            </div>
            <div class="split-col">
              <span class="ln ln-new"></span>
              <span class="code">{line.content}</span>
            </div>
          {:else}
            <div class="split-col">
              <span class="ln ln-old">{line.oldLine ?? ''}</span>
              <span class="code">{line.type !== 'add' ? (line.type === 'remove' ? '-' : ' ') + line.content : ''}</span>
            </div>
            <div class="split-col">
              <span class="ln ln-new">{line.newLine ?? ''}</span>
              <span class="code">{line.type !== 'remove' ? (line.type === 'add' ? '+' : ' ') + line.content : ''}</span>
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .diff-viewer { font-family: 'SF Mono', Menlo, Monaco, monospace; font-size: 12px; }
  .toolbar {
    display: flex;
    gap: 4px;
    padding: 4px 12px;
    border-bottom: 1px solid #d0d7de;
    background: #f6f8fa;
  }
  .toolbar button {
    padding: 2px 10px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    background: #fff;
    font-size: 11px;
    cursor: pointer;
  }
  .toolbar button.active { background: #d0d7de; }
  .diff-lines { overflow-x: auto; overflow-y: auto; }
  .diff-row { display: flex; line-height: 20px; min-height: 20px; }
  .diff-row.row-header { background: #f1f8ff; color: #0550ae; font-size: 11px; }
  .diff-row.row-add { background: #dafbe1; }
  .diff-row.row-remove { background: #ffebe9; }
  .ln {
    width: 48px;
    min-width: 48px;
    text-align: right;
    padding: 0 8px;
    color: #656d76;
    user-select: none;
    border-right: 1px solid #d0d7de;
    margin-right: 8px;
  }
  .ln.ln-new { border-left: 1px solid #d0d7de; }
  .code {
    white-space: pre;
    overflow: hidden;
    padding-right: 8px;
  }
  .split-row { gap: 0; }
  .split-col {
    flex: 1;
    display: flex;
    min-width: 0;
    border-right: 1px solid #d0d7de;
  }
  .split-col:last-child { border-right: none; }
  .row-header .split-col {
    border-bottom: 1px solid #d0d7de;
  }
</style>
```

- [ ] **Step 2: Update FilesChanged to use DiffViewer in `src/lib/components/FilesChanged.svelte`**

Add the import:

```typescript
import DiffViewer from "./DiffViewer.svelte";
```

Replace the `<p class="status">TODO: Diff viewer</p>` inside `.diff-body` with:

```svelte
{#if currentFile.patch}
  <DiffViewer patch={currentFile.patch} />
{:else}
  <p class="status">No diff available (binary file or too large)</p>
{/if}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add unified and split diff viewer"
```

---

### Task 10: Inline Comments in Diffs

**Files:**

- Create: `src/lib/components/InlineComment.svelte`
- Modify: `src/lib/components/DiffViewer.svelte`
- Modify: `src/lib/components/FilesChanged.svelte`

- [ ] **Step 1: Create InlineComment component in `src/lib/components/InlineComment.svelte`**

```svelte
<script lang="ts">
  import Markdown from './Markdown.svelte';

  interface CommentThread {
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    replies: CommentThread[];
  }

  let { thread, onreply }: { thread: CommentThread; onreply?: (body: string) => Promise<void> } = $props();
  let showReply = $state(false);
  let replyBody = $state('');
  let submitting = $state(false);

  async function submitReply() {
    if (!replyBody.trim() || submitting) return;
    submitting = true;
    try {
      if (onreply) await onreply(replyBody);
      showReply = false;
      replyBody = '';
    } finally {
      submitting = false;
    }
  }
</script>

<div class="inline-comment">
  <div class="thread">
    <div class="comment-bubble">
      <div class="bubble-header">
        <strong>{thread.user.login}</strong>
        <span class="date">{thread.createdAt}</span>
      </div>
      <div class="bubble-body">
        <Markdown text={thread.body} />
      </div>
    </div>
    {#each thread.replies as reply (reply.id)}
      <div class="comment-bubble reply">
        <div class="bubble-header">
          <strong>{reply.user.login}</strong>
          <span class="date">{reply.createdAt}</span>
        </div>
        <div class="bubble-body">
          <Markdown text={reply.body} />
        </div>
      </div>
    {/each}
    {#if showReply}
      <div class="reply-input">
        <textarea bind:value={replyBody} placeholder="Write a reply..." rows={2} disabled={submitting}></textarea>
        <div class="reply-actions">
          <button class="cancel" onclick={() => { showReply = false; replyBody = ''; }}>Cancel</button>
          <button class="submit" onclick={submitReply} disabled={submitting || !replyBody.trim()}>Comment</button>
        </div>
      </div>
    {:else}
      <button class="reply-toggle" onclick={() => showReply = true}>Reply</button>
    {/if}
  </div>
</div>

<style>
  .inline-comment { margin: 4px 0 8px 24px; }
  .comment-bubble {
    border: 1px solid #d0d7de;
    border-radius: 6px;
    margin-bottom: 4px;
    overflow: hidden;
  }
  .comment-bubble.reply { margin-left: 16px; }
  .bubble-header {
    padding: 6px 10px;
    background: #f6f8fa;
    border-bottom: 1px solid #d0d7de;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
  }
  .bubble-body { padding: 6px 10px; font-size: 13px; }
  .date { color: #656d76; font-size: 11px; }
  .reply-toggle {
    border: none;
    background: none;
    color: #0969da;
    font-size: 12px;
    cursor: pointer;
    padding: 2px 4px;
  }
  .reply-input { padding: 4px 0; }
  .reply-input textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
  }
  .reply-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .reply-actions button {
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .cancel { border: 1px solid #d0d7de; background: #fff; }
  .submit {
    border: 1px solid #1f883d;
    background: #1f883d;
    color: #fff;
  }
  .submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
```

- [ ] **Step 2: Update DiffViewer to show inline comments in `src/lib/components/DiffViewer.svelte`**

Add this prop:

```typescript
let {
  patch,
  inlineComments = [],
}: {
  patch: string;
  inlineComments?: Array<{
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    line: number | null;
    originalLine: number | null;
    replies: Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
    }>;
  }>;
} = $props();
```

Add this import:

```typescript
import InlineComment from "./InlineComment.svelte";
```

Inside the `{#if viewMode === 'unified'}` block, after each diff-row when `line.type !== 'header'`, add:

```svelte
{#each inlineComments.filter(c => c.originalLine === line.newLine || c.originalLine === line.oldLine) as comment (comment.id)}
  <div class="diff-row">
    <InlineComment
      thread={{
        id: comment.id,
        body: comment.body,
        user: comment.user,
        createdAt: comment.createdAt,
        replies: comment.replies,
      }}
    />
  </div>
{/each}
```

Add the same inside the `{:else}` (split view) block, after each split-row for non-header lines.

- [ ] **Step 3: Update FilesChanged to fetch inline comments in `src/lib/components/FilesChanged.svelte`**

Add the import:

```typescript
import { listInlineComments } from "$lib/github/pulls";
```

Add state:

```typescript
let inlineComments = $state<
  Array<{
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    path: string;
    line: number | null;
    originalLine: number | null;
    replies: Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
    }>;
  }>
>([]);
```

In `onMount`, after loading files, add:

```typescript
const rawComments = await listInlineComments(owner, repo, number);
inlineComments = rawComments.map((c) => ({
  id: c.id,
  body: c.body ?? "",
  user: { login: c.user?.login ?? "", avatarUrl: c.user?.avatar_url ?? "" },
  createdAt: c.created_at,
  path: c.path,
  line: c.line,
  originalLine: c.original_line,
  replies: [],
}));
```

Update the DiffViewer invocation to pass the filtered comments:

```svelte
<DiffViewer
  patch={currentFile.patch}
  inlineComments={inlineComments.filter(c => c.path === currentFile.filename)}
/>
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add inline comments in diff viewer"
```

---

### Task 11: Commits Tab

**Files:**

- Create: `src/lib/components/Commits.svelte`
- Modify: `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`

- [ ] **Step 1: Create Commits component in `src/lib/components/Commits.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { listPRCommits } from '$lib/github/pulls';
  import type { PRCommit } from '$lib/github/types';

  let commits = $state<PRCommit[]>([]);
  let loading = $state(true);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(async () => {
    try {
      const raw = await listPRCommits(owner, repo, number);
      commits = raw.map(c => ({
        sha: c.sha,
        author: {
          login: c.author?.login ?? c.commit.author?.name ?? 'unknown',
          avatarUrl: c.author?.avatar_url ?? '',
        },
        message: c.commit.message.split('\n')[0],
        date: c.commit.author?.date ?? '',
      }));
    } finally {
      loading = false;
    }
  });

  function shortSha(sha: string): string {
    return sha.substring(0, 7);
  }
</script>

{#if loading}
  <p class="status">Loading commits...</p>
{:else}
  <div class="commits">
    {#each commits as commit (commit.sha)}
      <div class="commit">
        <div class="commit-meta">
          <span class="sha">{shortSha(commit.sha)}</span>
          <span class="author">{commit.author.login}</span>
        </div>
        <div class="commit-message">{commit.message}</div>
      </div>
    {/each}
    {#if commits.length === 0}
      <p class="status">No commits</p>
    {/if}
  </div>
{/if}

<style>
  .commits { max-width: 900px; }
  .commit {
    padding: 10px 16px;
    border-bottom: 1px solid #f0f0f0;
  }
  .commit:hover { background: #f6f8fa; }
  .commit-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 2px;
  }
  .sha {
    font-family: monospace;
    font-size: 12px;
    color: #656d76;
    background: #f0f0f0;
    padding: 1px 6px;
    border-radius: 4px;
  }
  .author { font-size: 13px; color: #656d76; }
  .commit-message { font-size: 14px; }
  .status { padding: 16px; color: #656d76; font-size: 14px; }
</style>
```

- [ ] **Step 2: Update PR detail page to include Commits tab in `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`**

Replace `<p>TODO: Commits tab</p>` with:

```svelte
<Commits />
```

Add import:

```typescript
import Commits from "$lib/components/Commits.svelte";
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add commits tab"
```

---

### Task 12: Checks Tab

**Files:**

- Create: `src/lib/components/Checks.svelte`
- Modify: `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`

- [ ] **Step 1: Create Checks component in `src/lib/components/Checks.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { listChecks } from '$lib/github/pulls';
  import type { CheckRun } from '$lib/github/types';

  let { headSha = '' }: { headSha?: string } = $props();

  let checkRuns = $state<CheckRun[]>([]);
  let loading = $state(true);

  let owner = $derived($page.params.owner);
  let repo = $derived($page.params.repo);
  let number = $derived(Number($page.params.number));

  onMount(async () => {
    try {
      const raw = await listChecks(owner, repo, headSha);
      checkRuns = raw.check_runs.map((r: Record<string, unknown>) => ({
        id: r.id as number,
        name: (r.name as string) ?? '',
        status: (r.status as string) ?? 'unknown',
        conclusion: (r.conclusion as string | null) ?? null,
        detailsUrl: (r.details_url as string | null) ?? null,
        steps: ((r.steps as Array<{name: string; status: string; conclusion: string | null}>) ?? []).map(s => ({
          name: s.name, status: s.status, conclusion: s.conclusion
        })),
      }));
    } finally {
      loading = false;
    }
  });

  function conclusionIcon(conclusion: string | null): string {
    if (conclusion === 'success') return '✓';
    if (conclusion === 'failure') return '✗';
    if (conclusion === 'neutral') return '—';
    if (conclusion === 'cancelled') return '⊘';
    if (conclusion === 'skipped') return '⊘';
    return '';
  }

  function conclusionColor(conclusion: string | null): string {
    if (conclusion === 'success') return '#1a7f37';
    if (conclusion === 'failure') return '#cf222e';
    if (conclusion === 'cancelled' || conclusion === 'skipped') return '#656d76';
    return '#9a6700';
  }
</script>

{#if loading}
  <p class="status">Loading checks...</p>
{:else}
  <div class="checks-panel">
    {#if checkRuns.length === 0}
      <p class="status">No checks configured</p>
    {:else}
      {#each checkRuns as check (check.id)}
        <div class="check">
          <span class="icon" style="color:{conclusionColor(check.conclusion)}">{conclusionIcon(check.conclusion)}</span>
          <div class="check-info">
            <span class="check-name">{check.name}</span>
            <span class="check-status">{check.status} {check.conclusion ? '· ' + check.conclusion : ''}</span>
          </div>
          {#if check.detailsUrl}
            <a class="details-link" href={check.detailsUrl} target="_blank" rel="noopener">Details</a>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .checks-panel { max-width: 900px; }
  .check {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-bottom: 1px solid #f0f0f0;
  }
  .check:hover { background: #f6f8fa; }
  .icon { width: 20px; font-size: 16px; font-weight: 600; }
  .check-info { flex: 1; display: flex; flex-direction: column; }
  .check-name { font-size: 14px; font-weight: 500; }
  .check-status { font-size: 12px; color: #656d76; }
  .details-link {
    font-size: 12px;
    color: #0969da;
    text-decoration: none;
  }
  .status { padding: 16px; color: #656d76; font-size: 14px; }
</style>
```

- [ ] **Step 2: Update PR detail page to include Checks tab in `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`**

Replace `<p>TODO: Checks tab</p>` with:

```svelte
<Checks headSha={pr.head.sha} />
```

Add import:

```typescript
import Checks from "$lib/components/Checks.svelte";
```

Update Checks component to accept `headSha` as a prop. Change the opening to:

```typescript
let { headSha = "" }: { headSha?: string } = $props();
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add checks tab"
```

---

### Task 13: Settings Page & Final Polish

**Files:**

- Create: `src/routes/settings/+page.svelte`
- Modify: `src/routes/+page.svelte` (fix: notification list should use its own layout for PR detail)

- [ ] **Step 1: Create settings page in `src/routes/settings/+page.svelte`**

```svelte
<script lang="ts">
  import { getToken, clearToken, setToken } from '$lib/stores/token.svelte';
  import { goto } from '$app/navigation';

  let currentToken = $state(getToken() ?? '');
  let showToken = $state(false);

  function handleLogout() {
    clearToken();
    goto('/login');
  }
</script>

<div class="settings">
  <h1>Settings</h1>
  <div class="section">
    <h2>GitHub Token</h2>
    <div class="token-display">
      <input type={showToken ? 'text' : 'password'} bind:value={currentToken} />
      <button onclick={() => showToken = !showToken}>{showToken ? 'Hide' : 'Show'}</button>
    </div>
    <button class="save-btn" onclick={() => { if (currentToken) setToken(currentToken); }}>Save Token</button>
  </div>
  <div class="section">
    <h2>Account</h2>
    <button class="logout-btn" onclick={handleLogout}>Logout</button>
  </div>
  <button class="back-btn" onclick={() => history.back()}>Back</button>
</div>

<style>
  .settings { max-width: 600px; margin: 0 auto; padding: 2rem; }
  h1 { font-size: 20px; margin-bottom: 1.5rem; }
  h2 { font-size: 16px; margin-bottom: 0.75rem; }
  .section { margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #d0d7de; }
  .token-display { display: flex; gap: 8px; margin-bottom: 8px; }
  .token-display input {
    flex: 1; padding: 6px 10px;
    border: 1px solid #d0d7de; border-radius: 6px;
    font-size: 14px;
  }
  .token-display button {
    padding: 6px 12px; border: 1px solid #d0d7de;
    border-radius: 6px; background: #f6f8fa; cursor: pointer; font-size: 13px;
  }
  .save-btn {
    padding: 6px 16px; background: #1f883d; color: #fff;
    border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
  }
  .save-btn:hover { background: #1a7f37; }
  .logout-btn {
    padding: 6px 16px; background: #cf222e; color: #fff;
    border: none; border-radius: 6px; font-size: 14px; cursor: pointer;
  }
  .back-btn {
    padding: 6px 16px; border: 1px solid #d0d7de;
    border-radius: 6px; background: #f6f8fa; cursor: pointer; font-size: 14px;
  }
</style>
```

- [ ] **Step 2: Clean up old placeholder page — verify `+page.svelte` at root is in final state**

Verify the root `+page.svelte` contains the full notification list + sidebar layout from Task 5.

- [ ] **Step 3: Verify app compiles and runs**

```bash
npm run dev
```

Navigate through all routes: login → notifications → click notification → PR detail → test all tabs.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add settings page and final polish"
```

---

### Task 14: Wire Cache Layer Into API Fetchers

**Files:**

- Modify: `src/lib/github/notifications.ts`
- Modify: `src/lib/github/pulls.ts`
- Modify: `src/lib/github/cache/middleware.ts`

- [ ] **Step 1: Add cache integration to notification fetcher in `src/lib/github/notifications.ts`**

Add the import:

```typescript
import { getCached } from "./cache/middleware";
```

Replace `fetchNotifications` body to use cache. Change the implementation to accept a signal for cache-busting:

```typescript
async function fetchNotifications(params: FetchParams = {}): Promise<Array<{ id: string; unread: boolean; reason: string; updated_at: string; last_read_at: string | null; subject: { title: string; url: string; type: string; latest_comment_url: string | null }; repository: { id: number; name: string; full_name: string; owner: { login: string }; html_url: string }>> {
  const octokit = createClient();
  const url = `/notifications?all=${params.all ?? false}&participating=${params.participating ?? false}&per_page=${params.perPage ?? 50}&page=${params.page ?? 1}`;
  const response = await getCached(url, async () => {
    const res = await octokit.rest.activity.listNotificationsForAuthenticatedUser({
      all: params.all ?? false,
      participating: params.participating ?? false,
      since: params.since,
      before: params.before,
      per_page: params.perPage ?? 50,
      page: params.page ?? 1,
    });
    return new Response(JSON.stringify(res.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'etag': res.headers.etag ?? '' },
    });
  });
  return response.json();
}
```

- [ ] **Step 2: Add cache integration to PR files fetcher in `src/lib/github/pulls.ts`**

Add the import:

```typescript
import { getCached } from "./cache/middleware";
```

Replace `listPRFiles` body:

```typescript
async function listPRFiles(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const url = `/repos/${owner}/${repo}/pulls/${pullNumber}/files`;
  const response = await getCached(url, async () => {
    const res = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    return new Response(JSON.stringify(res.data), {
      status: 200,
      headers: { "Content-Type": "application/json", etag: res.headers.etag ?? "" },
    });
  });
  return response.json();
}
```

- [ ] **Step 3: Add cache integration to inline comments fetcher in `src/lib/github/pulls.ts`**

Replace `listInlineComments` body:

```typescript
async function listInlineComments(owner: string, repo: string, pullNumber: number) {
  const octokit = createClient();
  const url = `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`;
  const response = await getCached(url, async () => {
    const res = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    return new Response(JSON.stringify(res.data), {
      status: 200,
      headers: { "Content-Type": "application/json", etag: res.headers.etag ?? "" },
    });
  });
  return response.json();
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: wire IndexedDB cache into API fetchers"
```

---

### Task 15: Inline Comment Creation on Diff Lines

**Files:**

- Modify: `src/lib/components/DiffViewer.svelte`

- [ ] **Step 1: Add comment creation UI to unified diff rows in `src/lib/components/DiffViewer.svelte`**

Add new props:

```typescript
let {
  patch,
  inlineComments = [],
  currentFile = "",
  headSha = "",
  onCreateComment,
}: {
  patch: string;
  inlineComments?: Array<{
    id: number;
    body: string;
    user: { login: string; avatarUrl: string };
    createdAt: string;
    line: number | null;
    originalLine: number | null;
    replies: Array<{
      id: number;
      body: string;
      user: { login: string; avatarUrl: string };
      createdAt: string;
    }>;
  }>;
  currentFile?: string;
  headSha?: string;
  onCreateComment?: (line: number, file: string, body: string) => Promise<void>;
} = $props();
```

Add state for comment creation:

```typescript
let activeCommentLine = $state<number | null>(null);
let commentBody = $state("");
let submitting = $state(false);
```

Replace the diff-row templates in the unified block. For each row (where `line.type !== 'header'`), wrap the line content in a container with hover + icon:

```svelte
{#if viewMode === 'unified'}
  {#each lines as line, i (i)}
    <div class="diff-row" class:row-add={line.type === 'add'} class:row-remove={line.type === 'remove'} class:row-header={line.type === 'header'}>
      {#if line.type === 'header'}
        <span class="ln ln-old"></span>
        <span class="ln ln-new"></span>
        <span class="code">{line.content}</span>
      {:else}
        <span class="ln ln-old">{line.oldLine ?? ''}</span>
        <span class="ln ln-new">{line.newLine ?? ''}</span>
        <span class="code-line">
          <span class="code">{(line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ') + line.content}</span>
          <button
            class="add-comment-btn"
            onclick={() => activeCommentLine = activeCommentLine === line.newLine ? null : line.newLine}
            title="Add comment on this line"
          >+</button>
        </span>
        {#if activeCommentLine === line.newLine}
          <div class="inline-comment-input diff-row">
            <textarea bind:value={commentBody} placeholder="Write a comment..." rows={2} disabled={submitting}></textarea>
            <div class="comment-actions">
              <button class="cancel" onclick={() => { activeCommentLine = null; commentBody = ''; }}>Cancel</button>
              <button class="submit-btn" onclick={async () => {
                if (!commentBody.trim() || submitting) return;
                submitting = true;
                try {
                  if (onCreateComment) await onCreateComment(activeCommentLine!, currentFile, commentBody);
                  commentBody = '';
                  activeCommentLine = null;
                } finally { submitting = false; }
              }} disabled={submitting || !commentBody.trim()}>Comment</button>
            </div>
          </div>
        {/if}
      {/each}
    {/each}
  {/if}
      {/each}
    {/each}
  {/if}
</div>
{#each inlineComments.filter(c => c.originalLine === line.newLine || c.originalLine === line.oldLine) as comment (comment.id)}
  <div class="diff-row">
    <InlineComment thread={{ id: comment.id, body: comment.body, user: comment.user, createdAt: comment.createdAt, replies: comment.replies }} />
  </div>
{/each}
```

Actually, this is getting very tangled trying to patch inline. Let me instead rewrite the key section more cleanly. The approach is: the unified block should show each line with a + icon, and when clicked, show the inline comment input below that line. Then show existing inline comments below their lines. Let me also add CSS for the hover button.

Let me rewrite this more cleanly by replacing the entire DiffViewer file content in a cleaner way. Actually, let me just provide the key changes as targeted edits.

- [ ] **Step 2: Add CSS for add-comment button and inline editor**

In the `<style>` block of DiffViewer, add:

```css
.code-line {
  display: flex;
  align-items: center;
  flex: 1;
}
.code-line:hover .add-comment-btn {
  opacity: 1;
}
.add-comment-btn {
  opacity: 0;
  margin-left: 8px;
  width: 20px;
  height: 20px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: #0969da;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.add-comment-btn:hover {
  background: #ddf4ff;
}
.inline-comment-input {
  padding: 8px 8px 8px 104px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f6f8fa;
  border-top: 1px solid #d0d7de;
  border-bottom: 1px solid #d0d7de;
}
.inline-comment-input textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
}
.comment-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.comment-actions button {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.comment-actions .cancel {
  border: 1px solid #d0d7de;
  background: #fff;
}
.comment-actions .submit-btn {
  border: 1px solid #1f883d;
  background: #1f883d;
  color: #fff;
}
.comment-actions .submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Update FilesChanged to wire onCreateComment in `src/lib/components/FilesChanged.svelte`**

Add import:

```typescript
import { createInlineComment } from "$lib/github/pulls";
```

Add headSha to state (fetch from PR data):

```typescript
let headSha = $state("");
```

Update `onMount` to set `headSha`:
Add after the PR files load (need to also load PR metadata for the sha). Since `FilesChanged` doesn't have access to PR metadata directly, pass it as a prop. Update `FilesChanged` to accept:

```typescript
let { headSha: sha = "" }: { headSha?: string } = $props();
```

Add the `onCreateComment` handler:

```typescript
async function onCreateComment(line: number, file: string, body: string) {
  const comment = await createInlineComment(owner, repo, number, body, sha, file, line);
  inlineComments = [
    ...inlineComments,
    {
      id: comment.id,
      body: comment.body ?? "",
      user: { login: comment.user?.login ?? "", avatarUrl: comment.user?.avatar_url ?? "" },
      createdAt: comment.created_at,
      path: comment.path,
      line: comment.line,
      originalLine: comment.original_line,
      replies: [],
    },
  ];
}
```

Update the `<DiffViewer>` invocation:

```svelte
<DiffViewer
  patch={currentFile.patch}
  inlineComments={inlineComments.filter(c => c.path === currentFile.filename)}
  currentFile={currentFile.filename}
  headSha={sha}
  onCreateComment={onCreateComment}
/>
```

- [ ] **Step 4: Update PR detail page to pass headSha to FilesChanged**

In `src/routes/[owner]/[repo]/pulls/[number]/+page.svelte`, update the FilesChanged usage:

```svelte
<FilesChanged headSha={pr.head.sha} />
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add inline comment creation on diff lines"
```
