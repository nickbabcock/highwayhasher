use common::{data_to_lanes, u64_slice_to_u8};
use highway::{HighwayBuilder, HighwayHash, Key};
use napi::{CallContext, JsBuffer, JsFunction, JsObject, JsUndefined, Property};
use napi_derive::{js_function, module_exports};

#[js_function(1)]
fn create_highway_hasher_class(ctx: CallContext) -> napi::Result<JsFunction> {
    let add_append_method = Property::new(&ctx.env, "append")?.with_method(append);
    let add_finalize64_method = Property::new(&ctx.env, "finalize64")?.with_method(finalize64);
    let add_finalize128_method = Property::new(&ctx.env, "finalize128")?.with_method(finalize128);
    let add_finalize256_method = Property::new(&ctx.env, "finalize256")?.with_method(finalize256);
    let properties = vec![
        add_append_method,
        add_finalize64_method,
        add_finalize128_method,
        add_finalize256_method,
    ];
    ctx.env.define_class(
        "HighwayHasher",
        highway_hasher_constructor,
        properties.as_slice(),
    )
}

#[js_function(1)]
fn highway_hasher_constructor(ctx: CallContext) -> napi::Result<JsUndefined> {
    let key_data = ctx.get::<JsBuffer>(0)?.into_value()?;
    let key = create_key(&key_data);
    let mut this: JsObject = ctx.this()?;
    ctx.env.wrap(&mut this, HighwayBuilder::new(key))?;
    ctx.env.get_undefined()
}

#[js_function(1)]
fn append(ctx: CallContext) -> napi::Result<JsUndefined> {
    let data = ctx.get::<JsBuffer>(0)?.into_value()?;
    let this: JsObject = ctx.this()?;
    let hasher: &mut HighwayBuilder = ctx.env.unwrap(&this)?;
    hasher.append(&data[..]);
    ctx.env.get_undefined()
}

#[js_function(0)]
fn finalize64(ctx: CallContext) -> napi::Result<JsBuffer> {
    let this: JsObject = ctx.this()?;
    let hasher: &mut HighwayBuilder = ctx.env.unwrap(&this)?;
    let res = hasher.clone().finalize64();
    let buf = ctx.env.create_buffer_copy(&res.to_le_bytes()[..])?;
    Ok(buf.into_raw())
}

#[js_function(0)]
fn finalize128(ctx: CallContext) -> napi::Result<JsBuffer> {
    let this: JsObject = ctx.this()?;
    let hasher: &mut HighwayBuilder = ctx.env.unwrap(&this)?;
    let hash = hasher.clone().finalize128();
    let mut bytes = [0u8; 16];
    u64_slice_to_u8(&mut bytes, &hash[..]);
    let buf = ctx.env.create_buffer_copy(&bytes[..])?;
    Ok(buf.into_raw())
}

#[js_function(0)]
fn finalize256(ctx: CallContext) -> napi::Result<JsBuffer> {
    let this: JsObject = ctx.this()?;
    let hasher: &mut HighwayBuilder = ctx.env.unwrap(&this)?;
    let hash = hasher.clone().finalize256();
    let mut bytes = [0u8; 32];
    u64_slice_to_u8(&mut bytes, &hash[..]);
    let buf = ctx.env.create_buffer_copy(&bytes[..])?;
    Ok(buf.into_raw())
}

#[js_function(2)]
fn hash64(ctx: CallContext) -> napi::Result<JsBuffer> {
    let key_data = ctx.get::<JsBuffer>(0)?.into_value()?;
    let key = create_key(&key_data);
    let data = ctx.get::<JsBuffer>(1)?.into_value()?;
    let mut hasher = HighwayBuilder::new(key);
    hasher.append(&data[..]);
    let res = hasher.finalize64();
    let buf = ctx.env.create_buffer_copy(&res.to_le_bytes()[..])?;
    Ok(buf.into_raw())
}

#[js_function(2)]
fn hash128(ctx: CallContext) -> napi::Result<JsBuffer> {
    let key_data = ctx.get::<JsBuffer>(0)?.into_value()?;
    let key = create_key(&key_data);
    let data = ctx.get::<JsBuffer>(1)?.into_value()?;
    let mut hasher = HighwayBuilder::new(key);
    hasher.append(&data[..]);
    let hash = hasher.finalize128();
    let mut bytes = [0u8; 16];
    u64_slice_to_u8(&mut bytes, &hash[..]);
    let buf = ctx.env.create_buffer_copy(&bytes[..])?;
    Ok(buf.into_raw())
}

#[js_function(2)]
fn hash256(ctx: CallContext) -> napi::Result<JsBuffer> {
    let key_data = ctx.get::<JsBuffer>(0)?.into_value()?;
    let key = create_key(&key_data);
    let data = ctx.get::<JsBuffer>(1)?.into_value()?;
    let mut hasher = HighwayBuilder::new(key);
    hasher.append(&data[..]);
    let hash = hasher.finalize256();
    let mut bytes = [0u8; 32];
    u64_slice_to_u8(&mut bytes, &hash[..]);
    let buf = ctx.env.create_buffer_copy(&bytes[..])?;
    Ok(buf.into_raw())
}

fn create_key(data: &[u8]) -> Key {
    if data.is_empty() {
        Key::default()
    } else {
        Key(data_to_lanes(data))
    }
}

#[module_exports]
fn init(mut exports: JsObject) -> napi::Result<()> {
    exports.create_named_method("hash64", hash64)?;
    exports.create_named_method("hash128", hash128)?;
    exports.create_named_method("hash256", hash256)?;
    exports.create_named_method("createHighwayClass", create_highway_hasher_class)?;
    Ok(())
}
