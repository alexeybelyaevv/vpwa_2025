export function chatTitleToSlug(title: string): string {
  const normalized = title.trim().toLowerCase();
  const cleaned = normalized
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (cleaned) return cleaned;

  // Fallback to a safe slug when all characters were stripped (e.g., symbols-only title)
  return encodeURIComponent(normalized || 'channel').replace(/%/g, '-');
}
