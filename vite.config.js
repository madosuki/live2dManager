import { defineConfig } from "vite"

export default defineConfig (() => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@CubismWebFramework': path.resolve(__dirname, 'CubismWebFramework/src')
      }
    }
  }
});
