# Git hooks (prek, installed by the dev shell). Quick checks only; `ci`
# runs the full pipeline. `nix flake check` runs them on all files.
{
  pkgs,
  bun2nix,
  src,
}: {
  inherit src;
  package = pkgs.prek;
  hooks = {
    alejandra = {
      enable = true;
      # generated
      excludes = ["^bun\\.nix$"];
    };
    bun2nix = {
      enable = true;
      name = "bun2nix";
      description = "Regenerate bun.nix from bun.lock";
      entry = "${pkgs.lib.getExe bun2nix} -o bun.nix";
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
