import babel from "rollup-plugin-babel";
import nodeResolve from "rollup-plugin-node-resolve";
import pluginJson from "rollup-plugin-json";
import path from "path";

const PACKAGE_ROOT_PATH = process.cwd();
const PKG_JSON = require(path.join(PACKAGE_ROOT_PATH, "package.json"));

export default {
  input: "src/index.ts",
  output: {
    file: "dist/" + PKG_JSON.name + ".js",
    format: "iife",
    name: "index",
    sourcemap: true
  },
  plugins: [
    nodeResolve({
      jsnext: true,
      extensions: [".js", ".ts"]
    }),
    babel({
      exclude: "node_modules/**",
      extensions: [".ts", ".js"]
    }),
    pluginJson()
  ]
};
