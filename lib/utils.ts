import { type ClassValue, clsx } from "clsx";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ko,
    });
  } catch {
    return "";
  }
}

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), "yyyy.MM.dd", { locale: ko });
  } catch {
    return "";
  }
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export const STATUS_LABELS: Record<string, string> = {
  todo: "할 일",
  "in-progress": "진행 중",
  done: "완료",
};
