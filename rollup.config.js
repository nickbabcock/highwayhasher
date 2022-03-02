import { wasm } from "@rollup/plugin-wasm";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";
import path from "path";
import { execSync } from "child_process";
import os from "os";
import fs from "fs";

const rolls = (fmt, platform) => ({
  input: `src/main/index_${platform}.ts`,
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
        const removeImport = (fp) => {
          const data = fs.readFileSync(path.resolve(fp), "utf8");
          fs.writeFileSync(
            path.resolve(fp),
            data.replace("import.meta.url", "input")
          );
        };

        removeImport("src/main/wasm/highwayhasher_wasm.js");
        removeImport("src/main/wasm-simd/highwayhasher_wasm.js");
        if (fmt === "cjs" && platform === "node") {
          fs.mkdirSync(path.resolve(__dirname, "dist/node"), { recursive: true });
          distributeSharedNode();

          // Copy over our wasm bundles to each out directory as a known name to
          // downstream users so that they can access the wasm payloads directly
          // as needed.
          fs.copyFileSync(
            "src/main/wasm/highwayhasher_wasm_bg.wasm",
            "dist/highwayhasher_wasm_bg.wasm"
          );
          fs.copyFileSync(
            "src/main/wasm-simd/highwayhasher_wasm_bg.wasm",
            "dist/highwayhasher_wasm_simd_bg.wasm"
          );
        }
      },
    },
  ],
});

const releaseArtifact = (app) => {
  switch (os.platform()) {
    case "darwin":
      return `lib${app}.dylib`;
    case "win32":
      return `${app}.dll`;
    default:
      return `lib${app}.so`;
  }
};

const defaultTriple = () => {
  const out = execSync("rustup show active-toolchain").toString("utf-8");
  const prec = out.split(" ", 2)[0];
  return prec.substring(prec.indexOf("-") + 1);
};

const distributeSharedNode = () => {
  const artifact = releaseArtifact(pkg.name);
  const input = path.resolve(
    __dirname,
    `target/${process.env.TARGET || ""}/release/${artifact}`
  );
  const output = path.resolve(
    __dirname,
    `dist/node/${pkg.name}-${process.env.TARGET || defaultTriple()}.node`
  );
  fs.copyFileSync(input, output);
};

export default [
  rolls("cjs", "node"),
  rolls("es", "node"),
  rolls("cjs", "browser"),
  rolls("es", "browser"),
];
