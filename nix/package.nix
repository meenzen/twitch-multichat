# The app as a Node-adapter server, run with Bun. The NixOS module
# (module.nix) runs it on a unix socket behind nginx.
{
  lib,
  stdenv,
  bun,
  bun2nix,
  makeWrapper,
  version,
}: let
  root = ../.;
  # `bun install` from bun2nix's cache skips package.json's
  # patchedDependencies, so the cache holds the patched packages instead
  patchedDependencies =
    lib.mapAttrs (_: path: root + "/${path}")
    ((lib.importJSON ../package.json).patchedDependencies or {});
in
  stdenv.mkDerivation (finalAttrs: {
    pname = "twitch-multichat";
    inherit version;

    # only what the build reads, so tests, CI and docs don't cause rebuilds
    src = lib.fileset.toSource {
      inherit root;
      fileset = lib.fileset.unions [
        ../package.json
        ../bun.lock
        ../patches
        ../src
        ../static
        ../tsconfig.json
        ../vite.config.ts
      ];
    };

    nativeBuildInputs = [
      bun2nix.hook
      makeWrapper
    ];

    # generated from bun.lock by bun2nix (the git hook and `ci` keep it
    # current)
    bunDeps = bun2nix.fetchBunDeps {
      bunNix = ../bun.nix;
      overrides = bun2nix.patchedDependenciesToOverrides {
        inherit patchedDependencies;
      };
    };
    # the layout `bun install` uses in development
    bunInstallFlags = ["--linker=hoisted"];

    dontUseBunBuild = true;
    dontUseBunCheck = true;
    dontUseBunInstall = true;

    # sharp's prebuilt binaries (image processing in the build) need
    # libstdc++, which Bun doesn't load
    buildPhase = ''
      runHook preBuild
      export LD_LIBRARY_PATH=${lib.makeLibraryPath [stdenv.cc.cc.lib]}
      ADAPTER=node bun --bun run build
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      app=$out/lib/twitch-multichat
      mkdir -p $app
      cp -r build/. $app/

      # sveltekit-og reads resvg's WebAssembly from node_modules at runtime
      # and fetches it from unpkg if it is missing
      mkdir -p $app/node_modules/@resvg
      cp -r node_modules/@resvg/resvg-wasm $app/node_modules/@resvg/

      # static files and prerendered pages in one directory, for nginx
      public=$out/share/twitch-multichat/public
      mkdir -p $public
      ln -s $app/client/* $app/prerendered/* $public/

      makeWrapper ${lib.getExe bun} $out/bin/twitch-multichat \
        --add-flags $app/index.js

      runHook postInstall
    '';

    # served by nginx directly, see module.nix
    passthru.public = "${finalAttrs.finalPackage}/share/twitch-multichat/public";

    meta = {
      description = "Merges several Twitch chats into one view";
      homepage = "https://multichat.mnzn.dev";
      license = lib.licenses.mit;
      mainProgram = "twitch-multichat";
      platforms = lib.platforms.linux;
    };
  })
