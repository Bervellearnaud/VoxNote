function computeScaledDimensions(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToJpegResult(canvas, quality = 0.82) {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Impossible de traiter l'image capturée."));
          return;
        }
        resolve({
          blob,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Capture une image fixe depuis un flux <video> actif (webcam / caméra mobile)
 * et la compresse proprement en JPEG.
 */
export async function captureVideoFrame(
  videoElement,
  { maxDimension = 1280, quality = 0.82, mirror = false } = {}
) {
  const rawWidth = videoElement.videoWidth || 1280;
  const rawHeight = videoElement.videoHeight || 720;
  const { width, height } = computeScaledDimensions(
    rawWidth,
    rawHeight,
    maxDimension
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoElement, 0, 0, width, height);
  return canvasToJpegResult(canvas, quality);
}

/**
 * Redimensionne et compresse un fichier image importé (appareil photo mobile ou galerie).
 */
export async function compressImageFile(
  file,
  { maxDimension = 1280, quality = 0.82 } = {}
) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("Impossible de lire le fichier image sélectionné."));
      image.src = objectUrl;
    });

    const { width, height } = computeScaledDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxDimension
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return await canvasToJpegResult(canvas, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
