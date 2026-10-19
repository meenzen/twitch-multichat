# Agent instructions

Twitch Multichat: a SvelteKit 3 / Svelte 5 (runes) app that merges several
Twitch chats into one view, deployed to Cloudflare. Chat is read-only and
anonymous via `@twurple/chat`.

## Tooling

- Everything runs inside devenv (Nix). Run commands as
  `devenv shell -- bun run <script>`; `bun`/`node` are not on the host PATH.
  If devenv serves a stale toolchain after a lock bump, add
  `--refresh-eval-cache`.
- `ci` (defined in `devenv.nix`) is the full pipeline and what GitHub Actions
  runs: install, format, lint, check, unit tests, build, e2e tests. Run
  `devenv shell -- ci` before pushing. It takes about 35 s.
- Git hooks (prek) only run quick checks (whitespace, nix formatting). They do
  not run `ci`.
- Scripts: `bun run test` (unit), `bun run test:e2e`, `bun run check`
  (svelte-check + service worker `tsc`), `bun run lint`, `bun run format`.
- Commits follow conventional commits (`feat:`, `fix:`, `test:`, `ci:`,
  `refactor:`, `docs:`). Changes go through PRs against `main`.

## Code layout

- `src/lib/chat/`: UI side, no `@twurple` imports.
  - `ChatMessage.ts`: display model (`ParsedMessage`). The timeline is a
    list of `ChatEntry`: messages plus `DisconnectEntry` markers that the
    store inserts when the connection comes back; check with `isMessage()`.
  - `ChatSource.ts`: `ChatSource` interface plus `ChatEmitter`. Events:
    `message`, `messageRemoved`, `userCleared`, `channelCleared`, `status`.
  - `ChatStore.svelte.ts`: message buffer and moderation removals.
  - `ChatView.svelte`: pure presentation, props only. Fills its parent,
    which needs a definite height.
  - `StickToBottom.ts`: keeps the chat pinned to the newest message and lets
    go when the user scrolls up (scrollTop decreasing, wheel/keys up). No
    layout, so it is unit tested with a fake scroller.
  - `Chat.svelte`: connects a source to a store and a view.
  - `ChannelFilter.svelte.ts`: which channels are shown, toggled from the
    channel list (`TwitchChannelList.svelte`). `Chat` filters the store's
    messages, the store itself keeps hidden channels' messages.
- `src/lib/components/ChatScreen.svelte`: full-screen layout (100dvh) with a
  top bar (home link, channel list in one row, settings button). Only the
  chat scrolls, never the page. Escape toggles the settings dialog. Overlay
  mode hides the bar and makes the background transparent.
- `src/lib/settings/`: chat settings.
  - `ChatSettings.ts`: the settings, defaults and query parameters (pure).
    Only non-default values go into the URL. Add new settings here.
  - `Settings.svelte.ts`: reactive `Settings` and `persistInUrl`, which
    mirrors changes into the query string. Pages pass `replaceUrl.ts`, a
    replacing `goto` that is deliberately not shallow: SvelteKit restores
    shallow entries from the URL the page was loaded with on back/forward,
    which loses the settings.
  - `SettingsDialog.svelte`: the menu, a native `<dialog>` (focus trap and
    focus return come from the browser).
- Icons come from `@lucide/svelte`. Import each icon from
  `@lucide/svelte/icons/<name>` so only used icons are bundled.
- `src/lib/twitch/`: the only place that touches twurple
  (`TwitchChatSource`, `parseMessage`).
- `src/lib/fake/`: `FakeChatSource` (drive it by hand or call `stream()`) and
  seeded fixtures (`createMessage`, `randomMessages`).
- `src/lib/components/modal/`: shared `Modal` plus `modalStack`. Only the top
  modal renders (higher `ModalPriority` wins, ties go to the newest), so
  modals never overlap. Use `Modal` for any blocking status message.
- `src/lib/serviceWorkerUpdates.ts` and `components/UpdateNotifier.svelte`:
  update polling, the "Installing update..." modal and the reload.
- `src/service-worker/`: workbox setup. `precache.ts` is pure and testable.
- SEO: `src/lib/site.ts` (texts, structured data, robots.txt, sitemap) and
  `components/MetaTags.svelte`. Meta tags need absolute URLs; prerendered
  pages have a placeholder origin, so pass `siteUrl(page.url, building)`.
  Only the landing page is indexed, chat pages are `noindex` but stay
  crawlable for link previews. The preview image (`routes/images/`) is
  rendered by `@ethercorps/sveltekit-og`, which drops `<img>` with
  width/height attributes: size images with CSS.
- Design tokens live in `src/app.html` (`--background-color`,
  `--twitch-purple`, ...). Reuse them instead of hard-coding colours.

## Iterating on the chat UI

`/dev/chat` renders the real chat pipeline with fake data, no Twitch needed:

- `/dev/chat?rate=10&delete=0.1`: live stream with random deletions
- `/dev/chat?drop=10`: drop the connection for 3 s every 10 s
- `/dev/chat?static&seed=42&count=50`: reproducible list
- `?channels=a,b,c`, plus every chat setting (`?size=large&timestamps=true`,
  `?overlay=true`, ...)

