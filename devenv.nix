{
  pkgs,
  lib,
  config,
  inputs,
  ...
}: {
  packages = [pkgs.git];
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
