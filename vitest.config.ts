import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // build: {
  //   watch: {
  //     exclude: [
  //       "**/node_modules/**",
  //       "**/.storybook/**",
  //       "**/public/**",
  //       "**/config/**",
  //     ],
  //   },
  // },
  server: {
    watch: {
      followSymlinks: false,
    },
  },
  test: {
    exclude: ["config/**", "public/**"],
    execArgv: ["--expose-gc"],
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
          setupFiles: ["vitest.setup.ts"],
          isolate: false,
          typecheck: {
            enabled: true,
            include: ["src/**/*.test.ts"],
          },
        },
      },
    ],
  },
  cacheDir: undefined,
});
