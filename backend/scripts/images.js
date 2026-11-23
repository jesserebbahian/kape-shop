import fs from 'node:fs';
import path from 'node:path';
import { initDb, Product } from '../src/models/index.js';
import { closeDb } from '../src/config/database.js';

const dir = path.resolve('frontend/public/products');
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const fillArg = process.argv.find((a) => a.startsWith('--fill='));
const fillFile = fillArg ? path.resolve(fillArg.slice('--fill='.length)) : null;
if (fillFile && !fs.existsSync(fillFile)) {
  console.error(`Photo not found: ${fillFile}`);
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });
await initDb();

const products = await Product.findAll({ order: [['id', 'ASC']] });
const missing = [];
let linked = 0;

for (const product of products) {
  const base = slug(product.name);
  let file = fs.readdirSync(dir).find((f) => EXTENSIONS.includes(path.extname(f).toLowerCase()) && path.basename(f, path.extname(f)).toLowerCase() === base);
  if (!file && fillFile) {
    file = `${base}${path.extname(fillFile).toLowerCase()}`;
    fs.copyFileSync(fillFile, path.join(dir, file));
  }
  if (file) {
    await product.update({ image_url: `/products/${file}` });
    linked += 1;
  } else {
    missing.push(`${base}.jpg`);
  }
}

console.log(`Photos linked: ${linked} of ${products.length}`);
if (missing.length) {
  console.log('Still using the drawing. Add these files to frontend/public/products and run again:');
  for (const name of missing) console.log(`  ${name}`);
}
await closeDb();
