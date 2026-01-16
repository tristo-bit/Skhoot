const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '../public/skhoot-logo-dark-purple.png');
const ICONS_DIR = path.join(__dirname, '../src-tauri/icons');

// All icon sizes needed for Tauri
const SIZES = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

async function generateIcons() {
  console.log('Generating icons from:', SOURCE);
  
  if (!fs.existsSync(SOURCE)) {
    console.error('Source file not found:', SOURCE);
    process.exit(1);
  }

  for (const { name, size } of SIZES) {
    const output = path.join(ICONS_DIR, name);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(output);
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  console.log('\n✅ All PNG icons generated!');
}

generateIcons().catch(console.error);
