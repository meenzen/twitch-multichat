{
  pkgs,
  lib,
  config,
  inputs,
  ...
}: let
  # Browser for the e2e tests (Bun.WebView). An LD_LIBRARY_PATH inherited from
  # the host can inject libraries built against a newer glibc, so drop it.
  # --no-sandbox: Ubuntu 24.04 runners block the user namespaces Chromium's
  # sandbox needs; it only ever loads the locally served test build.
  e2eChromium = pkgs.writeShellScript "e2e-chromium" ''
    unset LD_LIBRARY_PATH
    exec ${pkgs.chromium}/bin/chromium --no-sandbox "$@"
  '';
in {
  packages = [pkgs.git];
  env.BUN_CHROME_PATH = lib.mkIf pkgs.stdenv.isLinux "${e2eChromium}";
  languages.javascript = {
    enable = true;
    bun.enable = true;
  };
  scripts.ci.exec = ''
    set -euo pipefail
    bun install
    bun run format
    bun run lint
    bun run check
    bun run test
    bun run build
    bun run test:e2e
  '';
  git-hooks.hooks = {
    alejandra.enable = true;
    actionlint.enable = true;
    check-added-large-files.enable = true;
    end-of-file-fixer.enable = true;
    fix-byte-order-marker.enable = true;
    forbid-new-submodules.enable = true;
    nil.enable = true;
    trim-trailing-whitespace.enable = true;
    ci = {
      enable = true;
      entry = "ci";
      pass_filenames = false;
    };
  };
}
