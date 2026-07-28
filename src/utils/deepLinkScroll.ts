export function getSavedItemHref(itemType: string, itemId: string): string | null {
  switch (itemType) {
    case 'post':
      return `/social#post-${itemId}`;
    case 'poll':
      return `/polls#poll-${itemId}`;
    case 'event':
      return `/events#event-${itemId}`;
    case 'shot':
      return '/shots';
    case 'course':
      return '/courses';
    default:
      return null;
  }
}

export function scrollToHashTarget(prefix: string, loading = false) {
  if (loading) return;

  const hash = window.location.hash;
  const marker = `#${prefix}-`;
  if (!hash.startsWith(marker)) return;

  const targetId = `${prefix}-${hash.slice(marker.length)}`;

  window.requestAnimationFrame(() => {
    const el = document.getElementById(targetId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('saved-hash-target');
    window.setTimeout(() => el.classList.remove('saved-hash-target'), 2200);
  });
}
