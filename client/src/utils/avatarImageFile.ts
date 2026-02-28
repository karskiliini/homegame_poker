/** Compute the avatar image filename from a numeric avatar ID */
export function avatarImageFile(avatarId: string): string {
  const num = parseInt(avatarId, 10);
  if (isNaN(num) || num < 1) return 'avatar-01.png';
  return `avatar-${String(num).padStart(2, '0')}.png`;
}
