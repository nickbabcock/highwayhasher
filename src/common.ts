export function validKey(key: Uint8Array | null | undefined): Uint8Array {
  if (key && key.length != 32) {
    throw new Error("expected the key buffer to be 32 bytes long");
  }

  return key || new Uint8Array();
}
