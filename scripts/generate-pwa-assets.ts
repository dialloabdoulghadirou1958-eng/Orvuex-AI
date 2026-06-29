import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function generateAssets() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('--- Génération automatique des assets PWA pour orvuex ai ---');

  // Essayer de charger une icône de base (le logo officiel généré pour orvuex ai)
  const baseIconPath = path.resolve(process.cwd(), 'src/assets/images/orvuex_logo_1782735611463.jpg');
  let baseIcon;
  try {
    baseIcon = await Jimp.read(baseIconPath);
    console.log(`✓ Logo de base chargé avec succès : ${baseIconPath}`);

    // Flood fill starting from the corners to make only the outer white background transparent
    const width = baseIcon.width;
    const height = baseIcon.height;
    const visited = new Uint8Array(width * height);
    const queue: [number, number][] = [];
    
    // Add corners to the queue
    const corners = [
      [0, 0], [width - 1, 0],
      [0, height - 1], [width - 1, height - 1]
    ];
    
    for (const [cx, cy] of corners) {
      const idx = cy * width + cx;
      visited[idx] = 1;
      queue.push([cx, cy]);
    }
    
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const idx = (width * y + x) << 2;
      const r = baseIcon.bitmap.data[idx];
      const g = baseIcon.bitmap.data[idx + 1];
      const b = baseIcon.bitmap.data[idx + 2];
      
      const v = (r + g + b) / 3;
      
      // If the pixel is very light (part of the outer white/light-gray background)
      if (v > 190) {
        // Calculate a blending factor (t goes from 0 to 1 as pixel goes from 190 to 255)
        const t = Math.max(0, Math.min(1, (v - 190) / 65));
        
        // Match the alpha channel: very white becomes completely transparent
        const alpha = Math.round((1 - t) * 255);
        baseIcon.bitmap.data[idx + 3] = Math.max(0, Math.min(255, alpha));
        
        // Also tint the RGB values of semi-transparent pixels towards the application dark background (#09090b)
        // to completely eliminate white halo/fringe artifacts.
        baseIcon.bitmap.data[idx] = Math.round(r * (1 - t) + 9 * t);
        baseIcon.bitmap.data[idx + 1] = Math.round(g * (1 - t) + 9 * t);
        baseIcon.bitmap.data[idx + 2] = Math.round(b * (1 - t) + 11 * t);
        
        // Neighbors
        const neighbors = [
          [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
    console.log(`✓ Background white transparency applied to logo edges.`);
  } catch (err) {
    console.warn(`Impossible de charger le logo de base à ${baseIconPath}, fallback sur openai.png`, err);
    try {
      baseIcon = await Jimp.read(path.join(publicDir, 'icons', 'openai.png'));
    } catch {
      // Fallback si l'icône n'est pas trouvée
      baseIcon = new Jimp({ width: 512, height: 512, color: 0xffffffff });
    }
  }

  // 1. Générer les icônes PWA (192x192 et 512x512)
  async function createIcon(size: number, scale: number, filename: string, isMaskable: boolean = false) {
    // Transparent base for regular PWA icons, solid #09090b for maskable ones
    const bgColor = isMaskable ? 0x09090bff : 0x00000000;
    const bg = new Jimp({ width: size, height: size, color: bgColor });
    const logo = baseIcon.clone();
    const logoSize = Math.round(size * scale);
    logo.resize({ w: logoSize, h: logoSize });
    
    const pos = Math.round((size - logoSize) / 2);
    bg.composite(logo, pos, pos);
    
    const targetPath = path.join(publicDir, filename) as `${string}.${string}`;
    await bg.write(targetPath);
    console.log(`✓ Créé : public/${filename} (${size}x${size})`);
  }

  await createIcon(192, 0.85, 'pwa-192x192.png', false);
  await createIcon(512, 0.85, 'pwa-512x512.png', false);
  await createIcon(512, 0.90, 'pwa-maskable-512x512.png', true);

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
