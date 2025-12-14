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
    npm.enable = true;
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
    npm-format = {
      enable = true;
      name = "prettier";
      entry = "npm run format";
      pass_filenames = false;
    };
    npm-lint = {
      enable = true;
      name = "eslint";
      entry = "npm run lint";
      pass_filenames = false;
      after = ["npm-format"];
    };
    npm-check = {
      enable = true;
      name = "svelte-check";
      pass_filenames = false;
      entry = "npm run check";
      after = ["npm-lint"];
    };
    npm-test = {
      enable = true;
      name = "vitest";
      pass_filenames = false;
      entry = "npm run test";
      after = ["npm-check"];
    };
  };
  devcontainer.enable = true;
}
