/**
 * Zero-dependency ZIP file generator using Node.js zlib
 * Implements standard PKWARE ZIP format specification.
 */

import zlib from 'node:zlib';

// CRC-32 table generator
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

export function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Creates a standard ZIP buffer from an array of files:
 * [{ name: 'main.tex', content: Buffer | string }]
 */
export function createZipBuffer(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const rawBuffer = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf8');

    const nameBuffer = Buffer.from(file.name.replace(/\\/g, '/'), 'utf8');
    const compressedBuffer = zlib.deflateRawSync(rawBuffer);
    const checksum = crc32(rawBuffer);

    // Date/time in MS-DOS format
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2))) & 0xFFFF;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

    // Local file header (30 bytes + name length + data)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034B50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed: 2.0
    localHeader.writeUInt16LE(0, 6);          // General purpose bit flag
    localHeader.writeUInt16LE(8, 8);          // Compression method: 8 (Deflate)
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressedBuffer.length, 18); // Compressed size
    localHeader.writeUInt32LE(rawBuffer.length, 22);        // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);                       // Extra field length

    const fullLocal = Buffer.concat([localHeader, nameBuffer, compressedBuffer]);
    localHeaders.push(fullLocal);

    // Central directory header (46 bytes + name length)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014B50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4);          // Version made by
    centralHeader.writeUInt16LE(20, 6);          // Version needed
    centralHeader.writeUInt16LE(0, 8);           // General purpose bit flag
    centralHeader.writeUInt16LE(8, 10);          // Compression method: Deflate
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressedBuffer.length, 20);
    centralHeader.writeUInt32LE(rawBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);          // Extra field length
    centralHeader.writeUInt16LE(0, 32);          // File comment length
    centralHeader.writeUInt16LE(0, 34);          // Disk number start
    centralHeader.writeUInt16LE(0, 36);          // Internal file attributes
    centralHeader.writeUInt32LE(0, 38);          // External file attributes
    centralHeader.writeUInt32LE(offset, 42);     // Relative offset of local header

    const fullCentral = Buffer.concat([centralHeader, nameBuffer]);
    centralHeaders.push(fullCentral);

    offset += fullLocal.length;
  }

  const centralDirBuffer = Buffer.concat(centralHeaders);

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);                 // End of central dir signature
  eocd.writeUInt16LE(0, 4);                          // Number of this disk
  eocd.writeUInt16LE(0, 6);                          // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8);               // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10);              // Total number of central directory records
  eocd.writeUInt32LE(centralDirBuffer.length, 12);   // Size of central directory
  eocd.writeUInt32LE(offset, 16);                    // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);                         // Comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}
