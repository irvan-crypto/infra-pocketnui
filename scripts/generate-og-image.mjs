/**
 * Generator gambar Open Graph (1200x630) untuk SIMIRA.
 *
 * Jalankan:  node scripts/generate-og-image.mjs
 * Output :  public/og-image.png
 *
 * Kartu ini dipakai sebagai preview saat link dibagikan
 * di WhatsApp / Telegram / Facebook / LinkedIn / X.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const W = 1200;
const H = 630;

/* ------------------------------------------------------------------ */
/* 1. Latar belakang: gradien navy + glow oranye + grid tipis          */
/* ------------------------------------------------------------------ */
const background = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#06172b"/>
      <stop offset="55%" stop-color="#0b2b4d"/>
      <stop offset="100%" stop-color="#123f6b"/>
    </linearGradient>
    <radialGradient id="glowOrange" cx="0.92" cy="1.05" r="0.75">
      <stop offset="0%"   stop-color="#f97316" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowCyan" cx="0.02" cy="-0.1" r="0.8">
      <stop offset="0%"   stop-color="#22d3ee" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#f59e0b"/>
      <stop offset="50%"  stop-color="#f97316"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glowCyan)"/>
  <rect width="${W}" height="${H}" fill="url(#glowOrange)"/>

  <!-- garis aksen atas -->
  <rect x="0" y="0" width="${W}" height="8" fill="url(#accent)"/>

  <!-- cincin dekoratif -->
  <circle cx="1085" cy="575" r="190" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2"/>
  <circle cx="1085" cy="575" r="255" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2"/>
  <circle cx="150" cy="40" r="120" fill="none" stroke="#22d3ee" stroke-opacity="0.10" stroke-width="2"/>
</svg>
`;

/* ------------------------------------------------------------------ */
/* 2. Kartu logo putih di kiri                                        */
/* ------------------------------------------------------------------ */
const logoCard = `
<svg width="330" height="330" viewBox="0 0 330 330" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="330" height="330" rx="40" fill="#ffffff" filter="url(#shadow)"/>
</svg>
`;

/* ------------------------------------------------------------------ */
/* 3. Teks di kanan                                                   */
/* ------------------------------------------------------------------ */
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

const text = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <text x="452" y="248" font-family="${FONT}" font-size="82" font-weight="700"
        fill="#ffffff" letter-spacing="3">SIMIRA</text>

  <rect x="454" y="276" width="118" height="7" rx="3.5" fill="url(#accent)"/>

  <text x="454" y="336" font-family="${FONT}" font-size="30" font-weight="400"
        fill="#8ed0f0">Sistem Informasi Monitoring Infrastruktur</text>

  <text x="454" y="392" font-family="${FONT}" font-size="26" font-weight="400"
        fill="#c3d3e5">Monitoring aktifitas rilis semen dari pabrik (silo)</text>
  <text x="454" y="428" font-family="${FONT}" font-size="26" font-weight="400"
        fill="#c3d3e5">ke packing plant</text>

  <g font-family="${FONT}" font-size="19" fill="#dbeafe">
    <rect x="454" y="470" width="88" height="42" rx="21" fill="#ffffff" fill-opacity="0.10"
          stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="498" y="498" text-anchor="middle">PPDO</text>

    <rect x="556" y="470" width="144" height="42" rx="21" fill="#ffffff" fill-opacity="0.10"
          stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="628" y="498" text-anchor="middle">Interplant</text>

    <rect x="714" y="470" width="194" height="42" rx="21" fill="#ffffff" fill-opacity="0.10"
          stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="811" y="498" text-anchor="middle">Port Management</text>

    <rect x="922" y="470" width="172" height="42" rx="21" fill="#ffffff" fill-opacity="0.10"
          stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="1008" y="498" text-anchor="middle">Packing Plant</text>
  </g>

  <text x="72" y="580" font-family="${FONT}" font-size="19" font-weight="400"
        fill="#7f93aa">simira &#183; monitoring harian &#183; v1.1.0</text>
</svg>
`;

/* ------------------------------------------------------------------ */
/* 4. Komposisi                                                       */
/* ------------------------------------------------------------------ */
const logo = await sharp(path.join(root, "public/logo.png"))
  .resize(270, 270, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png()
  .toBuffer();

const output = path.join(root, "public/og-image.png");

await sharp(Buffer.from(background))
  .composite([
    { input: Buffer.from(logoCard), left: 72, top: 150 },
    { input: logo, left: 102, top: 180 },
    { input: Buffer.from(text), left: 0, top: 0 },
  ])
  .png({ quality: 92, compressionLevel: 9 })
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`✅ ${path.relative(root, output)} — ${meta.width}x${meta.height}`);
