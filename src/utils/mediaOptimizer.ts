/**
 * Media optimization and compression utilities.
 * Reduces raw photo payloads from ~10MB to ~150KB via Canvas downsampling,
 * optimizing memory, database payload limits, network bandwidth, and battery.
 */

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

/**
 * Compresses an image file with aspect ratio preservation.
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scaled dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to create canvas 2D context.'));
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP if supported, fallback to JPEG
        const outputMime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image into blob.'));
              return;
            }
            resolve({
              dataUrl,
              blob,
              width,
              height,
              originalSize: file.size,
              compressedSize: blob.size
            });
          },
          outputMime,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validates a media file for transmission limits.
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    return { valid: false, error: 'Only images and video files are supported.' };
  }

  // 15MB limit for videos to ensure smooth real-time delivery
  if (isVideo && file.size > 15 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Video exceeds 15MB size limit. Please select a shorter or compressed clip.'
    };
  }

  // 12MB limit for raw images before compression
  if (isImage && file.size > 12 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Image is larger than 12MB. Please select a smaller photo.'
    };
  }

  return { valid: true };
}

/**
 * Format bytes to readable string (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
