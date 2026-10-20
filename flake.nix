{
  description = "Twitch Multichat: several Twitch chats in one view";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # bun.lock version 2 support (nix-community/bun2nix#110), until it is
    # released
    bun2nix = {
      url = "github:Mic92/bun2nix/0456acb1b7394fc14c414b056aa889df5124943a";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    bun2nix,
  }: let
    inherit (nixpkgs) lib;
    systems = ["x86_64-linux" "aarch64-linux"];
    forAllSystems = f: lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
  in {
    packages = forAllSystems (pkgs: {
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.twitch-multichat;
      twitch-multichat = pkgs.callPackage ./nix/package.nix {
        bun2nix = bun2nix.packages.${pkgs.stdenv.hostPlatform.system}.default;
        version = self.shortRev or self.dirtyShortRev or "dirty";
      };
    });

    # services.twitch-multichat, see nix/module.nix
    nixosModules.default = {
      lib,
      pkgs,
      ...
    }: {
      imports = [./nix/module.nix];
      services.twitch-multichat.package =
        lib.mkDefault self.packages.${pkgs.stdenv.hostPlatform.system}.default;
    };

    checks = forAllSystems (pkgs: {
      package = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      nixos = pkgs.testers.runNixOSTest (import ./nix/test.nix {
        nixosModule = self.nixosModules.default;
      });
    });

    formatter = forAllSystems (pkgs: pkgs.alejandra);
  };
}
