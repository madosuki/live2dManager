import path from "path";
import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig (() => {
  return {
    root: path.resolve(__dirname, "src"),
    publicDir: path.resolve(__dirname, "public"),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@framework": path.resolve(__dirname, "CubismSdkForWeb/src"),
        "@MotionSyncFramework": path.resolve(__dirname, "CubismWebMotionSyncComponents/Framework/src")
      }
    },
    build: {
      target: "es6",
      outDir: path.resolve(__dirname, "dist"),
      sourcemap: false,
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
