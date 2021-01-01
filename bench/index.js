const { WasmHighwayHash, HighwayHash } = require("..");
const { asBuffer } = require("highwayhash");
const { assert } = require("console");

const key = Buffer.alloc(32, 1);

function timeIt(name, fn) {
  const start = process.hrtime.bigint();
  const res = fn();
  const end = process.hrtime.bigint();
  console.log(`${name} ${(Number(end - start) * 1e-6).toFixed(2)}ms`);
  return res;
}

(async function () {
  console.time("initialize wasm");
  const wasmMod = await WasmHighwayHash.loadModule();
  console.timeLog("initialize wasm");

  console.time("initialize native");
  const nativeMod = await HighwayHash.loadModule();
  console.timeLog("initialize native");

  assert(
    wasmMod.name != nativeMod.name,
    "expected both wasm and native module to load"
  );

  const inputs = [
    1,
    10,
    100,
    1000,
    10000,
    100000,
    1000000,
    10000000,
    100000000,
  ];

  // first: a warmup round
  for (let index = 0; index < inputs.length; index++) {
    console.log(`hashing data of size: ${inputs[index]}`);
    const data = Buffer.alloc(inputs[index], 1);
    const native = nativeMod.create(key);
    native.append(data);
    native.finalize64();

    const wasm = wasmMod.create(key);
    wasm.append(data);
    wasm.finalize64();

    asBuffer(key, data);
  }

  // then record actual timings
  for (let index = 0; index < inputs.length; index++) {
    console.log(`hashing data of size: ${inputs[index]}`);
    const data = Buffer.alloc(inputs[index], 1);

    const nativeRes = timeIt("hash native", () => {
      const native = nativeMod.create(key);
      native.append(data);
      return native.finalize64();
    });

    const wasmRes = timeIt("hash wasm", () => {
      const wasm = wasmMod.create(key);
      wasm.append(data);
      return wasm.finalize64();
    });

    const thirdRes = timeIt("3rd party", () => {
      return asBuffer(key, data);
    });

    assert(Buffer.from(nativeRes.buffer).equals(wasmRes), "hash modules agree");
    assert(
      Buffer.from(nativeRes.buffer).equals(thirdRes),
      "hash packages agree"
    );
    console.log();
  }
})();
