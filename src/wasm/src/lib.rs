#![no_std]
#![allow(clippy::missing_safety_doc)]

//! The Wasm module does not keep hasher state between calls. The JS wrapper
//! owns the state of each hasher as a checkpoint. For each call, the JS
//! wrapper copies the checkpoint into Wasm memory and gives its address. The
//! functions read the checkpoint, do the operation, and write the new
//! checkpoint to the same address when the state changes.

use common::{data_to_lanes, u64_slice_to_u8};
use highway::{HighwayHash, HighwayHasher, Key};
use wasm_bindgen::prelude::*;

/// Size of a hasher checkpoint, in bytes
pub const CHECKPOINT_LEN: usize = 164;

unsafe fn load(state_ptr: *const u8) -> HighwayHasher {
    let mut data = [0u8; CHECKPOINT_LEN];
    unsafe { core::ptr::copy_nonoverlapping(state_ptr, data.as_mut_ptr(), CHECKPOINT_LEN) };
    HighwayHasher::from_checkpoint(data)
}

unsafe fn store(hasher: &HighwayHasher, state_ptr: *mut u8) {
    let data = hasher.checkpoint();
    unsafe { core::ptr::copy_nonoverlapping(data.as_ptr(), state_ptr, CHECKPOINT_LEN) };
}

#[wasm_bindgen]
pub fn checkpoint_len() -> usize {
    CHECKPOINT_LEN
}

unsafe fn new_from_key(key_data_ptr: *const u8, key_len: usize) -> HighwayHasher {
    // We'll have the JS wrapper validate that the data is long enough
    let key_data = unsafe { core::slice::from_raw_parts(key_data_ptr, key_len) };
    let key = if key_data.is_empty() {
        Key::default()
    } else {
        Key(data_to_lanes(key_data))
    };

    HighwayHasher::new(key)
}

unsafe fn hash_once(
    key_data_ptr: *const u8,
    key_len: usize,
    data_ptr: *const u8,
    data_len: usize,
) -> HighwayHasher {
    let mut hasher = unsafe { new_from_key(key_data_ptr, key_len) };
    let data = unsafe { core::slice::from_raw_parts(data_ptr, data_len) };
    hasher.append(data);
    hasher
}

#[wasm_bindgen]
pub unsafe fn new_hasher(key_data_ptr: *const u8, key_len: usize, state_ptr: *mut u8) {
    let hasher = unsafe { new_from_key(key_data_ptr, key_len) };
    unsafe { store(&hasher, state_ptr) };
}

#[wasm_bindgen]
pub unsafe fn append(state_ptr: *mut u8, data_ptr: *const u8, data_len: usize) {
    let mut hasher = unsafe { load(state_ptr) };
    let data = unsafe { core::slice::from_raw_parts(data_ptr, data_len) };
    hasher.append(data);
    unsafe { store(&hasher, state_ptr) };
}

/// Write the hash result of `out_len` bytes (8, 16, or 32) to `out_ptr`.
#[inline(never)]
unsafe fn write_result(hasher: HighwayHasher, out_ptr: *mut u8, out_len: usize) {
    let mut out = [0u8; 32];
    let len = match out_len {
        8 => {
            out[..8].copy_from_slice(&hasher.finalize64().to_le_bytes());
            8
        }
        16 => {
            u64_slice_to_u8(&mut out[..16], &hasher.finalize128());
            16
        }
        _ => {
            u64_slice_to_u8(&mut out, &hasher.finalize256());
            32
        }
    };
    unsafe { core::ptr::copy_nonoverlapping(out.as_ptr(), out_ptr, len) };
}

/// Write the hash result of `out_len` bytes (8, 16, or 32) for the hasher
/// state at `state_ptr` to `out_ptr`. The state does not change.
#[wasm_bindgen]
pub unsafe fn finalize(state_ptr: *const u8, out_ptr: *mut u8, out_len: usize) {
    let hasher = unsafe { load(state_ptr) };
    unsafe { write_result(hasher, out_ptr, out_len) };
}

/// Hash the data in one call, with no checkpoint, and write the hash result
/// of `out_len` bytes (8, 16, or 32) to `out_ptr`. This is faster for short
/// data than `new_hasher`, `append`, and `finalize`.
#[wasm_bindgen]
pub unsafe fn hash(
    key_data_ptr: *const u8,
    key_len: usize,
    data_ptr: *const u8,
    data_len: usize,
    out_ptr: *mut u8,
    out_len: usize,
) {
    let hasher = unsafe { hash_once(key_data_ptr, key_len, data_ptr, data_len) };
    unsafe { write_result(hasher, out_ptr, out_len) };
}
