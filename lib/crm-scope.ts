import type { Page } from "./types";

// 고객관리양식은 사업부(스탯포디그리 / 플루엔토)별로 분리된다.
// 연도 페이지 제목에 "플루엔토"가 들어 있으면 플루엔토 소속으로 본다.
export type CrmScope = "statfordegree" | "fluento";

const FLUENTO_MARK = "플루엔토";

export const CRM_SCOPE_LABEL: Record<CrmScope, string> = {
  statfordegree: "스탯포디그리",
  fluento: "플루엔토",
};

export const CRM_HUB_HREF: Record<CrmScope, string> = {
  statfordegree: "/crm",
  fluento: "/fluento/crm",
};

export function isYearTitle(title: string): boolean {
  return /^\d{4}년/.test(title);
}

export function scopeOfYearTitle(title: string): CrmScope {
  return title.includes(FLUENTO_MARK) ? "fluento" : "statfordegree";
}

export function crmYearTitle(scope: CrmScope, year: number | string): string {
  return scope === "fluento" ? `${year}년 ${FLUENTO_MARK} 고객관리양식` : `${year}년 고객관리양식`;
}

// 결정적 ID: 어느 PC에서 만들어도 동일한 ID (사업부별로 접두어가 다름)
export function crmYearPageId(scope: CrmScope, year: number): string {
  return scope === "fluento" ? `fluento-crm-year-${year}` : `crm-year-${year}`;
}

export function crmMonthPageId(scope: CrmScope, year: number, month: number): string {
  const mm = String(month).padStart(2, "0");
  return scope === "fluento" ? `fluento-crm-month-${year}-${mm}` : `crm-month-${year}-${mm}`;
}

// 월 페이지가 속한 사업부 (부모 연도 페이지 제목 기준). 연도 하위 월 페이지가 아니면 null
export function scopeOfMonthPage(pages: Record<string, Page>, monthPageId: string | null | undefined): CrmScope | null {
  if (!monthPageId) return null;
  const parentId = pages[monthPageId]?.parentId;
  const parent = parentId ? pages[parentId] : undefined;
  if (!parent || !isYearTitle(parent.title)) return null;
  return scopeOfYearTitle(parent.title);
}
