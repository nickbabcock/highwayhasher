const { HighwayHash, WasmHighwayHash } = require("..");

// ref: https://github.com/iliakan/detect-node
function isNode() {
  return (
    Object.prototype.toString.call(
      typeof process !== "undefined" ? process : 0
    ) === "[object process]"
  );
}

const keyData = Uint8Array.from([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
]);

it("choose hash implementation depending on platform", () => {
  if (isNode()) {
    expect(HighwayHash.name).toEqual("NativeHighwayHash");
  } else {
    expect(HighwayHash.name).toEqual("WasmHighwayHash");
  }
});

// Can't use `describe.each` as that is not implemented by karmatic
const parameters = [
  ["impl", HighwayHash],
  ["wasm", WasmHighwayHash],
];

for (let i = 0; i < parameters.length; i++) {
  const name = parameters[i][0];
  const Hash = parameters[i][1];
  describe(`${name} incremental hash`, () => {
    it("load and create hash", async () => {
      const mod = await Hash.loadModule();
      const hash = mod.create();
      let out = hash.finalize64();
      let expected = Uint8Array.from([105, 68, 213, 185, 117, 218, 53, 112]);
      expect(out).toEqual(expected);
    });

    it("keyless and dataless 64bit", async () => {
      const hash = await Hash.load();
      let out = hash.finalize64();
      let expected = Uint8Array.from([105, 68, 213, 185, 117, 218, 53, 112]);
      expect(out).toEqual(expected);
    });

    it("dataless 64bit", async () => {
      const hash = await Hash.load(keyData);
      let out = hash.finalize64();
      let expected = Uint8Array.from([83, 110, 194, 34, 222, 86, 122, 144]);
      expect(out).toEqual(expected);
    });

    it("dataless 128bit", async () => {
      const hash = await Hash.load(keyData);
      let out = hash.finalize128();
      let expected = Uint8Array.from([
        199,
        254,
        143,
        157,
        143,
        38,
        237,
        15,
        111,
        62,
        9,
        127,
        118,
        94,
        86,
        51,
      ]);
      expect(out).toEqual(expected);
    });

    it("dataless 256bit", async () => {
      const hash = await Hash.load(keyData);
      let out = hash.finalize256();
      let expected = Uint8Array.from([
        245,
        116,
        200,
        194,
        42,
        72,
        68,
        221,
        31,
        53,
        199,
        19,
        115,
        1,
        70,
        217,
        255,
        20,
        135,
        185,
        204,
        190,
        174,
        179,
        244,
        29,
        117,
        69,
        49,
        35,
        218,
        65,
      ]);
      expect(out).toEqual(expected);
    });

    it("64bit", async () => {
      const hash = await Hash.load(keyData);
      hash.append(Uint8Array.from([0]));
      let out = hash.finalize64();
      let expected = Uint8Array.from([120, 221, 205, 199, 170, 67, 171, 126]);
      expect(out).toEqual(expected);
    });

    it("128bit", async () => {
      const hash = await Hash.load(keyData);
      hash.append(Uint8Array.from([0]));
      let out = hash.finalize128();
      let expected = Uint8Array.from([
        168,
        231,
        129,
        54,
        137,
        168,
        176,
        214,
        180,
        220,
        156,
        235,
        249,
        29,
        41,
        220,
      ]);
      expect(out).toEqual(expected);
    });

    it("256bit", async () => {
      const hash = await Hash.load(keyData);
      hash.append(Uint8Array.from([0]));
      let out = hash.finalize256();
      let expected = Uint8Array.from([
        84,
        130,
        95,
        228,
        188,
        65,
        185,
        237,
        15,
        198,
        202,
        61,
        239,
        68,
        13,
        226,
        71,
        74,
        50,
        203,
        155,
        27,
        101,
        114,
        132,
        228,
        117,
        178,
        76,
        98,
        115,
        32,
      ]);
      expect(out).toEqual(expected);
    });
  });
}

for (let i = 0; i < parameters.length; i++) {
  const name = parameters[i][0];
  const Hash = parameters[i][1];
  describe(`${name} hash`, () => {
    it("64bit equivalency", async () => {
      const hash1 = await Hash.loadModule();
      const out1 = hash1.hash64(keyData, Uint8Array.from([0]));
      const hash2 = hash1.create(keyData);
      hash2.append(Uint8Array.from([0]));
      const out2 = hash2.finalize64();
      expect(out1).toEqual(out2);
    });

    it("128bit equivalency", async () => {
      const hash1 = await Hash.loadModule();
      const out1 = hash1.hash128(keyData, Uint8Array.from([0]));
      const hash2 = hash1.create(keyData);
      hash2.append(Uint8Array.from([0]));
      const out2 = hash2.finalize128();
      expect(out1).toEqual(out2);
    });

    it("256bit equivalency", async () => {
      const hash1 = await Hash.loadModule();
      const out1 = hash1.hash256(keyData, Uint8Array.from([0]));
      const hash2 = hash1.create(keyData);
      hash2.append(Uint8Array.from([0]));
      const out2 = hash2.finalize256();
      expect(out1).toEqual(out2);
    });
  });
}
