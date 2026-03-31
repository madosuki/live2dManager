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
        nodejsVersion = "v24.11.1";
        nodejsSrc = pkgs.fetchurl {
            url = "https://nodejs.org/dist/${nodejsVersion}/node-${nodejsVersion}-linux-x64.tar.xz";
            sha256 = "60e3b0a8500819514aca603487c254298cd776de0698d3cd08f11dba5b8289a8";
        };
        customNodejs = pkgs.stdenv.mkDerivation {
            inherit nodejsVersion;
            pname = "node-${nodejsVersion}-unofficial";
            version = nodejsVersion;

            src = nodejsSrc;

            unpackPhase = ''
                  tar xf $src

                  # get extracted directory
                  sourceRoot=$(find . -maxdepth 1 -type d -name "node-${nodejsVersion}-linux-x64")
                  echo "Source root is: $sourceRoot"
            '';

            installPhase = ''
              mkdir -p $out/bin $out/lib
              cp -r ./* $out/
            '';
          };

        devPackages = with pkgs; [
          git
          zlib
          stdenv.cc.cc.lib
          customNodejs
          oxlint
          bash
          typescript
          typescript-language-server
        ];
      in
        {

          devShells.default =
            (pkgs.buildFHSEnv {
              name = "electron-dev-fhs";
              targetPkgs = pkgs: devPackages;
              profile = ''
                export PATH=${customNodejs}/bin:$PATH
                export PATH=$HOME/.npm_global/bin:$PATH
                npm config set prefix '~/.npm_global'
                echo "Custom Node.js environment loaded (version: $(${customNodejs}/bin/node -v))"
              '';
            }).env;
        });
}
