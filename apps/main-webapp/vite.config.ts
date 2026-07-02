/// <reference types='vitest' />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: "../../node_modules/.vite/apps/main-webapp",
  server: {
    port: 4200,
    host: "localhost",
    // Proxy API requests to backend
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4200,
    host: "localhost",
  },
  plugins: [
    react(),
    viteTsconfigPaths({
      root: "../../",
    }),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./src/app/shared"),
      "@store-credit-platform/web-components": path.resolve(
        __dirname,
        "../../libs/web-components/src",
      ),
    },
  },
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],iai
  // },
  build: {
    outDir: "../../dist/apps/main-webapp",
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
