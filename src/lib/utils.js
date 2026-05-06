/**
 * Utility for merging class names (lightweight cn alternative)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
