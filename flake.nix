{
  inputs = {
    nixpkgs.url = "github:cachix/devenv-nixpkgs/rolling";
    devenv.url = "github:cachix/devenv";
  };

  outputs = inputs @ {
    flake-parts,
    nixpkgs,
    ...
  }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        inputs.devenv.flakeModule
      ];
      systems = nixpkgs.lib.systems.flakeExposed;

      perSystem = {
        config,
        self',
        inputs',
        pkgs,
        system,
        ...
      }: {
        # https://devenv.sh/reference/options/
        devenv.shells.default = {
          languages.javascript = {
            enable = true;
            npm.enable = true;
          };
          git-hooks.hooks = {
            alejandra.enable = true;
            actionlint.enable = true;
            end-of-file-fixer.enable = true;
          };
          devcontainer.enable = true;
        };
      };
    };
}
