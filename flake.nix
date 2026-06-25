{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        devPackages = with pkgs; [
          git
          zlib
          stdenv.cc.cc.lib
          oxlint
          bash
          typescript
          typescript-language-server
          nodejs
        ];
      in
        {

          devShells.default =
            (pkgs.buildFHSEnv {
              name = "electron-dev-fhs";
              targetPkgs = pkgs: devPackages;
              profile = ''
                export PATH=$HOME/.npm_global/bin:$PATH
                npm config set prefix '~/.npm_global'
              '';
            }).env;
        });
}
