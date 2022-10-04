#![no_std]

use common::{data_to_lanes, u64_slice_to_u8};
use highway::{HighwayHash, HighwayHasher, Key};
use wasm_bindgen::prelude::*;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct WasmHighway {
    inner: HighwayHasher,
}

#[wasm_bindgen]
impl WasmHighway {
    #[wasm_bindgen(constructor)]
    pub fn new(key_data: &[u8]) -> Self {
        // We'll have the JS wrapper validate that the data is long enough
        let key = if key_data.is_empty() {
            Key::default()
        } else {
            Key(data_to_lanes(key_data))
        };

        WasmHighway {
            inner: HighwayHasher::new(key)
        }
    }

    #[wasm_bindgen]
    pub fn append(&mut self, data: &[u8]) {
        self.inner.append(data)
    }

    #[wasm_bindgen]
    pub fn finalize64(self) -> js_sys::Uint8Array {
        let res = self.inner.finalize64().to_le_bytes();
        (&res[..]).into()
    }

    #[wasm_bindgen]
    pub fn finalize128(self) -> js_sys::Uint8Array {
        let hash = self.inner.finalize128();
        let mut bytes = [0u8; 16];
        u64_slice_to_u8(&mut bytes, &hash[..]);
        (&bytes[..]).into()
    }

    #[wasm_bindgen]
    pub fn finalize256(self) -> js_sys::Uint8Array {
        let hash = self.inner.finalize256();
        let mut bytes = [0u8; 32];
        u64_slice_to_u8(&mut bytes, &hash[..]);
        (&bytes[..]).into()
    }
}
