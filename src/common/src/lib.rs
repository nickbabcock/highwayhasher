pub fn data_to_lanes(d: &[u8]) -> [u64; 4] {
    let mut result = [0u64; 4];
    for (i, x) in d.chunks_exact(8).take(result.len()).enumerate() {
        result[i] = u64::from_le_bytes([x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7]]);
    }
    result
}

pub fn u64_slice_to_u8(out: &mut [u8], hash: &[u64]) {
    const U64_LEN: usize = std::mem::size_of::<u64>();
    for (&hash, out) in hash.iter().zip(out.chunks_exact_mut(U64_LEN)) {
        out.copy_from_slice(&hash.to_le_bytes())
    }
}
