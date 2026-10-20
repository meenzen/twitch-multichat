# The development shell: `nix develop`, or `nix develop -c <command>`.
{
  lib,
  stdenv,
  mkShellNoCC,
  writeShellApplication,
  writeShellScript,
  bun,
  nodejs-slim,
  git,
  chromium,
  bun2nix,
  hooks,
}: let
  # Browser for the e2e tests (Bun.WebView). An LD_LIBRARY_PATH inherited from
  # the host can inject libraries built against a newer glibc, so drop it.
  # --no-sandbox: Ubuntu 24.04 runners block the user namespaces Chromium's
  # sandbox needs; it only ever loads the locally served test build.
  e2eChromium = writeShellScript "e2e-chromium" ''
    unset LD_LIBRARY_PATH
    exec ${lib.getExe chromium} --no-sandbox "$@"
  '';

  # the full pipeline, what GitHub Actions runs
  ci = writeShellApplication {
    name = "ci";
    runtimeInputs = [bun bun2nix nodejs-slim git];
    text = ''
      bun install
      bun2nix -o bun.nix
      bun run format
      bun run lint
      bun run check
      bun run test
      bun run build
      bun run test:e2e
    '';
  };
in
  mkShellNoCC {
    packages = [bun nodejs-slim git bun2nix ci] ++ hooks.enabledPackages;
    env = lib.optionalAttrs stdenv.hostPlatform.isLinux {
      BUN_CHROME_PATH = e2eChromium;
    };
    # installs the git hooks
    inherit (hooks) shellHook;
  }
