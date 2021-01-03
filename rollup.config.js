import { wasm } from "@rollup/plugin-wasm";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";
import path from "path";
import fs from "fs";

const rolls = (fmt, platform) => ({
  input: `src/index_${platform}.ts`,
  output: {
    dir: `dist/${platform}/${fmt}`,
    format: fmt,
    name: pkg.name,
  },
  external: ["os"],
  plugins: [
    wasm({ maxFileSize: platform === "node" ? 0 : 100000000 }),
    typescript({ outDir: `dist/${platform}/${fmt}` }),
    {
      name: "custom",
      generateBundle() {
        // Remove the `import` bundler directive that wasm-bindgen spits out as webpack < 5
        // doesn't understand that directive
        const data = fs.readFileSync(
          path.resolve(`src/web/highwayhasher_web.js`),
          "utf8"
        );

        fs.writeFileSync(
          path.resolve(`src/web/highwayhasher_web.js`),
          data.replace("import.meta.url", "input")
        );
      },
    },
  ],
});

export default [
  rolls("cjs", "node"),
  rolls("es", "node"),
  rolls("cjs", "browser"),
  rolls("es", "browser"),
];
