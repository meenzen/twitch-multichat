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
  git-hooks.hooks = {
    alejandra.enable = true;
    actionlint.enable = true;
    check-added-large-files.enable = true;
    end-of-file-fixer.enable = true;
    fix-byte-order-marker.enable = true;
    forbid-new-submodules.enable = true;
    nil.enable = true;
    trim-trailing-whitespace.enable = true;
    bun-format = {
      enable = true;
      name = "prettier";
      entry = "bun run format";
      pass_filenames = false;
    };
    bun-lint = {
      enable = true;
      name = "eslint";
      entry = "bun run lint";
      pass_filenames = false;
      after = ["bun-format"];
    };
    bun-check = {
      enable = true;
      name = "svelte-check";
      pass_filenames = false;
      entry = "bun run check";
      after = ["bun-lint"];
    };
    bun-test = {
      enable = true;
      name = "vitest";
      pass_filenames = false;
      entry = "bun run test";
      after = ["bun-check"];
    };
  };
  devcontainer.enable = true;
}
