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
  # bun.nix (the npm dependencies for the Nix package) from bun.lock
  bun2nix = inputs.bun2nix.packages.${pkgs.stdenv.hostPlatform.system}.default;
in {
  packages = [pkgs.git bun2nix];
  env.BUN_CHROME_PATH = lib.mkIf pkgs.stdenv.isLinux "${e2eChromium}";
  languages.javascript = {
    enable = true;
    bun.enable = true;
  };
  scripts.ci.exec = ''
    set -euo pipefail
    bun install
    bun2nix -o bun.nix
    bun run format
    bun run lint
    bun run check
    bun run test
    bun run build
    bun run test:e2e
  '';
  git-hooks.hooks = {
    alejandra = {
      enable = true;
      # generated
      excludes = ["^bun\\.nix$"];
    };
    bun2nix = {
      enable = true;
      name = "bun2nix";
      description = "Regenerate bun.nix from bun.lock";
      entry = "${bun2nix}/bin/bun2nix -o bun.nix";
      files = "^(bun\\.lock|bun\\.nix)$";
      pass_filenames = false;
    };
    actionlint.enable = true;
    check-added-large-files.enable = true;
    end-of-file-fixer = {
      enable = true;
      # generated, bun2nix writes no final newline
      excludes = ["^bun\\.nix$"];
    };
    fix-byte-order-marker.enable = true;
    forbid-new-submodules.enable = true;
    nil.enable = true;
    trim-trailing-whitespace.enable = true;
  };
}
