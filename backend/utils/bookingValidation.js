const PHOTO_URL_PATTERN = /\/storage\/v1\/object\/public\/photos\/.+\.(jpe?g|png)$/i;

export function validatePhotoUrl(photo_url) {
  if (!photo_url || typeof photo_url !== "string") {
    return "A valid photo is required.";
  }
  const trimmed = photo_url.trim();
  if (!trimmed.startsWith("https://") || !PHOTO_URL_PATTERN.test(trimmed)) {
    return "A valid photo is required.";
  }
  return null;
}
