export const MIME_GAMBAR_DIIZINKAN = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type MimeGambarDiizinkan = (typeof MIME_GAMBAR_DIIZINKAN)[number];

export const UKURAN_GAMBAR_MAKS_BYTE = 2 * 1024 * 1024;

export class ValidasiGambarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidasiGambarError";
  }
}

export function adalahMimeGambarDiizinkan(
  nilai: string,
): nilai is MimeGambarDiizinkan {
  return (MIME_GAMBAR_DIIZINKAN as readonly string[]).includes(nilai);
}

/**
 * Mendeteksi tipe gambar berdasarkan magic bytes (bukan header Content-Type
 * yang bisa dipalsukan oleh client).
 */
export function deteksiMimeGambarDariBytes(
  buffer: Uint8Array,
): MimeGambarDiizinkan | null {
  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function ekstensiDariMimeGambar(mime: MimeGambarDiizinkan): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
  }
}

export interface BerkasGambarTervalidasi {
  mime: MimeGambarDiizinkan;
  ekstensi: string;
}

/**
 * Memvalidasi isi berkas gambar: tidak kosong, tidak lebih dari 2 MB, MIME
 * yang diklaim termasuk whitelist, dan magic bytes sesuai gambar yang valid.
 */
export function validasiBerkasGambar(
  buffer: Uint8Array,
  mimeDiklaim: string,
): BerkasGambarTervalidasi {
  if (buffer.length === 0) {
    throw new ValidasiGambarError("File gambar tidak boleh kosong.");
  }

  if (buffer.length > UKURAN_GAMBAR_MAKS_BYTE) {
    throw new ValidasiGambarError("Ukuran gambar maksimal 2 MB.");
  }

  if (!adalahMimeGambarDiizinkan(mimeDiklaim)) {
    throw new ValidasiGambarError(
      "Tipe file tidak diizinkan. Gunakan JPEG, PNG, atau WEBP.",
    );
  }

  const mime = deteksiMimeGambarDariBytes(buffer);

  if (mime === null) {
    throw new ValidasiGambarError(
      "Isi file bukan gambar yang valid (magic bytes tidak dikenali).",
    );
  }

  return { mime, ekstensi: ekstensiDariMimeGambar(mime) };
}

export const validasiFileGambar = validasiBerkasGambar;
