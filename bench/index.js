const { WasmHighwayHash, HighwayHash } = require("highwayhasher");
const { asBuffer } = require("highwayhash");
const { assert } = require("console");

const key = Buffer.alloc(32, 1);

function timeIt(name, dataLen, fn) {
  const iterations = Math.min(Math.max(1000000 / dataLen, 10), 10000);
  const start = process.hrtime.bigint();
  let res;
  for (let i = 0; i < iterations; i++) {
    res = fn();
  }
  const end = process.hrtime.bigint();
  const totalNs = Number(end - start);
  const bytesPerNs = (dataLen * iterations) / totalNs;
  const mbPerS = (bytesPerNs * 1e9) / 1000000;
  console.log(`${name} ${mbPerS.toFixed(2)} MB/s`);
  return res;
}

(async function () {
  console.time("initialize wasm");
  const wasmMod = await WasmHighwayHash.loadModule({ simd: false });
  console.timeLog("initialize wasm");

  console.time("initialize wasm simd");
  const wasmSimdMod = await WasmHighwayHash.loadModule({ simd: true });
  console.timeLog("initialize wasm simd");

  console.time("initialize native");
  const nativeMod = await HighwayHash.loadModule();
  console.timeLog("initialize native");

  assert(
    WasmHighwayHash.name != HighwayHash.name,
    "expected both wasm and native module to load"
  );

  const inputs = [
    1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000,
  ];

  // first: a warmup round
  for (let index = 0; index < inputs.length; index++) {
    const data = Buffer.alloc(inputs[index], 1);
    for (let mod of [nativeMod, wasmMod, wasmSimdMod]) {
      const hasher = mod.create(key);
      hasher.append(data);
      hasher.finalize64();
    }

    asBuffer(key, data);
  }

  console.log();

  // then record actual timings
  for (let index = 0; index < inputs.length; index++) {
    console.log(`hashing data of size: ${inputs[index]}`);
    const data = Buffer.alloc(inputs[index], 1);

    const nativeRes = timeIt("highwayhasher native", data.length, () => {
      return nativeMod.hash64(key, data);
    });

    timeIt("highwayhasher native streaming", data.length, () => {
      const native = nativeMod.create(key);
      native.append(data);
      return native.finalize64();
    });

    const wasmSimd = timeIt("highwayhasher wasm simd", data.length, () => {
      return wasmSimdMod.hash64(key, data);
    });

    const wasmRes = timeIt("highwayhasher wasm scalar", data.length, () => {
      return wasmMod.hash64(key, data);
    });

    timeIt("highwayhasher wasm scalar streaming", data.length, () => {
      const wasm = wasmMod.create(key);
      wasm.append(data);
      return wasm.finalize64();
    });

    const thirdRes = timeIt("highwayhash (3rd party)", data.length, () => {
      return asBuffer(key, data);
    });

    assert(Buffer.from(nativeRes.buffer).equals(wasmRes), "hash modules agree");
    assert(Buffer.from(wasmSimd.buffer).equals(wasmRes), "hash modules agree");
    assert(
      Buffer.from(nativeRes.buffer).equals(thirdRes),
      "hash packages agree"
    );
    console.log();
  }
})();