## Testing

- Unit and component tests use `bun test` (not vitest). Put `*.test.ts` next
  to the code.
- `test/setup.ts` (preload) registers happy-dom and the Bun plugin from
  `test/sveltePlugin.ts` that compiles `.svelte` and `.svelte.ts/js` files.
  Tests must run with
  `--conditions=browser`; the `test` script already passes it.
- Render components with `@testing-library/svelte`; call `cleanup` in
  `afterEach`. Await `tick()` after pushing data into a store or source.
- Inject dependencies instead of mocking globals. `TwitchChatSource` takes
  `client`, `document` and `window`; `watchForUpdates` and `UpdateNotifier`
  take `navigator` and `reload`. Fakes:
  - `FakeChatSource` for chat sources
  - `test/fakeServiceWorker.ts` for service worker APIs
  - an object with `on*` binders for the twurple client (see
    `TwitchChatSource.test.ts`)
- Timers: `jest.useFakeTimers()` / `jest.advanceTimersByTime()` from
  `bun:test`.
- `mock()` from `bun:test` does not return the instance when called with
  `new`. Use small stub classes for constructors (see
  `service-worker/index.test.ts`, which also shows `mock.module` for workbox
  and `$app/*`).
- E2E tests (`e2e/`) use `Bun.WebView` (headless Chromium) and `Bun.serve`.
  They have their own `e2e/bunfig.toml` because the happy-dom preload replaces
  the global `Response` that `Bun.serve` needs.
  - The service worker test builds the app twice (two real deploys) into
    `.e2e/`. Set `E2E_REUSE_BUILD=1` to skip the builds while iterating.
  - The chat scroll test skips vite: it bundles `e2e/chat-scroll/harness.ts`
    (real components, `FakeChatSource` driven via `window.chat`) with
    `Bun.build` and the Svelte plugin, served inside `src/app.html`. Use
    `view.scroll()` for trusted wheel input and `Input.dispatchTouchEvent`
    for swipes; headless Chrome ignores `Input.synthesizeScrollGesture`.
  - devenv sets `BUN_CHROME_PATH` to a Chromium wrapper (Linux only). It
    clears `LD_LIBRARY_PATH`, because a host value can load libraries built
    for a newer glibc, and passes `--no-sandbox`, because Ubuntu 24.04 CI
    runners block the sandbox's user namespaces.

## Pitfalls

### Svelte

- A store method that reads and writes `$state` and is called from an
  `$effect` causes `effect_update_depth_exceeded`. Wrap the mutation in
  `untrack()` (see `modalStack.svelte.ts`).
- Prefer `$state.raw` with immutable updates for message arrays.

### twurple

- `message.target` is `#channel`; event callbacks pass the channel name
  without `#`. `ParsedMessage.channel` is normalized (no `#`, lowercase);
  compare normalized names.
- Bans and timeouts arrive via `onBan` / `onTimeout`. `onChatClear` only
  covers full channel clears.
- twurple reconnects on its own but does not rejoin channels joined via
  `join()`. `TwitchChatSource` rejoins on every `onAuthenticationSuccess`;
  keep it that way.
- While a phone sleeps, timers don't run. Use `client.irc.pingCheck()` (public
  API) to verify a connection after the page resumes.

### Service worker

- The worker calls `skipWaiting()` and `clientsClaim()`. The page reloads on
  `controllerchange` only if a worker already controlled it; the first install
  is not an update.
- Static assets are precached with the app version as revision. Hashed build
  output has no revision.

## Verifying in a real browser

- To see a service worker update: `bun run build && bun run preview`, open the
  home page, stop preview, run `bun run build && bun run preview` again, then
  reload the page. Every build gets a new version.
- Restart `bun run preview` after every build, and don't build while a
  preview runs from the same checkout (`ci` and `test:e2e` build too). A
  preview process that outlives a rebuild can mix server code from different
  builds. SSR routes such as `/-/<channels>` then fail with odd errors
  (seen: HTTP 500, `Cannot create property 'toString' on string` in
  `MetaTags.svelte`, with stack traces pointing at the wrong functions). If
  that happens, check for a stale `vite preview` with `pgrep -af "vite preview"`
  before debugging the app.
- When automating the dev server with frozen pages or broken sockets, Vite's
  dev-server WebSocket reloads the page once it reconnects, which hides what
  the app itself does. Only break Twitch sockets, or keep Vite's socket from
  connecting.
- For live chat tests, pick active channels from the trending API the app
  uses (`src/lib/TrendingChannels.ts`). Arbitrary big streamers are often
  offline or quiet.
- `Bun.WebView` with `backend: { type: "chrome", path: process.env.BUN_CHROME_PATH }`
  supports `evaluate()`, `screenshot()` and raw `cdp()` calls, for example
  `Page.setWebLifecycleState` to freeze a page or
  `Page.addScriptToEvaluateOnNewDocument` to inject instrumentation.
