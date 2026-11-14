/* global __dirname */
// Genera icona e schermata di avvio di Libreria (SVG rasterizzato con Chromium/Playwright).
// Uso: node scripts/make-icons.js   (richiede playwright disponibile nell'ambiente)
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] ?? path.join(__dirname, '..', 'assets');

// Tre libri di altezze diverse su uno scaffale: i colori delle fasce d'età dell'app.
const books = (scale = 1, mono = false) => {
  const c = (color) => (mono ? '#FFFFFF' : color);
  return `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <rect x="300" y="330" width="120" height="360" rx="18" fill="${c('#FDE68A')}"/>
    <rect x="330" y="390" width="60" height="16" rx="8" fill="${mono ? '#000' : '#B45309'}" opacity="${mono ? 0 : 0.55}"/>
    <rect x="440" y="270" width="130" height="420" rx="18" fill="${c('#FFFFFF')}"/>
    <rect x="472" y="335" width="66" height="16" rx="8" fill="#C2410C" opacity="${mono ? 0 : 0.6}"/>
    <rect x="472" y="367" width="66" height="16" rx="8" fill="#C2410C" opacity="${mono ? 0 : 0.35}"/>
    <g transform="rotate(14 660 690)">
      <rect x="595" y="360" width="118" height="330" rx="18" fill="${c('#BBF7D0')}"/>
      <rect x="624" y="418" width="60" height="16" rx="8" fill="#166534" opacity="${mono ? 0 : 0.5}"/>
    </g>
    <rect x="250" y="690" width="524" height="34" rx="17" fill="${c('#7C2D12')}"/>
  </g>`;
};
const svg = (inner, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg ?? ''}${inner}</svg>`;
const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EA580C"/><stop offset="1" stop-color="#C2410C"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/>`;

const files = [
  // Icona completa (quadrata, senza trasparenza).
  { name: 'icon.png', size: 1024, svg: svg(books(1.15), gradient), transparent: false },
  // Icona adattiva Android: il disegno deve stare nel 66% centrale.
  { name: 'android-icon-foreground.png', size: 1024, svg: svg(books(0.8)), transparent: true },
  { name: 'android-icon-background.png', size: 1024, svg: svg('', gradient), transparent: false },
  {
    name: 'android-icon-monochrome.png',
    size: 1024,
    svg: svg(books(0.8, true)),
    transparent: true,
  },
  // Schermata di avvio: solo il disegno, lo sfondo lo mette la configurazione.
  { name: 'splash-icon.png', size: 1024, svg: svg(books(0.85)), transparent: true },
  { name: 'favicon.png', size: 96, svg: svg(books(1.15), gradient), transparent: false },
];

(async () => {
  const browser = await chromium.launch();
  for (const f of files) {
    const page = await browser.newPage({
      viewport: { width: f.size, height: f.size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${f.svg.replace('width="1024" height="1024"', `width="${f.size}" height="${f.size}"`)}</body></html>`,
    );
    await page.screenshot({ path: path.join(out, f.name), omitBackground: f.transparent });
    await page.close();
  }
  await browser.close();
})();
