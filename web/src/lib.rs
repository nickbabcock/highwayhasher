use highway::{HighwayBuilder, HighwayHash, Key};
use common::{data_to_lanes, u64_slice_to_u8};
use wasm_bindgen::prelude::*;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct WasmHighway {
    inner: HighwayBuilder,
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
            inner: HighwayBuilder::new(key),
        }
    }

    #[wasm_bindgen]
    pub fn append(&mut self, data: &[u8]) {
        self.inner.append(data)
    }

    #[wasm_bindgen]
    pub fn finalize64(self) -> Vec<u8> {
        self.inner.finalize64().to_le_bytes().to_vec()
    }

    #[wasm_bindgen]
    pub fn finalize128(self) -> Vec<u8> {
        u64_slice_to_u8(&self.inner.finalize128())
    }

    #[wasm_bindgen]
    pub fn finalize256(self) -> Vec<u8> {
        u64_slice_to_u8(&self.inner.finalize256())
    }
}
