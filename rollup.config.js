import dts from "rollup-plugin-dts";
import commonjs from "@rollup/plugin-commonjs";

export default [
  {
    input: "build/index.js",
    output: {
      file: "dist/index.js",
    },
    plugins: [commonjs()],
  },
  {
    input: "build/index.d.ts",
    output: {
      file: "dist/index.d.ts",
    },
    plugins: [dts(), commonjs()],
  },
];
