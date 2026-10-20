const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const cx = 382, cy = 509, r = 338;
  const size = r * 2;
  
  // Extract square around circle
  const cropped = await sharp('public/logo.jpg')
    .extract({ left: cx - r, top: cy - r, width: size, height: size })
    .toBuffer();

  // Create circle mask SVG
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff" /></svg>`
  );

  // Mask it to pure circle
  const maskedCircle = await sharp(cropped)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const outDir = path.join(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Regular icon 512x512 (Circle takes ~86% for balanced margin)
  const circle512 = await sharp(maskedCircle).resize(440, 440).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 253, g: 250, b: 246, alpha: 1 }
    }
  })
    .composite([{ input: circle512, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-512x512.png'));

  // 2. Regular icon 192x192
  const circle192 = await sharp(maskedCircle).resize(164, 164).toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 253, g: 250, b: 246, alpha: 1 }
    }
  })
    .composite([{ input: circle192, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-192x192.png'));

  // 3. Apple Touch Icon 180x180
  const circle180 = await sharp(maskedCircle).resize(156, 156).toBuffer();
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 253, g: 250, b: 246, alpha: 1 }
    }
  })
    .composite([{ input: circle180, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));

  // 4. Maskable icon 512x512 (Safe zone is center 80% circle, so radius is 512 * 0.4 = 204.8 -> diameter ~390px)
  const circleMaskable = await sharp(maskedCircle).resize(380, 380).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 253, g: 250, b: 246, alpha: 1 }
    }
  })
    .composite([{ input: circleMaskable, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-maskable-512x512.png'));

  // 5. Favicon 32x32 and 16x16
  const circle32 = await sharp(maskedCircle).resize(28, 28).toBuffer();
  await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: { r: 253, g: 250, b: 246, alpha: 1 }
    }
  })
    .composite([{ input: circle32, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'favicon-32x32.png'));

  console.log('All PWA icons generated successfully in public/icons/');
}

generateIcons().catch(console.error);
