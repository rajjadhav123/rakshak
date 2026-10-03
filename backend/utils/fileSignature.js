const fs = require('fs');

// middleware/upload.js's fileFilter only checks file.mimetype, which is
// the client-supplied Content-Type header on the multipart part — an
// attacker can relabel any file (e.g. an .html or .js payload) as
// "image/jpeg" and it sails straight through. This is the actual
// content check, flagged as open since v10 ("True fix is magic-byte
// sniffing on the actual file content").
//
// Implemented by hand rather than via the `file-type` package: recent
// versions of that package are ESM-only, and this backend is
// CommonJS throughout — pulling it in would mean either pinning an
// old version or a dynamic import() just for this one call site. The
// allowed set is small and fixed (5 types), so hand-written signatures
// are simpler and dependency-free.
// Each type maps to a list of ALTERNATIVE signatures (any one is
// enough — e.g. GIF's two sub-versions). Each alternative is itself a
// list of PARTS that must ALL match (needed for WEBP, whose two
// identifying markers sit at different offsets in the same header).
const SIGNATURES = {
  'image/jpeg': [
    [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  ],
  'image/png': [
    [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  ],
  'image/gif': [
    [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }], // GIF87a
    [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }], // GIF89a
  ],
  'image/webp': [
    [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // 'RIFF'
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // 'WEBP'
    ],
  ],
  'application/pdf': [
    [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // '%PDF-'
  ],
};

const HEADER_BYTES_NEEDED = 16; // covers every signature above, WEBP's included (offset 8 + 4 bytes)

// alternative = one full signature: a list of {offset, bytes} parts
// that must ALL match against buf.
const matchesSignature = (buf, alternative) => alternative.every((part) =>
  part.bytes.every((b, i) => buf[part.offset + i] === b));

// Only the file's header is read — cheap even at the 8MB upload cap,
// since we never need more than the first few bytes.
const readHeader = (filePath) => new Promise((resolve, reject) => {
  fs.open(filePath, 'r', (err, fd) => {
    if (err) return reject(err);
    const buf = Buffer.alloc(HEADER_BYTES_NEEDED);
    fs.read(fd, buf, 0, HEADER_BYTES_NEEDED, 0, (readErr, bytesRead) => {
      fs.close(fd, () => {
        if (readErr) return reject(readErr);
        resolve(buf.subarray(0, bytesRead));
      });
    });
  });
});

// True if the file at filePath actually contains the file type it
// claims to be (declaredMimeType). Callers only ever pass one of the
// 5 types ALLOWED_MIME already restricts uploads to, but an unknown
// type here safely returns false rather than throwing.
const contentMatchesDeclaredType = async (filePath, declaredMimeType) => {
  const alternatives = SIGNATURES[declaredMimeType];
  if (!alternatives) return false;
  const header = await readHeader(filePath);
  return alternatives.some((alt) => matchesSignature(header, alt));
};

module.exports = { contentMatchesDeclaredType };
