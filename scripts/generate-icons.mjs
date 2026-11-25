// Genera los iconos PNG de la PWA a partir de scripts/icon.svg
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const svg = await readFile(new URL("./icon.svg", import.meta.url));
const out = (p) => new URL(`../${p}`, import.meta.url);

await sharp(svg).resize(192, 192).png().toFile(out("public/icons/icon-192.png").pathname);
await sharp(svg).resize(512, 512).png().toFile(out("public/icons/icon-512.png").pathname);
// Maskable: el contenido ya tiene margen suficiente (zona segura del 80%)
await sharp(svg).resize(512, 512).png().toFile(out("public/icons/icon-maskable-512.png").pathname);
await sharp(svg).resize(180, 180).png().toFile(out("app/apple-icon.png").pathname);
await writeFile(out("app/icon.svg"), svg);
console.log("Iconos generados ✔");
