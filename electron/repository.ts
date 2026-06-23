export const GITHUB_OWNER = process.env.GITHUB_OWNER || 'Flux-Tasks';
export const GITHUB_REPO = process.env.GITHUB_REPO || 'Flux-Tasks';
export const GITHUB_REPOSITORY = `${GITHUB_OWNER}/${GITHUB_REPO}`;
export const GITHUB_REPOSITORY_URL = `https://github.com/${GITHUB_REPOSITORY}`;
export const UPDATE_MANIFEST_URL =
  process.env.UPDATE_MANIFEST_URL ||
  `${GITHUB_REPOSITORY_URL}/releases/latest/download/latest.json`;

export function isTrustedUpdateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.hostname === 'github.com') {
      return url.pathname.startsWith(`/${GITHUB_REPOSITORY}/releases/download/`) ||
        url.pathname === `/${GITHUB_REPOSITORY}/releases/latest/download/latest.json`;
    }
    if (url.hostname === 'raw.githubusercontent.com') {
      return url.pathname.startsWith(`/${GITHUB_REPOSITORY}/`);
    }
    return false;
  } catch {
    return false;
  }
}
