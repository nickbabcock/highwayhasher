use common::{data_to_lanes, u64_slice_to_u8};
use highway::{HighwayHash, HighwayHasher, Key};
use napi::bindgen_prelude::Buffer;
use napi_derive::*;

#[napi(js_name = "HighwayHasher")]
pub struct NativeHasher {
    internal: HighwayHasher,
}

#[napi]
impl NativeHasher {
    #[napi(constructor)]
    pub fn new(key_data: Buffer) -> Self {
        let key = create_key(&key_data);
        let hasher = HighwayHasher::new(key);
        Self { internal: hasher }
    }

    #[napi]
    pub fn append(&mut self, data: Buffer) {
        self.internal.append(&data)
    }

    #[napi]
    pub fn finalize64(&self) -> Buffer {
        let result = self.internal.clone().finalize64();
        let out = result.to_le_bytes().to_vec();
        out.into()
    }

    #[napi]
    pub fn finalize128(&self) -> Buffer {
        let result = self.internal.clone().finalize128();
        let mut out = vec![0u8; std::mem::size_of::<u64>() * 2];
        u64_slice_to_u8(&mut out, &result);
        out.into()
    }

    #[napi]
    pub fn finalize256(&self) -> Buffer {
        let result = self.internal.clone().finalize256();
        let mut out = vec![0u8; std::mem::size_of::<u64>() * 4];
        u64_slice_to_u8(&mut out, &result);
        out.into()
    }
}

#[napi]
pub fn hash64(key_data: Buffer, data: Buffer) -> Buffer {
    let mut hasher = NativeHasher::new(key_data);
    hasher.append(data);
    hasher.finalize64()
}

#[napi]
pub fn hash128(key_data: Buffer, data: Buffer) -> Buffer {
    let mut hasher = NativeHasher::new(key_data);
    hasher.append(data);
    hasher.finalize128()
}

#[napi]
pub fn hash256(key_data: Buffer, data: Buffer) -> Buffer {
    let mut hasher = NativeHasher::new(key_data);
    hasher.append(data);
    hasher.finalize256()
}

fn create_key(data: &[u8]) -> Key {
    if data.is_empty() {
        Key::default()
    } else {
        Key(data_to_lanes(data))
    }
}
