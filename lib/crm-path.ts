const DEFAULT_CRM_SECRET_PATH = "yonetim-7kq4m9x2v8p5";

export function normalizePath(path: string | null | undefined): string {
  const raw = (path ?? "").trim();
  if (!raw) return "";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function getCrmSecretPath(): string {
  return normalizePath(process.env.CRM_SECRET_PATH) || `/${DEFAULT_CRM_SECRET_PATH}`;
}

export function isCrmSecretPath(pathname: string): boolean {
  return normalizePath(pathname) === getCrmSecretPath();
}
