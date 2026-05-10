import { useEffect, useState } from "react";
import { rpc } from "@/views/main/lib/rpc";

const resolvedMediaUrls = new Map<string, string>();

const needsRendererResolution = (url: string): boolean => {
  try {
    return new URL(url).protocol === "file:";
  } catch {
    return false;
  }
};

const getInitialUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  return needsRendererResolution(url) ? null : url;
};

export function useRendererMediaUrl(
  url: string | null | undefined,
): string | null {
  const [resolvedUrl, setResolvedUrl] = useState(() => getInitialUrl(url));

  useEffect(() => {
    let cancelled = false;

    if (!url) {
      setResolvedUrl(null);
      return () => {
        cancelled = true;
      };
    }

    if (!needsRendererResolution(url)) {
      setResolvedUrl(url);
      return () => {
        cancelled = true;
      };
    }

    const cachedUrl = resolvedMediaUrls.get(url);

    if (cachedUrl) {
      setResolvedUrl(cachedUrl);
      return () => {
        cancelled = true;
      };
    }

    setResolvedUrl(null);

    void rpc.requestProxy
      .resolveMediaUrl({ url })
      .then((result) => {
        resolvedMediaUrls.set(url, result.url);

        if (!cancelled) {
          setResolvedUrl(result.url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return resolvedUrl;
}
