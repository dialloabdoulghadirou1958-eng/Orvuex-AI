import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('--- Génération automatique des assets PWA pour orvuex ai ---');

  // Essayer de charger une icône de base
  const baseIconPath = path.join(publicDir, 'icons', 'openai.png');
  let baseIcon;
  try {
    baseIcon = await Jimp.read(baseIconPath);
  } catch {
    // Fallback si l'icône n'est pas trouvée
    baseIcon = new Jimp({ width: 512, height: 512, color: 0xffffffff });
  }

  // 1. Générer les icônes PWA (192x192 et 512x512)
  async function createIcon(size: number, scale: number, filename: string) {
    const bg = new Jimp({ width: size, height: size, color: 0x09090bff }); // #09090b
    const logo = baseIcon.clone();
    const logoSize = Math.round(size * scale);
    logo.resize({ w: logoSize, h: logoSize });
    
    const pos = Math.round((size - logoSize) / 2);
    bg.composite(logo, pos, pos);
    
    const targetPath = path.join(publicDir, filename) as `${string}.${string}`;
    await bg.write(targetPath);
    console.log(`✓ Créé : public/${filename} (${size}x${size})`);
  }

  await createIcon(192, 0.65, 'pwa-192x192.png');
  await createIcon(512, 0.65, 'pwa-512x512.png');
  await createIcon(512, 0.82, 'pwa-maskable-512x512.png');

  // 2. Générer les captures d'écran Desktop et Mobile (exigées par PWABuilder / PWA store)
  async function createScreenshot(w: number, h: number, filename: string, title: string) {
    const bg = new Jimp({ width: w, height: h, color: 0x09090bff }); // Fond dark
    
    // Simuler une barre d'en-tête subtile (#18181b)
    const header = new Jimp({ width: w, height: Math.round(h * 0.08), color: 0x18181bff });
    bg.composite(header, 0, 0);

    // Simuler un conteneur de message central (#27272a)
    const cardW = Math.round(w * 0.8);
    const cardH = Math.round(h * 0.6);
    const card = new Jimp({ width: cardW, height: cardH, color: 0x18181bff });
    bg.composite(card, Math.round((w - cardW) / 2), Math.round((h - cardH) / 2));

    // Logo au centre du card
    const logo = baseIcon.clone();
    const lSize = Math.round(Math.min(w, h) * 0.15);
    logo.resize({ w: lSize, h: lSize });
    bg.composite(logo, Math.round((w - lSize) / 2), Math.round((h - lSize) / 2));

    const targetPath = path.join(publicDir, filename) as `${string}.${string}`;
    await bg.write(targetPath);
    console.log(`✓ Créé : public/${filename} (${w}x${h} - ${title})`);
  }

  await createScreenshot(1280, 720, 'screenshot-desktop.png', 'Bureau');
  await createScreenshot(1080, 1920, 'screenshot-mobile.png', 'Mobile');

  console.log('--- Tous les assets PWA ont été générés avec succès ! ---');
}

generateAssets().catch((err) => {
  console.error('Erreur lors de la génération PWA:', err);
  process.exit(1);
});
