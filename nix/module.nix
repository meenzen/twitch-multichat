# Runs the app on a unix socket, optionally behind an nginx virtual host
# that serves the static files itself. The service needs no network access:
# chat runs in the browser and the server only renders pages and link
# preview images (fonts and logo are bundled).
{
  config,
  lib,
  ...
}: let
  cfg = config.services.twitch-multichat;
  inherit (lib) mkEnableOption mkIf mkMerge mkOption types;
  originPattern = "(https?)://([^/]+)";
  # [protocol host], the forwarded headers the app builds its URL from
  originParts = builtins.match originPattern (toString cfg.origin);
in {
  options.services.twitch-multichat = {
    enable = mkEnableOption "Twitch Multichat";

    package = mkOption {
      type = types.package;
      description = "The twitch-multichat package (the flake's module sets it).";
    };

    group = mkOption {
      type = types.str;
      default = "twitch-multichat";
      description = ''
        Group that owns the socket. Add the reverse proxy's user to it
        (done for nginx when `nginx.enable` is set).
      '';
    };

    socketPath = mkOption {
      type = types.str;
      default = "/run/twitch-multichat/http.sock";
      readOnly = true;
      description = "The unix socket the app listens on, for the reverse proxy.";
    };

    origin = mkOption {
      type = types.nullOr (types.strMatching originPattern);
      default = null;
      example = "https://multichat.example.com";
      description = ''
        Public URL of the site, used for absolute URLs in link previews and
        drawn into the preview image. Required with `nginx.enable`, which
        then passes it to the app instead of the request's Host header (a
        client could put any name there).

        The app takes its URL from the `X-Forwarded-Proto` and
        `X-Forwarded-Host` headers. Without `nginx.enable`, set them in your
        reverse proxy to fixed values, never the client's Host.
      '';
    };

    nginx = {
      enable = mkEnableOption "an nginx virtual host for Twitch Multichat";

      virtualHost = mkOption {
        type = types.str;
        example = "multichat.example.com";
        description = ''
          Name of the nginx virtual host. Settings such as TLS can be added
          through `services.nginx.virtualHosts.<name>`.
        '';
      };
    };
  };

  config = mkIf cfg.enable (mkMerge [
    {
      users.users.twitch-multichat = {
        isSystemUser = true;
        inherit (cfg) group;
      };
      users.groups.${cfg.group} = {};

      systemd.services.twitch-multichat = {
        description = "Twitch Multichat";
        wantedBy = ["multi-user.target"];
        after = ["network.target"];

        environment = {
          SOCKET_PATH = cfg.socketPath;
          # adapter-node passes these to listen() next to the socket path,
          # and Bun rejects a socket path with a host. Empty is ignored.
          HOST = "";
          PORT = "";
          # the request URL's origin, set by the proxy. adapter-node has no
          # ORIGIN variable (it is kit.paths.origin, fixed at build time).
          PROTOCOL_HEADER = "x-forwarded-proto";
          HOST_HEADER = "x-forwarded-host";
          NODE_ENV = "production";
          # Bun's transpiler cache would need a writable home
          BUN_RUNTIME_TRANSPILER_CACHE_PATH = "0";
        };

        serviceConfig = {
          ExecStart = lib.getExe cfg.package;
          Restart = "on-failure";

          # static, not DynamicUser: the proxy has to be a member of the
          # socket's group, which DynamicUser would create itself
          User = "twitch-multichat";
          Group = cfg.group;
          RuntimeDirectory = "twitch-multichat";
          RuntimeDirectoryMode = "0750";
          # socket: read/write for the group
          UMask = "0007";

          # no network at all, the socket lives in the file system
          PrivateNetwork = true;
          IPAddressDeny = "any";
          RestrictAddressFamilies = ["AF_UNIX"];

          CapabilityBoundingSet = "";
          AmbientCapabilities = "";
          NoNewPrivileges = true;
          PrivateUsers = true;
          PrivateTmp = true;
          PrivateDevices = true;
          DevicePolicy = "closed";
          ProtectSystem = "strict";
          ProtectHome = true;
          ProtectProc = "invisible";
          ProcSubset = "pid";
          ProtectClock = true;
          ProtectHostname = true;
          ProtectKernelLogs = true;
          ProtectKernelModules = true;
          ProtectKernelTunables = true;
          ProtectControlGroups = true;
          RestrictNamespaces = true;
          RestrictRealtime = true;
          RestrictSUIDSGID = true;
          RemoveIPC = true;
          LockPersonality = true;
          KeyringMode = "private";
          SystemCallArchitectures = "native";
          SystemCallFilter = ["@system-service" "~@privileged" "~@resources"];
          # not MemoryDenyWriteExecute: JavaScriptCore's JIT needs it
        };
      };
    }

    (mkIf cfg.nginx.enable {
      assertions = [
        {
          assertion = cfg.origin != null;
          message = ''
            services.twitch-multichat.origin must be set to the site's public
            URL, e.g. "https://multichat.example.com". Taking it from the
            Host header would let clients choose the URLs in link previews.
          '';
        }
      ];

      users.users.${config.services.nginx.user}.extraGroups = [cfg.group];

      services.nginx = {
        enable = true;
        virtualHosts.${cfg.nginx.virtualHost} = {
          # the build's static files and prerendered pages (landing page,
          # robots.txt, sitemap.xml); everything else goes to the app
          root = cfg.package.public;
          extraConfig = ''
            gzip_static on;
            # store files all have the same modification time, so
            # Last-Modified and nginx's ETag (time and size) can't tell
            # versions apart: never answer 304 based on them
            etag off;
            if_modified_since off;
          '';
          locations = {
            "/" = {
              tryFiles = "$uri $uri/index.html @app";
              extraConfig = ''
                add_header Cache-Control "no-cache";
              '';
            };
            # hashed build output
            "/_app/immutable/" = {
              tryFiles = "$uri =404";
              extraConfig = ''
                add_header Cache-Control "public, max-age=31536000, immutable";
              '';
            };
            "@app" = {
              proxyPass = "http://unix:${cfg.socketPath}";
              # only the headers the app reads, fixed to `origin`
              recommendedProxySettings = false;
              extraConfig = ''
                proxy_set_header X-Forwarded-Proto ${builtins.elemAt originParts 0};
                proxy_set_header X-Forwarded-Host ${builtins.elemAt originParts 1};
              '';
            };
          };
        };
      };
    })
  ]);
}
