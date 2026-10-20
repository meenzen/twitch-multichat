# Agent instructions

Twitch Multichat: a SvelteKit 3 / Svelte 5 (runes) app that merges several
Twitch chats into one view, deployed to Cloudflare Pages and packaged for
NixOS (`flake.nix`, see "Nix package and NixOS module"). Chat is read-only
and anonymous via `@twurple/chat`.

## Tooling

- Everything runs inside devenv (Nix). Run commands as
  `devenv shell -- bun run <script>`; `bun`/`node` are not on the host PATH.
  If devenv serves a stale toolchain after a lock bump, add
  `--refresh-eval-cache`.
- `ci` (defined in `devenv.nix`) is the full pipeline and what GitHub Actions
  runs: install, `bun.nix`, format, lint, check, unit tests, build, e2e
  tests. Run `devenv shell -- ci` before pushing. It takes about 35 s.
  GitHub Actions also runs `nix flake check` (package and VM test).
- Git hooks (prek) only run quick checks (whitespace, nix formatting) and
  regenerate `bun.nix` when `bun.lock` changes. They do not run `ci`.
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
  - `savedSettings.ts`: the user's own settings in localStorage (never
    overlay mode). A chat link without setting parameters starts with them;
    a link with any shows exactly its settings (`initialSettings`). They are
    saved only when changed (`saveOnChange`), so opening a shared link
    doesn't overwrite them.
- `src/lib/ChannelSelection.ts`: the back arrow links to
  `/?channels=a,b&<settings>`; the landing page prefills the channels and
  passes the settings on to Connect and the recent selections
  (`RecentChannels.ts`, recorded when a chat opens).
- `src/lib/storage.ts`: localStorage access that never throws. Pass a
  `KeyValueStorage` in, tests use `test/fakeStorage.ts`.
- Icons come from `@lucide/svelte`. Import each icon from
  `@lucide/svelte/icons/<name>` so only used icons are bundled.
- `src/lib/twitch/`: the only place that touches twurple
  (`TwitchChatSource`, `parseMessage`).
