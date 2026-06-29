import sharp from "sharp";

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "application/pdf",
];

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_BYTES   =  5 * 1024 * 1024; //  5 MB
const MIN_SRC_WIDTH   = 600;
const MIN_SRC_HEIGHT  = 400;
const MAX_OUT_WIDTH   = 1600;
const MAX_OUT_HEIGHT  = 1200;
const JPEG_QUALITY    = 80;

export interface ProcessResult {
  buffer:      Buffer;
  contentType: string;
  extension:   string;
  sizeKB:      number;
  format:      string;
  width?:      number;
  height?:     number;
}

export class DocumentUploadError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "DocumentUploadError";
  }
}

export async function processDocumentUpload(
  inputBuffer: Buffer,
  mimeType:    string,
): Promise<ProcessResult> {
  const mime = mimeType.toLowerCase().trim();

  if (!ACCEPTED_MIME_TYPES.includes(mime)) {
    throw new DocumentUploadError(
      `Unsupported MIME type: ${mime}`,
      "File type not accepted. Please upload a photo (JPG, PNG, HEIC) or PDF document.",
    );
  }

  if (inputBuffer.length > MAX_INPUT_BYTES) {
    throw new DocumentUploadError(
      `Input too large: ${inputBuffer.length} bytes`,
      "File too large. Maximum size is 10 MB. Please compress the file and try again.",
    );
  }

  // ── PDF path ──────────────────────────────────────────────────────────────
  if (mime === "application/pdf") {
    if (inputBuffer.length > MAX_PDF_BYTES) {
      throw new DocumentUploadError(
        `PDF too large: ${inputBuffer.length} bytes`,
        "PDF too large. Maximum size is 5 MB. Please use a compressed or smaller PDF.",
      );
    }
    return {
      buffer:      inputBuffer,
      contentType: "application/pdf",
      extension:   ".pdf",
      sizeKB:      Math.round(inputBuffer.length / 1024),
      format:      "pdf",
    };
  }

  // ── Image path ────────────────────────────────────────────────────────────
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(inputBuffer).metadata();
  } catch {
    throw new DocumentUploadError(
      `sharp could not read image (mime: ${mime})`,
      "Could not read the image file. Please upload a clear photo of the document and try again.",
    );
  }

  const srcWidth  = metadata.width  ?? 0;
  const srcHeight = metadata.height ?? 0;

  if (srcWidth < MIN_SRC_WIDTH || srcHeight < MIN_SRC_HEIGHT) {
    throw new DocumentUploadError(
      `Image too small: ${srcWidth}×${srcHeight}px`,
      `Image is too small (${srcWidth}×${srcHeight}px). Please retake the photo closer to the document and ensure good lighting.`,
    );
  }

  let processed: Buffer;
  try {
    processed = await sharp(inputBuffer)
      .resize({
        width:              MAX_OUT_WIDTH,
        height:             MAX_OUT_HEIGHT,
        fit:                "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    throw new DocumentUploadError(
      `sharp processing failed: ${err}`,
      "Could not process the image. If you are using an iPhone, please try saving the photo as JPG first, or upload a PDF version of the document.",
    );
  }

  if (processed.length < 20 * 1024) {
    throw new DocumentUploadError(
      `Processed image suspiciously small: ${processed.length} bytes`,
      "Processed image appears corrupted. Please try a different photo.",
    );
  }

  const outMeta = await sharp(processed).metadata();

  return {
    buffer:      processed,
    contentType: "image/jpeg",
    extension:   ".jpg",
    sizeKB:      Math.round(processed.length / 1024),
    format:      "jpeg",
    width:       outMeta.width,
    height:      outMeta.height,
  };
}
