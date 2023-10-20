import path from "path";
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

export default defineConfig (() => {
  return {
    root: path.resolve(__dirname, "src"),
    publicDir: path.resolve(__dirname, "public"),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@CubismWebFramework": path.resolve(__dirname, "CubismWebFramework/src")
      }
    },
    build: {
      target: "es6",
      outDir: path.resolve(__dirname, "dist"),
      lib: {
        entry: "",
        name: "live2dmanager"
      }
    },
    plugins: [
      typescript()
    ]
  }
});
