// Prints the recommended pipeline for swapping the procedural stand-ins for photoreal, Draco-compressed GLBs.
console.log(`
1. Export each product as glTF/GLB (≤ 60k triangles, 2k textures) named <id>.glb — ids: shrimp prawn fish crab lobster squid valueadded
2. Compress:   npx gltf-transform optimize in.glb public/models/<id>.glb --compress draco --texture-compress webp
3. Register:   add  "<id>": "/models/<id>.glb"  to public/models/manifest.json
Models are lazy-loaded; three bundles the Draco WASM decoder, which is only fetched when a GLB is requested.`);
