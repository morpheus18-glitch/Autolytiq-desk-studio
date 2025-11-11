export function isMobileNavSuppressed(path: string): boolean {
  // Hide mobile nav on deal worksheet pages (high-focus workflow)
  return path.startsWith('/deals/') && path !== '/deals';
}
