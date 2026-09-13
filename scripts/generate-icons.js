import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, drawFn) {
  // Build raw uncompressed RGBA bitmap
  const rowSize = width * 4;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Compress with Deflate
  const compressed = zlib.deflateSync(rawData);

  // Helper to create PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);

    const fullBuf = Buffer.concat([typeBuf, data]);
    const crc = calcCrc(fullBuf);
    crcBuf.writeInt32BE(crc, 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function calcCrc(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) | 0;
  }

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw minimalist LinkVault icon: Dark sleek background (#0a0a0a) with white bookmark emblem
function drawLinkVault(x, y, w, h) {
  const normX = x / w;
  const normY = y / h;

  // Background: dark #0a0a0a
  let r = 10, g = 10, b = 10, a = 255;

  // Center Bookmark shape
  const bmLeft = 0.32;
  const bmRight = 0.68;
  const bmTop = 0.22;
  const bmBottom = 0.78;
  const bmNotch = 0.64;

  if (normX >= bmLeft && normX <= bmRight && normY >= bmTop && normY <= bmBottom) {
    // Check bottom notch triangle
    let inNotch = false;
    if (normY >= bmNotch) {
      const centerX = 0.5;
      const progress = (normY - bmNotch) / (bmBottom - bmNotch);
      const halfWidth = (bmRight - bmLeft) / 2;
      const notchDist = (1 - progress) * halfWidth;
      const distFromCenter = Math.abs(normX - centerX);
      if (distFromCenter < (halfWidth - notchDist)) {
        inNotch = true;
      }
    }

    if (!inNotch) {
      r = 255;
      g = 255;
      b = 255;
      a = 255;
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve(process.cwd(), 'public');
const icon192 = createPng(192, 192, drawLinkVault);
const icon512 = createPng(512, 512, drawLinkVault);

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

console.log('Successfully generated public/icon-192.png and public/icon-512.png');
