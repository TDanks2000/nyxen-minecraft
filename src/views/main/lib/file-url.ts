const encodeFilePath = (path: string): string =>
  path
    .split("/")
    .map((segment, index) =>
      index === 0 && /^[A-Za-z]:$/.test(segment)
        ? segment
        : encodeURIComponent(segment),
    )
    .join("/");

export const toLocalFileUrl = (path: string): string => {
  const normalized = path.replaceAll("\\", "/");

  if (normalized.startsWith("//")) {
    const [, , host = "", ...segments] = normalized.split("/");
    const encodedPath = segments.map(encodeURIComponent).join("/");

    return new URL(`file://${host}/${encodedPath}`).toString();
  }

  const encodedPath = encodeFilePath(normalized);

  if (/^[A-Za-z]:\//.test(normalized)) {
    return new URL(`file:///${encodedPath}`).toString();
  }

  return new URL(
    encodedPath.startsWith("/")
      ? `file://${encodedPath}`
      : `file:///${encodedPath}`,
  ).toString();
};
