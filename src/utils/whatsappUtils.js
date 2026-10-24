/**
 * Nettoie un numéro de téléphone international pour l'API officielle wa.me
 * Exemple : "+225 07 01 02 03 04" -> "2250701020304"
 */
export function cleanWhatsAppPhone(rawPhone = '') {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  return digits.replace(/\D/g, '');
}

/**
 * Formate proprement une note VoxNote avec la syntaxe native WhatsApp (*gras*, _italique_)
 */
export function formatNoteForWhatsApp(
  note,
  { includePhotoCaptions = true, includePhotoLinks = false } = {}
) {
  if (!note) return '';

  const lines = [];
  lines.push(`📝 *${(note.title || 'Note').trim()}*`);

  if (note.content && note.content.trim()) {
    lines.push('');
    lines.push(note.content.trim());
  }

  const photos = Array.isArray(note.photos) ? note.photos : [];
  if (photos.length > 0 && (includePhotoCaptions || includePhotoLinks)) {
    const photoLines = [];

    photos.forEach((photo, idx) => {
      const label = `Photo ${idx + 1}`;
      const caption = includePhotoCaptions ? (photo.caption || '').trim() : '';
      const hasHttpUrl =
        includePhotoLinks &&
        typeof photo.url === 'string' &&
        photo.url.startsWith('http');

      if (caption && hasHttpUrl) {
        photoLines.push(`• *${label}* : ${caption}\n  🔗 ${photo.url}`);
      } else if (caption) {
        photoLines.push(`• *${label}* : ${caption}`);
      } else if (hasHttpUrl) {
        photoLines.push(`• *${label}* : ${photo.url}`);
      }
    });

    if (photoLines.length > 0) {
      lines.push('');
      lines.push(`📷 *Photos jointes (${photos.length}) :*`);
      lines.push(...photoLines);
    }
  }

  lines.push('');
  lines.push('_Envoyé via VoxNote_');

  return lines.join('\n');
}

/**
 * Génère l'URL officielle WhatsApp (compatible mobile Android/iOS, WhatsApp Web et Desktop)
 */
export function buildWhatsAppUrl({ message, phone = '' }) {
  const cleanPhone = cleanWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message || '');
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Vérifie si le navigateur (principalement mobile Android/iOS) supporte le partage natif de fichiers
 */
export function canNativeShareFiles() {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}

/**
 * Partage la note + les fichiers images JPEG réels via le menu natif mobile (vers WhatsApp, etc.)
 */
export async function shareNoteWithPhotoFiles(note, messageText) {
  if (!canNativeShareFiles()) {
    throw new Error(
      "Le partage direct de fichiers images n'est supporté que sur navigateur mobile compatible."
    );
  }

  const photos = Array.isArray(note?.photos) ? note.photos : [];
  const files = [];

  for (let i = 0; i < photos.length; i += 1) {
    const src = photos[i].url || photos[i].dataUrl;
    if (!src) continue;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';
      files.push(
        new File([blob], `voxnote-photo-${i + 1}.${ext}`, {
          type: blob.type || 'image/jpeg',
        })
      );
    } catch {
      // Ignore une photo inaccessible et continue avec le reste
    }
  }

  if (files.length > 0 && navigator.canShare({ files })) {
    await navigator.share({
      title: note.title || 'Note VoxNote',
      text: messageText,
      files,
    });
    return;
  }

  await navigator.share({
    title: note.title || 'Note VoxNote',
    text: messageText,
  });
}
