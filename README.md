# Twitch Multichat

Combine the chats of several Twitch channels into one view, for collabs,
multi-stream events or just your favourite streamers.

Use it at [multichat.mnzn.dev](https://multichat.mnzn.dev) or host it
yourself. No login needed: chats are read anonymously and read-only.

## Usage

Enter one channel per line on the start page and connect, or let "I'm
feeling lucky" pick a few trending channels. The channels end up in the URL,
so a chat can be bookmarked or shared:

```
https://multichat.mnzn.dev/-/channel1/channel2/channel3
```

Settings are stored in the URL as well, e.g. `?size=large&timestamps=true`.
For OBS and other streaming software, copy the overlay URL from the settings
menu and add it as a browser source.

## Features

- **One merged chat** for any number of channels, each message tagged with
  its channel
- **Hide channels** by clicking them in the top bar, without leaving the chat
- **Emotes** from Twitch, [BetterTTV](https://betterttv.com) and
  [7TV](https://7tv.app), including 7TV's stacked (zero-width) emotes.
  BetterTTV and 7TV emotes update live when a channel changes them, and each
  service can be turned off
- **Moderation**: deleted messages, timeouts, bans and cleared chats are
  removed
- **Clickable links**
- **Stays at the newest message**, and stops scrolling while you scroll up to
  read
- **Reconnects** after network problems or a sleeping device, and marks the
  gap in the chat
- **Settings**: text size, timestamps, channel names, name outlines
- **Overlay mode** with a transparent background and no top bar, for
  streaming software
- **Installable** as an app, updates itself after a new deployment

## Self-hosting on NixOS

The flake provides a package and a NixOS module. The app runs with Bun on a
unix socket behind nginx, which serves the static files itself. The service
needs no network access (it runs without any network interface) and is
sandboxed by systemd.

```nix
{
  inputs.twitch-multichat.url = "github:meenzen/twitch-multichat";

  outputs = { nixpkgs, twitch-multichat, ... }: {
    nixosConfigurations.server = nixpkgs.lib.nixosSystem {
      modules = [
        twitch-multichat.nixosModules.default
        {
          services.twitch-multichat = {
            enable = true;
            nginx = {
              enable = true;
              virtualHost = "multichat.example.com";
            };
          };
          # TLS and anything else for the virtual host
          services.nginx.virtualHosts."multichat.example.com" = {
            enableACME = true;
            forceSSL = true;
          };
        }
      ];
    };
  };
}
```

Without `nginx.enable`, point your reverse proxy at
`services.twitch-multichat.socketPath`, add its user to
`services.twitch-multichat.group` and set `services.twitch-multichat.origin`
(or forward `X-Forwarded-Proto` and `X-Forwarded-Host`).

## Development

Everything runs inside [devenv](https://devenv.sh), which provides Bun and a
Chromium for the browser tests:

```bash
devenv shell -- bun install
devenv shell -- bun run dev      # development server
devenv shell -- ci               # format, lint, check, test, build, e2e
```

`/dev/chat` shows the chat with generated messages, no Twitch connection
needed (e.g. `/dev/chat?rate=10`). The public instance runs on Cloudflare
Pages.

See [AGENTS.md](AGENTS.md) for the code layout, testing and known pitfalls.
