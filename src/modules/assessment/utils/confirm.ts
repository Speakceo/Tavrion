export function confirmAction(message: string): boolean {
  return window.confirm(message);
}

export function confirmDelete(label: string): boolean {
  return confirmAction(
    `Delete "${label}"? This cannot be undone. Related attempts and links may also be removed.`,
  );
}
