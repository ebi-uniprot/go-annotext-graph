import typescript from 'rollup-plugin-typescript';
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
    sourcemap: true,
    globals: {
        chromatic: 'd3-scale-chromatic',
        d3Select: 'd3-selection',
        force: 'd3-force',
        ellipseForce:'d3-ellipse-force'
    }
  },
  plugins: [
    typescript(),
    nodeResolve({
      jsnext: true,
      extensions: [".js", ".ts"]
    }),
    pluginJson(),
  ]
};
