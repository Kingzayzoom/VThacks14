import sharp from "sharp";
// Format/size optimization only; composition remains the built-in imagegen output.
await sharp("public/assets/optical-field-source.png")
  .resize(1536)
  .webp({ quality: 82 })
  .toFile("public/assets/optical-field.webp");
await sharp("public/assets/optical-field-source.png")
  .resize(768)
  .webp({ quality: 78 })
  .toFile("public/assets/optical-field-mobile.webp");
console.log("Optimized original optical material for desktop and mobile.");
