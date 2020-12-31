pub fn data_to_lanes(d: &[u8]) -> [u64; 4] {
    debug_assert!(d.len() >= std::mem::size_of::<[u64; 4]>());
    unsafe {
        [
            (d.as_ptr().offset(0) as *const u64).read_unaligned(),
            (d.as_ptr().offset(8) as *const u64).read_unaligned(),
            (d.as_ptr().offset(16) as *const u64).read_unaligned(),
            (d.as_ptr().offset(24) as *const u64).read_unaligned(),
        ]
    }
}

pub fn u64_slice_to_u8(hash: &[u64]) -> Vec<u8> {
    const U64_LEN: usize = std::mem::size_of::<u64>();
    let mut bytes = vec![0; U64_LEN * hash.len()];
    for (&hash, out) in hash.iter().zip(bytes.chunks_exact_mut(U64_LEN)) {
        out.copy_from_slice(&hash.to_le_bytes())
    }

    bytes
}