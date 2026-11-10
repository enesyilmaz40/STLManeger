/**
 * Formats a local Windows file path into a compliant custom protocol URL.
 */
export function getAssetUrl(filePath: string | null | undefined): string {
  if (!filePath) return '';
  return `app-asset://local/?path=${encodeURIComponent(filePath)}`;
}

