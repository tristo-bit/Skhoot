const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, '../public/skhoot-logo-dark-purple.png');
const ICO_PATH = path.join(__dirname, '../src-tauri/icons/icon.ico');

// ICO format needs multiple sizes embedded
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

async function generateIco() {
  console.log('Generating ICO with multiple sizes...');
  
  // Generate each size as PNG buffer
  const images = [];
  for (const size of ICO_SIZES) {
    const buffer = await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    images.push({ size, buffer });
    console.log(`  Prepared ${size}x${size}`);
  }

  // Create ICO file manually
  // ICO header: 6 bytes
  // ICO directory entries: 16 bytes each
  // Image data follows
  
  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  let dataOffset = headerSize + dirSize;
  const entries = [];
  
  for (const img of images) {
    entries.push({
      width: img.size === 256 ? 0 : img.size, // 0 means 256
      height: img.size === 256 ? 0 : img.size,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      size: img.buffer.length,
      offset: dataOffset,
      buffer: img.buffer
    });
    dataOffset += img.buffer.length;
  }

  // Build ICO file
  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);
  
  // Header
  ico.writeUInt16LE(0, 0);      // Reserved
  ico.writeUInt16LE(1, 2);      // Type: 1 = ICO
  ico.writeUInt16LE(numImages, 4); // Number of images
  
  // Directory entries
  let offset = 6;
  for (const entry of entries) {
    ico.writeUInt8(entry.width, offset);
    ico.writeUInt8(entry.height, offset + 1);
    ico.writeUInt8(entry.colorCount, offset + 2);
    ico.writeUInt8(entry.reserved, offset + 3);
    ico.writeUInt16LE(entry.planes, offset + 4);
    ico.writeUInt16LE(entry.bitCount, offset + 6);
    ico.writeUInt32LE(entry.size, offset + 8);
    ico.writeUInt32LE(entry.offset, offset + 12);
    offset += 16;
  }
  
  // Image data
  for (const entry of entries) {
    entry.buffer.copy(ico, entry.offset);
  }
  
  fs.writeFileSync(ICO_PATH, ico);
  console.log(`\n✅ Generated icon.ico with ${numImages} sizes`);
}

generateIco().catch(console.error);
