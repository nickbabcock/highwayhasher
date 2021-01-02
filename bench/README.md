# Benchmarks

To run benchmarks:

```bash
cd ..
npm install
npm run build
cd bench
npm install
node index.js
```

After running you will see output like:

```
hashing data of size: 10000000
highwayhasher native 1.32ms
highwayhasher wasm 17.65ms
highwayhash (3rd party) 1.29ms

hashing data of size: 100000000
highwayhasher native 12.06ms
highwayhasher wasm 173.21ms
highwayhash (3rd party) 13.14ms
```

Here you can see how Wasm compares to the native implementations (much slower but can still be fast enough for many use cases) and that both native implementations are within margin of error.