- `src/lib/emotes/`: third-party emotes (BetterTTV, 7TV). An
  `EmoteProvider` per service (`bttv.ts`, `seventv.ts`, fetch injectable),
  `EmoteLoader` merges them: channel emotes over global ones, then later
  providers (7TV) over earlier ones. `splitEmotes` turns words into emote
  parts at parse time and stacks zero-width emotes (7TV's RainTime, ...) on
  the emote before them as `emoteOverlays`, rendered by `MessageEmote`.
  7TV emotes are matched by their name in the channel's set, which can
  differ from the emote's own name.
  `TwitchChatSource` starts loading on ROOMSTATE (channels are looked up by
  `room-id`) and `EmoteGate` holds a channel's messages and removals until
  its emotes are there (3 s timeout). API failures only cost emotes:
  `fetchJson` gives up after 10 s, failed global lists are retried with the
  next channel, and a failed refresh keeps the channel's last good list.
  Live updates: providers implement `watch()` (one `LiveSocket` per
  service, reconnecting with backoff) and push `EmoteChange`s, which
  `EmoteLoader` applies and `TwitchChatSource` hands to `EmoteGate`, for new
  messages only. Changes are logged as `Emotes of <channel>: 7TV added
"X"`. Neither service replays missed events, so every reconnect reloads.
  7TV: subscribe by `object_id` (the channel's emote set and its 7TV user,
  for set switches); the channel condition (`ctx: "channel"`) does not
  deliver channel emote changes but floods with chatters' personal emote
  sets, badges and paints. Subscribing twice closes the connection (4009),
  hence `sync()`. Three missed heartbeats (from the hello) mean a dead
  socket. BTTV: `join_channel` with `twitch:<id>`; it sends no heartbeats,
  so a quiet socket is normal.
  Parts carry `emoteImages` (every size, built from the id by the provider),
  `emoteHeightScale` (7TV emotes shorter than 32px) and `emoteProvider`;
  the per-provider setting only hides them at render time (`hiddenEmotes`),
  so toggling needs no reload. `TwitchEmote` turns the images into a
  `srcset` whose densities are divided by the text scale
  (`emotes/images.ts`), so larger text loads larger images. While loading
  an emote keeps an empty box of its size (CSS `aspect-ratio`, square unless
  7TV reports the size); if the image fails it is replaced by its name. A
  placeholder `src` swapped for the real one does not help: Chrome shows
  nothing until the new image is there, and the broken icon on errors.
  `MessageEmote` renders through a single `{#each}`: whitespace between
  top-level blocks would add spaces next to the message's own.
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
  width/height attributes: size images with CSS. `radial-gradient` makes it
  fail. Errors only show with `debug: true` in the `ImageResponse` options;
  the response is then empty (curl: "Empty reply from server"). After
  editing a preview component, restart `vite dev`: hot reloads leave the
  renderer failing until a restart, which looks like a broken design.
  `PreviewImage.svelte` is the image for every page: chat pages show their
  first channels (as many as `previewChannels.ts` estimates to fit), the
  landing page made-up ones.
  The route makes no requests: Inter (latin `.woff`, satori reads no woff2)
  and the logo are bundled with `?inline`, and invalid channel names are
  dropped, so no emoji reaches sveltekit-og, which fetches emoji from a CDN.
  `routes/images/preview.png/server.test.ts` renders the route, fails on
  any fetch and compares the PNGs to `__snapshots__/` (see "Testing"). satori-html's CSS inliner
  (ultrahtml) fails under Bun on every `<style>` ("evaluating
  'selector.type'"): Bun's transpiler escapes the `¶` in a regex literal
  whose `.source` the library string-replaces. `patches/ultrahtml@*.patch`
  fixes that; Node and workerd are unaffected.
- `src/lib/cacheControl.ts`: Cache-Control per route for responses from the
  Pages Function (and the Node server), applied in `hooks.server.ts`. Add new dynamic routes there.
  Pages runs Functions before its CDN cache, so only browser and scraper
  caches save requests (repeat requests from the same client). Chat pages
  are `no-cache`: their HTML references the current build's hashed scripts,
  and a cached copy could load a previous build after a deploy.
- Design tokens live in `src/app.html` (`--background-color`,
  `--twitch-purple`, ...). Reuse them instead of hard-coding colours.

## Nix package and NixOS module

- `vite.config.ts` builds for Cloudflare by default; `ADAPTER=node` builds
  the Node adapter server that `nix/package.nix` packages and runs with Bun.
  `nix/module.nix` is `services.twitch-multichat`: the app on a unix socket,
  optionally an nginx virtual host that serves the package's `public`
  directory (static files and prerendered pages) and passes the rest to the
  socket. `nix/test.nix` boots it in a VM:
  `nix build -L .#checks.x86_64-linux.nixos`. It compares a preview image to
  the unit test snapshot byte for byte.
- The service runs without network (`PrivateNetwork`, `AF_UNIX` only). Keep
  the server free of outgoing requests; it only renders pages and preview
  images.
- `bun.nix` (npm dependencies for Nix) is generated from `bun.lock` by
  bun2nix: `bun2nix -o bun.nix` in devenv, also run by the git hook and
  `ci`; CI fails if it is stale. bun2nix is pinned to the commit of
  nix-community/bun2nix#110 (bun.lock version 2) in `flake.nix` and
  `devenv.yaml`; switch both to a release once it includes it.
- Flakes only see files tracked by git: `git add -N` new files before
  `nix build`.
- Packaging pitfalls, all handled in `nix/package.nix`:
  - `bun install` from bun2nix's cache ignores `patchedDependencies`; the
    patches are applied to the cache instead (`patchedDependenciesToOverrides`).
    Without them the preview image is empty (the ultrahtml bug under Bun).
  - sharp's prebuilt binaries (enhanced-img, build time only) need
    `libstdc++`, provided via `LD_LIBRARY_PATH` in the build.
  - sveltekit-og loads resvg's `.wasm` from `node_modules` at runtime and
    fetches it from unpkg when it is missing, so the package ships
    `node_modules/@resvg/resvg-wasm`.
- Bun as the runtime of adapter-node:
  - `listen({ path, host, port })` throws in Bun when a socket path comes
    with a host ("Cannot specify both hostname and unix"); the module sets
    `HOST` and `PORT` to empty strings.
  - systemd socket activation doesn't work: Bun's `listen({ fd: 3 })` reports
    listening but never answers. The service creates its socket itself.
  - Unix socket paths are limited to 108 bytes. A longer `SOCKET_PATH` (e.g.
    in a scratch directory) creates a socket that nobody can connect to.
- nginx: store files all have mtime 1, so nginx's `Last-Modified` and ETag
  (mtime and size) can't tell versions apart. The virtual host disables
  ETags and `If-Modified-Since` handling.

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
- Components are compiled for the browser. Import
  `<path>.svelte?server` for a `svelte/server` build, e.g. via
  `mock.module` for code that server-renders a component.
- Image snapshots: `expectImageSnapshot()` from `test/imageSnapshot.ts`
  compares a PNG to `__snapshots__/<name>.png` with exact colours. Run with
  `UPDATE_SNAPSHOTS=1` to accept changes and look at the new images; a
  mismatch writes `<name>.actual.png` and `<name>.diff.png` next to it.
- Timers: `jest.useFakeTimers()` / `jest.advanceTimersByTime()` from
  `bun:test`.
- `mock()` from `bun:test` does not return the instance when called with
  `new`. Use small stub classes for constructors (see
  `service-worker/index.test.ts`, which also shows `mock.module` for workbox
  and `$app/*`).
- E2E tests (`e2e/`) use `Bun.WebView` (headless Chromium) and `Bun.serve`.
  They have their own `e2e/bunfig.toml` because the happy-dom preload replaces
  the global `Response` that `Bun.serve` needs.
  - Real builds ("deploys") go to `.e2e/<name>` via `ensureDeploy()` in
    `e2e/deploys.ts`, built once per run and shared between test files. Set
    `E2E_REUSE_BUILD=1` to skip the builds while iterating.
  - The service worker test serves two deploys (`v1`, `v2`) from one origin.
  - `functions-limit.test.ts` serves `v1` like Cloudflare Pages after the
    Functions limit ("fail open": static files only, `404.html` for
    everything else) and checks that chat pages still boot. This relies on
    the adapter's `fallback: "spa"` in `vite.config.ts`.
  - The chat scroll test skips vite: it bundles `e2e/chat-scroll/harness.ts`
    (real components, `FakeChatSource` driven via `window.chat`) with
    `Bun.build` and the Svelte plugin, served inside `src/app.html`. Use
    `view.scroll()` for trusted wheel input and `Input.dispatchTouchEvent`
    for swipes; headless Chrome ignores `Input.synthesizeScrollGesture`.
  - Close views with `view.close()` only. `Bun.WebView.closeAll()` stops the
    shared Chrome, and later views in the same test process then fail with
    "Chrome process closed the pipe" instead of starting a new one.
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
- `CacheFirst` does not store opaque (no-cors) responses, so cross-origin
  images only land in a runtime cache when loaded with
  `crossorigin="anonymous"` (Twitch emotes). That needs CORS headers from the
  CDN; BetterTTV's CDN sends none, its images rely on the HTTP cache
  (180 day `max-age`).
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
