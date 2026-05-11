import { formatDistanceToNow } from "date-fns";

const toValidDate = (value: string): Date | null => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatRelativeTime = (
  value: string,
  {
    addSuffix = true,
    fallback = "Unknown date",
  }: { addSuffix?: boolean; fallback?: string } = {},
): string => {
  const date = toValidDate(value);

  if (!date) return fallback;

  try {
    return formatDistanceToNow(date, { addSuffix });
  } catch {
    return fallback;
  }
};

export const formatClockTime = (
  value: string,
  fallback = "Unknown time",
): string => {
  const date = toValidDate(value);

  if (!date) return fallback;

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return fallback;
  }
};
