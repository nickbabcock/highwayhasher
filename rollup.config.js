import typescript from "@rollup/plugin-typescript";
import { wasm } from "@rollup/plugin-wasm";
import pkg from "./package.json";
import path from "path";
import { execSync } from "child_process";
import os from "os";
import fs from "fs";

const outdir = (fmt, platform, inline) => {
  if (platform == "node") {
    return `node`;
  } else {
    return `${platform}${inline ? `-${inline}` : ""}/${fmt}`;
  }
};

const rolls = (fmt, platform, inline) => ({
  input: `src/main/index_${platform}${inline ? `_${inline}` : ""}.ts`,
  output: {
    dir: "dist",
    format: fmt,
    entryFileNames: `${outdir(fmt, platform, inline)}/[name].${
      fmt === "cjs" ? "cjs" : "js"
    }`,
    name: pkg.name,
  },
  external: ["os"],
  plugins: [
    inline !== "slim" &&
      wasm(
        platform === "node"
          ? { maxFileSize: 0, targetEnv: "node", publicPath: "../" }
          : { targetEnv: "auto-inline" }
      ),
    typescript({
      target: fmt == "es" ? "ES2022" : "ES2017",
      outDir: `dist/${outdir(fmt, platform, inline)}`,
      rootDir: "src",
    }),
    {
      name: "custom",
      resolveImportMeta: () => `""`,
      generateBundle() {
        if (platform === "node") {
          fs.mkdirSync(path.resolve(__dirname, "dist/node"), {
            recursive: true,
          });
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
  rolls("umd", "browser", "fat"),
  rolls("cjs", "node"),
  rolls("cjs", "browser", "fat"),
  rolls("es", "browser", "fat"),
  rolls("cjs", "browser", "slim"),
  rolls("es", "browser", "slim"),
];
