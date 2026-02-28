/** Compute the avatar image filename from a numeric avatar ID.
 *  When avatarNames is provided, index into it (1-based). Otherwise fall back to avatar-NN.png. */
export function avatarImageFile(avatarId: string, avatarNames?: string[]): string {
  const num = parseInt(avatarId, 10);
  if (isNaN(num) || num < 1) return avatarNames?.[0] ?? 'avatar-01.png';
  if (avatarNames) {
    const idx = ((num - 1) % avatarNames.length);
    return avatarNames[idx];
  }
  return `avatar-${String(num).padStart(2, '0')}.png`;
}
