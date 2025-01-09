#![no_std]
#![allow(clippy::missing_safety_doc)]

use common::{data_to_lanes, u64_slice_to_u8};
use core::{mem::MaybeUninit, ptr::addr_of_mut};
use highway::{HighwayHash, HighwayHasher, Key};
use wasm_bindgen::prelude::*;

/// Size of a highwayhasher, in bytes
const ELEM_SIZE: usize = core::mem::size_of::<HighwayHasher>();

/// The WebAssembly page size, in bytes.
pub const PAGE_SIZE: usize = 65536;

const _: () = assert!(ELEM_SIZE <= 256, "element size bigger than expected");

pub const MAX_INSTANCES: usize = PAGE_SIZE / ELEM_SIZE;

static mut STATES: [MaybeUninit<HighwayHasher>; MAX_INSTANCES] =
    unsafe { MaybeUninit::uninit().assume_init() };

#[wasm_bindgen]
pub fn max_instances() -> usize {
    MAX_INSTANCES
}

#[wasm_bindgen]
pub unsafe fn new_hasher(key_data_ptr: *const u8, key_len: usize, idx: usize) -> i32 {
    // We'll have the JS wrapper validate that the data is long enough
    let key_data = unsafe { core::slice::from_raw_parts(key_data_ptr, key_len) };
    let key = if key_data.is_empty() {
        Key::default()
    } else {
        Key(data_to_lanes(key_data))
    };

    if idx >= MAX_INSTANCES {
        return -1;
    }

    STATES[idx].write(HighwayHasher::new(key));
    idx as i32
}

#[wasm_bindgen]
pub unsafe fn append(data_ptr: *const u8, data_len: usize, idx: usize) {
    if idx >= MAX_INSTANCES {
        return;
    }

    let data = unsafe { core::slice::from_raw_parts(data_ptr, data_len) };
    let elem = unsafe { addr_of_mut!(STATES[idx]) };
    (*elem).assume_init_mut().append(data);
}

#[wasm_bindgen]
pub unsafe fn finalize64(data_ptr: *mut u8, idx: usize) {
    if idx >= MAX_INSTANCES {
        return;
    }

    let elem = unsafe { addr_of_mut!(STATES[idx]) };
    let hasher = unsafe { (*elem).assume_init_read() };
    let result = hasher.finalize64().to_le_bytes();
    unsafe { core::ptr::copy_nonoverlapping(result.as_ptr(), data_ptr, result.len()) };
}

#[wasm_bindgen]
pub unsafe fn finalize128(data_ptr: *mut u8, idx: usize) {
    if idx >= MAX_INSTANCES {
        return;
    }

    let elem = unsafe { addr_of_mut!(STATES[idx]) };
    let hasher = unsafe { (*elem).assume_init_read() };
    let mut out = [0u8; 16];
    let result = hasher.finalize128();
    u64_slice_to_u8(&mut out, &result);
    unsafe { core::ptr::copy_nonoverlapping(out.as_ptr(), data_ptr, out.len()) };
}

#[wasm_bindgen]
pub unsafe fn finalize256(data_ptr: *mut u8, idx: usize) {
    if idx >= MAX_INSTANCES {
        return;
    }

    let elem = unsafe { addr_of_mut!(STATES[idx]) };
    let hasher = unsafe { (*elem).assume_init_read() };
    let mut out = [0u8; 32];
    let result = hasher.finalize256();
    u64_slice_to_u8(&mut out, &result);
    unsafe { core::ptr::copy_nonoverlapping(out.as_ptr(), data_ptr, out.len()) };
}
