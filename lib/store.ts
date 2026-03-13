import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { WorkspaceState, Page, Task, Customer, StatusOption, ManualNode, ManualPageData } from "./types";
import {
  dbPages,
  dbTasks,
  dbCustomers,
  dbCustomerStatuses,
  dbManualNodes,
  dbManualPageRoots,
  dbWorkspaceConfig,
} from "./db";
import { isSupabaseConfigured, supabase } from "./supabase";

// Fixed IDs for the manual page hierarchy
export const MENU_IDS = {
  MANUAL: "menu-manual",
  MANUAL_ANALYSIS: "menu-manual-analysis",
  MANUAL_PROCESS: "menu-manual-process",
  MANUAL_SPSS: "menu-manual-spss",
  MANUAL_SPSS_EFA: "menu-manual-spss-efa",
  MANUAL_SPSS_CROSS: "menu-manual-spss-cross",
  MANUAL_SPSS_FREQ: "menu-manual-spss-freq",
  MANUAL_SPSS_DESC: "menu-manual-spss-desc",
  MANUAL_SPSS_CORR: "menu-manual-spss-corr",
  MANUAL_SPSS_DIFF: "menu-manual-spss-diff",
  MANUAL_SPSS_REG: "menu-manual-spss-reg",
  MANUAL_SPSS_MED: "menu-manual-spss-med",
  MANUAL_SPSS_MOD: "menu-manual-spss-mod",
  MANUAL_SPSS_PROC: "menu-manual-spss-proc",
  MANUAL_AMOS: "menu-manual-amos",
  MANUAL_AMOS_CFA: "menu-manual-amos-cfa",
  MANUAL_AMOS_DISC: "menu-manual-amos-disc",
  MANUAL_AMOS_SEM: "menu-manual-amos-sem",
  MANUAL_AMOS_MED: "menu-manual-amos-med",
  MANUAL_AMOS_MOD: "menu-manual-amos-mod",
  MANUAL_POCKET: "menu-manual-pocket",
  MANUAL_POCKET_PPT: "menu-manual-pocket-ppt",
  MANUAL_POCKET_TABLE: "menu-manual-pocket-table",
  MANUAL_POCKET_EXCEL: "menu-manual-pocket-excel",
  MANUAL_POCKET_GRAPH: "menu-manual-pocket-graph",
  MANUAL_POCKET_IPA: "menu-manual-pocket-ipa",
  MANUAL_POCKET_BORICH: "menu-manual-pocket-borich",
  MANUAL_POCKET_FORM: "menu-manual-pocket-form",
  MANUAL_POCKET_APA: "menu-manual-pocket-apa",
  MANUAL_CHECKLIST: "menu-manual-checklist",
  TAX: "menu-tax",
  ADMATCH: "menu-admatch",
  STATGENIE: "menu-statgenie",
} as const;

const now = new Date().toISOString();

function makeEmptyDoc(text: string) {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text }],
      },
      { type: "paragraph", content: [] },
    ],
  });
}

function p(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function h2(text: string) {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function h3(text: string) {
  return { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] };
}

function blist(...items: string[]) {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    })),
  };
}

function calloutYellow(text: string) {
  return {
    type: "calloutBlock",
    attrs: { emoji: "📌", color: "yellow" },
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", marks: [{ type: "bold" }], text: "필독" },
          { type: "text", text: ` — ${text}` },
        ],
      },
    ],
  };
}

function quote(text: string) {
  return {
    type: "blockquote",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function makeAnalysisManualContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      calloutYellow("분석 시작 전 반드시 읽어주세요."),

      h2("📁 SPSS 파일 정리법"),
      blist(
        "맨 왼쪽에 No 변수 만들어주기",
        "인구통계 범주화 한 변수는 기존 인구통계 변수 바로 옆에 붙여주기",
        "EFA에서 삭제되는 문항, 역코딩 후 원래 문항 등 분석에 사용하지 않는 문항은 맨 위로 이동",
        "하위요인 네이밍 후 같은 하위요인끼리 정리",
        "평균 또는 합계 계산 시 변수이름+평균 형식으로 네이밍 (예: 자기효능감평균, 자기효능감합계)",
        "상위요인은 전체평균 / 전체합계 사용",
        "일반적 특성 각 범주 라벨링"
      ),

      h2("⚠️ 분석 시 주의사항"),
      blist(
        "변수 수정 과정에서 원래 변수 삭제 금지",
        "데이터 수정 후 이전 SPSS 파일 히스토리 보관",
        "분석 시작 날짜에 고객에게 분석 시작 안내",
        "분석 전 논문 주제와 분석방법 전체 흐름 확인"
      ),

      h2("📊 모논문 없을 때 표 해석 규칙"),

      h3("소수점 규칙"),
      blist(
        "t / F / p 값 → #.000 형식",
        "기술통계 최소값, 최대값, 평균, 표준편차 → 0.00 형식",
        "p=.000 → p<.001로 변경"
      ),

      h3("표 작성 기본 규칙"),
      blist(
        "표의 세로선 제거",
        "굵은 선은 필수 아님",
        "(N=) 표시는 필요할 때만 사용",
        "표와 해석 글씨는 모두 바탕글로 통일"
      ),

      h3("1️⃣ 빈도분석 해석 작성 방식"),
      p("① 어떤 분석을 진행했는지 서술"),
      quote("응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 <표 1>과 같이 나타내었다."),
      p("② 가장 많은 집단부터 순서대로 서술"),
      quote("성별에서는 여성이 127명(62.6%)으로 남성보다 높은 비율을 차지하였다. 연령은 30대, 40대, 20대, 50대, 10대 순으로 나타났다."),

      h3("차이검정 해석 작성 규칙"),
      p("표 순서: N → M → SD → t/F → p → Scheffe"),
      {
        type: "paragraph",
        content: [{ type: "text", marks: [{ type: "bold" }], text: "사후검정 규칙:" }],
      },
      blist(
        "ANOVA 유의하지만 사후검정 안 나뉘면 (n/a)",
        "사후검정 알파벳 a,b,c 순서",
        "ANOVA 유의하지 않으면 사후검정 기재하지 않음"
      ),

      h3("상관관계 해석 규칙"),
      p("서술 순서 예시 (상위요인 4개): 외상후성장→의도적반추 / 외상후성장→자기노출 / 외상후성장→사회적지지 / 의도적반추→자기노출 / 의도적반추→사회적지지 / 자기노출→사회적지지"),

      h3("회귀분석 표 작성 규칙"),
      p("표에는 아래 항목을 포함:"),
      blist("B", "SE", "Beta", "t", "p", "VIF", "R²", "Adjusted R²", "Durbin-Watson"),
      p("더미변수 사용 시 Reference 표시"),
    ],
  });
}

function makeProcessManualContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      h2("1. 엑셀 데이터 클리닝"),
      blist(
        "역문항 확인",
        "하위문항 확인",
        "변수계산 방식 확인",
        "No 변수 추가",
        "문항번호 정리",
        "한글 응답을 숫자로 변환",
        "역코딩 후 변수 계산"
      ),

      h2("2. SPSS 데이터 클리닝"),
      {
        type: "paragraph",
        content: [{ type: "text", marks: [{ type: "bold" }], text: "확인사항:" }],
      },
      blist(
        "빈도분석으로 결측치 확인",
        "기술통계로 이상치 확인",
        "역코딩",
        "신뢰도 분석",
        "변수 계산",
        "정규성 검정"
      ),
    ],
  });
}

function makeSpssContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      p("각 분석 항목을 클릭하여 세부 내용을 확인하세요."),
    ],
  });
}

function makeAmosContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      p("각 분석 항목을 클릭하여 세부 내용을 확인하세요."),
    ],
  });
}

function makePocketContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      p("자주 쓰는 자료를 모아두는 저장 페이지입니다. 각 항목을 클릭하여 자료를 확인하세요."),
    ],
  });
}

function makePage(
  id: string,
  title: string,
  emoji: string,
  parentId: string | null,
  children: string[],
  content: string,
  isExpanded = false
): [string, Page] {
  return [
    id,
    {
      id,
      title,
      emoji,
      content,
      parentId,
      children,
      createdAt: now,
      updatedAt: now,
      isExpanded,
    },
  ];
}

const initialPages: Record<string, Page> = Object.fromEntries([
  // Root: 메뉴얼
  makePage(
    MENU_IDS.MANUAL,
    "메뉴얼",
    "📋",
    null,
    [MENU_IDS.MANUAL_ANALYSIS, MENU_IDS.MANUAL_CHECKLIST],
    makeEmptyDoc("메뉴얼"),
    true
  ),

  // 분석 시 메뉴얼 (with rich content + 4 child pages)
  makePage(
    MENU_IDS.MANUAL_ANALYSIS,
    "분석 시 메뉴얼",
    "📊",
    MENU_IDS.MANUAL,
    [MENU_IDS.MANUAL_PROCESS, MENU_IDS.MANUAL_SPSS, MENU_IDS.MANUAL_AMOS, MENU_IDS.MANUAL_POCKET],
    makeAnalysisManualContent(),
    false
  ),

  // 분석과정 메뉴얼
  makePage(
    MENU_IDS.MANUAL_PROCESS,
    "분석과정 메뉴얼",
    "🔄",
    MENU_IDS.MANUAL_ANALYSIS,
    [],
    makeProcessManualContent()
  ),

  // 통계분석(SPSS)
  makePage(
    MENU_IDS.MANUAL_SPSS,
    "통계분석(SPSS)",
    "📈",
    MENU_IDS.MANUAL_ANALYSIS,
    [
      MENU_IDS.MANUAL_SPSS_EFA,
      MENU_IDS.MANUAL_SPSS_CROSS,
      MENU_IDS.MANUAL_SPSS_FREQ,
      MENU_IDS.MANUAL_SPSS_DESC,
      MENU_IDS.MANUAL_SPSS_CORR,
      MENU_IDS.MANUAL_SPSS_DIFF,
      MENU_IDS.MANUAL_SPSS_REG,
      MENU_IDS.MANUAL_SPSS_MED,
      MENU_IDS.MANUAL_SPSS_MOD,
      MENU_IDS.MANUAL_SPSS_PROC,
    ],
    makeSpssContent()
  ),

  // SPSS sub-pages
  makePage(MENU_IDS.MANUAL_SPSS_EFA, "탐색적 요인분석", "🔍", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("탐색적 요인분석")),
  makePage(MENU_IDS.MANUAL_SPSS_CROSS, "교차분석", "✖️", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("교차분석")),
  makePage(MENU_IDS.MANUAL_SPSS_FREQ, "빈도분석", "📊", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("빈도분석")),
  makePage(MENU_IDS.MANUAL_SPSS_DESC, "기술통계", "📉", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("기술통계")),
  makePage(MENU_IDS.MANUAL_SPSS_CORR, "상관관계 분석", "🔗", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("상관관계 분석")),
  makePage(MENU_IDS.MANUAL_SPSS_DIFF, "차이검정", "⚖️", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("차이검정")),
  makePage(MENU_IDS.MANUAL_SPSS_REG, "다중회귀분석", "📐", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("다중회귀분석")),
  makePage(MENU_IDS.MANUAL_SPSS_MED, "매개효과", "🔀", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("매개효과")),
  makePage(MENU_IDS.MANUAL_SPSS_MOD, "조절효과", "🎛️", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("조절효과")),
  makePage(MENU_IDS.MANUAL_SPSS_PROC, "PROCESS Macro", "⚙️", MENU_IDS.MANUAL_SPSS, [], makeEmptyDoc("PROCESS Macro")),

  // 통계분석(AMOS)
  makePage(
    MENU_IDS.MANUAL_AMOS,
    "통계분석(AMOS)",
    "🔷",
    MENU_IDS.MANUAL_ANALYSIS,
    [
      MENU_IDS.MANUAL_AMOS_CFA,
      MENU_IDS.MANUAL_AMOS_DISC,
      MENU_IDS.MANUAL_AMOS_SEM,
      MENU_IDS.MANUAL_AMOS_MED,
      MENU_IDS.MANUAL_AMOS_MOD,
    ],
    makeAmosContent()
  ),

  // AMOS sub-pages
  makePage(MENU_IDS.MANUAL_AMOS_CFA, "CFA", "🔷", MENU_IDS.MANUAL_AMOS, [], makeEmptyDoc("CFA")),
  makePage(MENU_IDS.MANUAL_AMOS_DISC, "판별타당성", "✅", MENU_IDS.MANUAL_AMOS, [], makeEmptyDoc("판별타당성")),
  makePage(MENU_IDS.MANUAL_AMOS_SEM, "구조방정식", "🔗", MENU_IDS.MANUAL_AMOS, [], makeEmptyDoc("구조방정식")),
  makePage(MENU_IDS.MANUAL_AMOS_MED, "AMOS 매개효과", "🔀", MENU_IDS.MANUAL_AMOS, [], makeEmptyDoc("AMOS 매개효과")),
  makePage(MENU_IDS.MANUAL_AMOS_MOD, "AMOS 조절효과", "🎛️", MENU_IDS.MANUAL_AMOS, [], makeEmptyDoc("AMOS 조절효과")),

  // 통계주머니
  makePage(
    MENU_IDS.MANUAL_POCKET,
    "통계주머니",
    "🗨️",
    MENU_IDS.MANUAL_ANALYSIS,
    [
      MENU_IDS.MANUAL_POCKET_PPT,
      MENU_IDS.MANUAL_POCKET_TABLE,
      MENU_IDS.MANUAL_POCKET_EXCEL,
      MENU_IDS.MANUAL_POCKET_GRAPH,
      MENU_IDS.MANUAL_POCKET_IPA,
      MENU_IDS.MANUAL_POCKET_BORICH,
      MENU_IDS.MANUAL_POCKET_FORM,
      MENU_IDS.MANUAL_POCKET_APA,
    ],
    makePocketContent()
  ),

  // 통계주머니 sub-pages
  makePage(MENU_IDS.MANUAL_POCKET_PPT, "연구모형 PPT", "🖥️", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("연구모형 PPT")),
  makePage(MENU_IDS.MANUAL_POCKET_TABLE, "한글표 제작 꿀팁", "📋", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("한글표 제작 꿀팁")),
  makePage(MENU_IDS.MANUAL_POCKET_EXCEL, "Excel 함수", "📊", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("Excel 함수")),
  makePage(MENU_IDS.MANUAL_POCKET_GRAPH, "Graph 자료", "📈", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("Graph 자료")),
  makePage(MENU_IDS.MANUAL_POCKET_IPA, "IPA 분석", "🎯", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("IPA 분석")),
  makePage(MENU_IDS.MANUAL_POCKET_BORICH, "Borich 요구도", "📌", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("Borich 요구도")),
  makePage(MENU_IDS.MANUAL_POCKET_FORM, "분석 표 양식", "📄", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("분석 표 양식")),
  makePage(MENU_IDS.MANUAL_POCKET_APA, "APA 형식", "📝", MENU_IDS.MANUAL_POCKET, [], makeEmptyDoc("APA 형식")),

  // 크레도/응대 체크리스트
  makePage(
    MENU_IDS.MANUAL_CHECKLIST,
    "크레도 / 응대 체크리스트",
    "✅",
    MENU_IDS.MANUAL,
    [],
    JSON.stringify({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "고객 첫 응대 완료" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "요구사항 파악" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "분석 일정 확인" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "분석 결과 전달" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "AS 안내 및 마무리" }] }],
            },
          ],
        },
      ],
    })
  ),

  // Other root pages
  makePage(MENU_IDS.TAX, "세금 메뉴얼", "💰", null, [], makeEmptyDoc("세금 메뉴얼")),
  makePage(MENU_IDS.ADMATCH, "AdMatch", "📢", null, [], makeEmptyDoc("AdMatch")),
  makePage(MENU_IDS.STATGENIE, "스탯지니", "🤖", null, [], makeEmptyDoc("스탯지니")),
]);

// 업무보드는 빈 상태로 시작 (직접 추가해서 사용)
const initialTasks: Task[] = [];

const initialCustomers: Customer[] = [];

const initialCustomerStatuses: StatusOption[] = [
  { id: "status-1", label: "분석전작업", color: "#f3f0ff", textColor: "#7c3aed", category: "할 일" },
  { id: "status-2", label: "프리랜서응대", color: "#fef9c3", textColor: "#854d0e", category: "진행 중" },
  { id: "status-3", label: "A/S중", color: "#fff7ed", textColor: "#9a3412", category: "진행 중" },
  { id: "status-4", label: "외주or분석중", color: "#eff6ff", textColor: "#1d4ed8", category: "진행 중" },
  { id: "status-5", label: "제출완료", color: "#f0fdf4", textColor: "#166534", category: "완료" },
];

// Default fields for Customer (handles migration from old schema)
const customerDefaults: Partial<Customer> = {
  route: "",
  settlement_amount: null,
  alba: "",
  monthPageId: null,
};

const freshState = {
  pages: initialPages,
  rootPageIds: [MENU_IDS.MANUAL, MENU_IDS.TAX, MENU_IDS.ADMATCH, MENU_IDS.STATGENIE],
  tasks: initialTasks,
  customers: initialCustomers,
  customerStatuses: initialCustomerStatuses,
  manualPages: {} as Record<string, ManualPageData>,
  sidebarCollapsed: false,
  darkMode: false,
  isRefreshing: false,
  syncError: false,
};

// ── 일회성 localStorage → Supabase 마이그레이션 ──────────────────────────────
// PC와 노트북 각각의 localStorage 데이터를 Supabase에 업로드합니다.
// updatedAt 기준 충돌 해결: 더 최신인 항목이 Supabase에 저장됩니다.
// 각 기기별로 딱 한 번만 실행됩니다 (localStorage 플래그 사용).
const MIGRATION_FLAG = "statfordegree-hub-migrated-v1";

export async function runMigrationIfNeeded(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "true") return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const state = useWorkspaceStore.getState();
  const defaultPageIds = new Set(Object.values(MENU_IDS) as string[]);
  const DEFAULT_TASK_TITLES = ["팀 메뉴얼 초안 작성", "업무 프로세스 정리"];

  // 마이그레이션할 로컬 데이터 수집
  const localUserPages = Object.values(state.pages).filter(
    (p) => !defaultPageIds.has(p.id)
  );
  const localUserTasks = state.tasks.filter(
    (t) => !DEFAULT_TASK_TITLES.includes(t.title)
  );
  const localUserCustomers = state.customers;

  const hasLocalData =
    localUserPages.length > 0 ||
    localUserTasks.length > 0 ||
    localUserCustomers.length > 0 ||
    Object.keys(state.manualPages).length > 0;

  if (!hasLocalData) {
    localStorage.setItem(MIGRATION_FLAG, "true");
    return;
  }

  console.log("[Migration] localStorage → Supabase 마이그레이션 시작");

  // Supabase 현재 상태 조회 (충돌 해결용)
  const [supaPages, supaTasks, supaCustomers, supaStatuses] = await Promise.all([
    dbPages.fetchAll(),
    dbTasks.fetchAll(),
    dbCustomers.fetchAll(),
    dbCustomerStatuses.fetchAll(),
  ]);

  const pushOps: Promise<void>[] = [];

  // ── Pages: Supabase에 없거나 로컬이 더 최신이면 업로드
  for (const localPage of localUserPages) {
    const supaPage = supaPages[localPage.id];
    if (!supaPage || localPage.updatedAt > supaPage.updatedAt) {
      pushOps.push(dbPages.upsert(localPage));
    }
  }

  // ── Tasks: Supabase에 없거나 로컬이 더 최신이면 업로드
  for (const localTask of localUserTasks) {
    const supaTask = supaTasks.find((t) => t.id === localTask.id);
    if (!supaTask || localTask.updatedAt > supaTask.updatedAt) {
      pushOps.push(dbTasks.upsert(localTask));
    }
  }

  // ── Customers: Supabase에 없거나 로컬이 더 최신이면 업로드
  for (const localCustomer of localUserCustomers) {
    const supaCustomer = supaCustomers.find((c) => c.id === localCustomer.id);
    if (!supaCustomer || localCustomer.updated_at > supaCustomer.updated_at) {
      pushOps.push(dbCustomers.upsert(localCustomer));
    }
  }

  // ── CustomerStatuses: Supabase가 비어있을 때만 업로드
  if (supaStatuses.length === 0 && state.customerStatuses.length > 0) {
    pushOps.push(dbCustomerStatuses.upsertMany(state.customerStatuses));
  }

  // ── ManualPages: 각 노드 업로드
  for (const [pageId, mpd] of Object.entries(state.manualPages)) {
    for (const node of Object.values(mpd.items)) {
      pushOps.push(dbManualNodes.upsert(node, pageId));
    }
    if (mpd.rootItems.length > 0) {
      pushOps.push(dbManualPageRoots.upsert(pageId, mpd.rootItems));
    }
  }

  if (pushOps.length > 0) await Promise.all(pushOps);

  // ── rootPageIds 병합: 로컬 사용자 페이지 + Supabase 사용자 페이지 합집합
  const currentRootConfig = await dbWorkspaceConfig.get("rootPageIds");
  const supaRootIds = (currentRootConfig as string[] | null) ?? [];
  const localUserRootIds = state.rootPageIds.filter(
    (id) => !defaultPageIds.has(id)
  );
  const mergedUserRootIds = [
    ...new Set([
      ...supaRootIds.filter((id) => !defaultPageIds.has(id)),
      ...localUserRootIds,
    ]),
  ];
  // 기본 메뉴 페이지 순서 앞에 유지, 사용자 페이지 뒤에 병합
  const defaultRootOrder = state.rootPageIds.filter((id) =>
    defaultPageIds.has(id)
  );
  const finalRootIds = [
    ...defaultRootOrder,
    ...mergedUserRootIds.filter((id) => !defaultRootOrder.includes(id)),
  ];
  await dbWorkspaceConfig.set("rootPageIds", finalRootIds);

  // 마이그레이션 완료 표시
  localStorage.setItem(MIGRATION_FLAG, "true");
  console.log(
    `[Migration] 완료: pages ${localUserPages.length}개, tasks ${localUserTasks.length}개, customers ${localUserCustomers.length}개 처리`
  );
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...freshState,

      createPage: (parentId = null, insertAfter) => {
        const id = uuidv4();
        const newPage: Page = {
          id,
          title: "제목 없음",
          emoji: "📄",
          content: JSON.stringify({
            type: "doc",
            content: [{ type: "paragraph" }],
          }),
          parentId,
          children: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isExpanded: false,
        };

        set((state) => {
          const newPages = { ...state.pages, [id]: newPage };

          if (parentId) {
            const parent = { ...state.pages[parentId] };
            if (insertAfter) {
              const idx = parent.children.indexOf(insertAfter);
              const newChildren = [...parent.children];
              newChildren.splice(idx + 1, 0, id);
              parent.children = newChildren;
            } else {
              parent.children = [...parent.children, id];
            }
            parent.isExpanded = true;
            newPages[parentId] = parent;
            return { pages: newPages };
          } else {
            let newRootIds = [...state.rootPageIds];
            if (insertAfter) {
              const idx = newRootIds.indexOf(insertAfter);
              newRootIds.splice(idx + 1, 0, id);
            } else {
              newRootIds = [...newRootIds, id];
            }
            return { pages: newPages, rootPageIds: newRootIds };
          }
        });

        // Supabase sync
        const s = get();
        dbPages.upsert(s.pages[id]);
        if (parentId) {
          dbPages.update(parentId, { children: s.pages[parentId].children });
        } else {
          dbWorkspaceConfig.set("rootPageIds", s.rootPageIds);
        }

        return id;
      },

      updatePage: (id, updates) => {
        const updatedAt = new Date().toISOString();
        set((state) => ({
          pages: {
            ...state.pages,
            [id]: {
              ...state.pages[id],
              ...updates,
              updatedAt,
            },
          },
        }));
        // upsert 사용: 행이 없어도 생성, 있으면 업데이트 (update보다 안정적)
        const updatedPage = get().pages[id];
        if (updatedPage) dbPages.upsert(updatedPage);
      },

      deletePage: (id) => {
        // Collect all IDs to delete before modifying state
        const collectIds = (pageId: string, pages: Record<string, Page>): string[] => {
          const p = pages[pageId];
          if (!p) return [];
          return [pageId, ...p.children.flatMap((c) => collectIds(c, pages))];
        };
        const currentPages = get().pages;
        const currentPage = currentPages[id];
        const idsToDelete = collectIds(id, currentPages);

        set((state) => {
          const page = state.pages[id];
          if (!page) return state;

          const deleteRecursive = (
            pageId: string,
            pages: Record<string, Page>
          ): Record<string, Page> => {
            const p = pages[pageId];
            if (!p) return pages;
            let result = { ...pages };
            for (const childId of p.children) {
              result = deleteRecursive(childId, result);
            }
            delete result[pageId];
            return result;
          };

          let newPages = deleteRecursive(id, state.pages);

          if (page.parentId) {
            const parent = newPages[page.parentId];
            if (parent) {
              newPages = {
                ...newPages,
                [page.parentId]: {
                  ...parent,
                  children: parent.children.filter((c) => c !== id),
                },
              };
            }
          }

          const newRootIds = state.rootPageIds.filter((rid) => rid !== id);
          return { pages: newPages, rootPageIds: newRootIds };
        });

        // Supabase sync — delete all recursively collected IDs
        idsToDelete.forEach((pid) => dbPages.delete(pid));
        if (currentPage?.parentId) {
          const s = get();
          const parent = s.pages[currentPage.parentId];
          if (parent) dbPages.update(currentPage.parentId, { children: parent.children });
        } else {
          dbWorkspaceConfig.set("rootPageIds", get().rootPageIds);
        }
      },

      togglePageExpand: (id) => {
        set((state) => ({
          pages: {
            ...state.pages,
            [id]: {
              ...state.pages[id],
              isExpanded: !state.pages[id].isExpanded,
            },
          },
        }));
        const s = get();
        dbPages.update(id, { isExpanded: s.pages[id].isExpanded });
      },

      createTask: (taskData) => {
        const id = uuidv4();
        const task: Task = {
          id,
          ...taskData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ tasks: [...state.tasks, task] }));
        dbTasks.upsert(task);
        return id;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
        const updated = get().tasks.find((t) => t.id === id);
        if (updated) dbTasks.upsert(updated);
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
        dbTasks.delete(id);
      },

      createCustomer: (customerData) => {
        const id = uuidv4();
        const customer: Customer = {
          id,
          ...customerDefaults,
          ...customerData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ customers: [...state.customers, customer] }));
        dbCustomers.upsert(customer);
        return id;
      },

      updateCustomer: (id, updates) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? { ...c, ...updates, updated_at: new Date().toISOString() }
              : c
          ),
        }));
        const updated = get().customers.find((c) => c.id === id);
        if (updated) dbCustomers.upsert(updated);
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
        dbCustomers.delete(id);
      },

      upsertCustomerStatus: (status) => {
        set((state) => {
          const exists = state.customerStatuses.find((s) => s.id === status.id);
          if (exists) {
            return {
              customerStatuses: state.customerStatuses.map((s) =>
                s.id === status.id ? status : s
              ),
            };
          }
          return { customerStatuses: [...state.customerStatuses, status] };
        });
        dbCustomerStatuses.upsert(status);
      },

      deleteCustomerStatus: (id) => {
        set((state) => ({
          customerStatuses: state.customerStatuses.filter((s) => s.id !== id),
        }));
        dbCustomerStatuses.delete(id);
      },

      // ── Manual tree actions ────────────────────────────────────────────────

      addManualNode: (pageId, parentId, afterId) => {
        const id = uuidv4();
        set((state) => {
          const pd = state.manualPages[pageId] ?? { rootItems: [], items: {} };
          const newNode: ManualNode = {
            id, text: "", children: [], parentId, isExpanded: true, isPinned: false,
          };
          const newItems = { ...pd.items, [id]: newNode };

          if (parentId === null) {
            const roots = [...pd.rootItems];
            const idx = afterId ? roots.indexOf(afterId) : -1;
            roots.splice(idx + 1, 0, id);
            return { manualPages: { ...state.manualPages, [pageId]: { rootItems: roots, items: newItems } } };
          } else {
            const parent = { ...newItems[parentId], children: [...(newItems[parentId]?.children ?? [])] };
            const idx = afterId ? parent.children.indexOf(afterId) : -1;
            parent.children.splice(idx + 1, 0, id);
            return { manualPages: { ...state.manualPages, [pageId]: { rootItems: pd.rootItems, items: { ...newItems, [parentId]: parent } } } };
          }
        });
        // Supabase sync
        const pd = get().manualPages[pageId];
        if (pd) {
          dbManualNodes.upsert(pd.items[id], pageId);
          if (parentId) dbManualNodes.upsert(pd.items[parentId], pageId);
          else dbManualPageRoots.upsert(pageId, pd.rootItems);
        }
        return id;
      },

      updateManualNode: (pageId, nodeId, updates) => {
        set((state) => {
          const pd = state.manualPages[pageId];
          if (!pd?.items[nodeId]) return state;
          return {
            manualPages: {
              ...state.manualPages,
              [pageId]: {
                ...pd,
                items: { ...pd.items, [nodeId]: { ...pd.items[nodeId], ...updates } },
              },
            },
          };
        });
        const node = get().manualPages[pageId]?.items[nodeId];
        if (node) dbManualNodes.upsert(node, pageId);
      },

      deleteManualNode: (pageId, nodeId) => {
        // Collect IDs to delete before state change
        const pd = get().manualPages[pageId];
        const idsToDelete: string[] = [];
        if (pd) {
          const collect = (id: string) => {
            idsToDelete.push(id);
            pd.items[id]?.children.forEach(collect);
          };
          collect(nodeId);
        }
        const deletedNode = pd?.items[nodeId];

        set((state) => {
          const pd = state.manualPages[pageId];
          if (!pd) return state;
          const node = pd.items[nodeId];
          if (!node) return state;

          const toDelete = new Set<string>();
          const collect = (id: string) => {
            toDelete.add(id);
            pd.items[id]?.children.forEach(collect);
          };
          collect(nodeId);

          const newItems = Object.fromEntries(
            Object.entries(pd.items).filter(([k]) => !toDelete.has(k))
          );

          let newRoots = pd.rootItems.filter((id) => id !== nodeId);
          if (node.parentId && newItems[node.parentId]) {
            newItems[node.parentId] = {
              ...newItems[node.parentId],
              children: newItems[node.parentId].children.filter((id) => id !== nodeId),
            };
          }

          return {
            manualPages: {
              ...state.manualPages,
              [pageId]: { rootItems: newRoots, items: newItems },
            },
          };
        });
        // Supabase sync
        dbManualNodes.deleteMany(idsToDelete);
        if (deletedNode?.parentId) {
          const parentNode = get().manualPages[pageId]?.items[deletedNode.parentId];
          if (parentNode) dbManualNodes.upsert(parentNode, pageId);
        } else {
          const newRoots = get().manualPages[pageId]?.rootItems ?? [];
          dbManualPageRoots.upsert(pageId, newRoots);
        }
      },

      moveManualNode: (pageId, nodeId, afterNodeId) => {
        set((state) => {
          const pd = state.manualPages[pageId];
          if (!pd || nodeId === afterNodeId) return state;

          const node = pd.items[nodeId];
          const afterNode = pd.items[afterNodeId];
          if (!node || !afterNode) return state;

          const isDesc = (checkId: string): boolean => {
            if (checkId === nodeId) return true;
            return pd.items[checkId]?.children.some(isDesc) ?? false;
          };
          if (isDesc(afterNodeId)) return state;

          let newItems = { ...pd.items };
          let newRoots = [...pd.rootItems];

          if (node.parentId === null) {
            newRoots = newRoots.filter((id) => id !== nodeId);
          } else {
            const op = { ...newItems[node.parentId] };
            op.children = op.children.filter((id) => id !== nodeId);
            newItems[node.parentId] = op;
          }

          const newParentId = afterNode.parentId;
          newItems[nodeId] = { ...newItems[nodeId], parentId: newParentId };

          if (newParentId === null) {
            const idx = newRoots.indexOf(afterNodeId);
            newRoots.splice(idx + 1, 0, nodeId);
          } else {
            const np = { ...newItems[newParentId] };
            const children = [...np.children];
            const idx = children.indexOf(afterNodeId);
            children.splice(idx + 1, 0, nodeId);
            np.children = children;
            newItems[newParentId] = np;
          }

          return {
            manualPages: {
              ...state.manualPages,
              [pageId]: { rootItems: newRoots, items: newItems },
            },
          };
        });
        // Supabase sync
        const updatedPd = get().manualPages[pageId];
        if (updatedPd) {
          dbManualNodes.upsert(updatedPd.items[nodeId], pageId);
          dbManualPageRoots.upsert(pageId, updatedPd.rootItems);
        }
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      toggleDarkMode: () => {
        set((state) => {
          const next = !state.darkMode;
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", next);
          }
          return { darkMode: next };
        });
      },

      syncNow: async () => {
        if (!isSupabaseConfigured || !supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        set({ isRefreshing: true, syncError: false });
        try {
          const current = get();
          const defaultPageIds = new Set(Object.values(MENU_IDS) as string[]);
          const DEFAULT_TASK_TITLES = ["팀 메뉴얼 초안 작성", "업무 프로세스 정리"];

          // Supabase 현재 상태 조회
          const [supaPages, supaTasks, supaCustomers] = await Promise.all([
            dbPages.fetchAll(),
            dbTasks.fetchAll(),
            dbCustomers.fetchAll(),
          ]);

          // 로컬에 없거나 로컬이 더 최신인 항목 push (기본 템플릿 페이지 제외)
          const pushOps: Promise<void>[] = [
            ...Object.values(current.pages)
              .filter((p) => {
                if (defaultPageIds.has(p.id)) return false;
                const supa = supaPages[p.id];
                return !supa || p.updatedAt > supa.updatedAt;
              })
              .map((p) => dbPages.upsert(p)),
            ...current.tasks
              .filter((t) => {
                if (DEFAULT_TASK_TITLES.includes(t.title)) return false;
                const supa = supaTasks.find((s) => s.id === t.id);
                return !supa || t.updatedAt > supa.updatedAt;
              })
              .map((t) => dbTasks.upsert(t)),
            ...current.customers
              .filter((c) => {
                const supa = supaCustomers.find((s) => s.id === c.id);
                return !supa || c.updated_at > supa.updated_at;
              })
              .map((c) => dbCustomers.upsert(c)),
          ];
          if (pushOps.length > 0) await Promise.all(pushOps);
        } catch (e) {
          set({ isRefreshing: false, syncError: true });
          throw e;
        }

        set({ isRefreshing: false });
        await get().loadFromSupabase();
      },

      loadFromSupabase: async () => {
        if (!isSupabaseConfigured || !supabase) return;

        // 새 기기에서 로그인 직후 세션이 아직 확립되지 않은 경우를 방지합니다.
        // 세션이 없으면 fetchAll()이 RLS에 의해 빈 결과를 반환하고,
        // 그 경우 로컬 기본 데이터가 Supabase에 덮어써지는 치명적 버그가 발생합니다.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        set({ isRefreshing: true, syncError: false });
        try {

        const [pages, tasks, customers, statuses, manualNodesData, manualRoots, rootPageIdsConfig] =
          await Promise.all([
            dbPages.fetchAll(),
            dbTasks.fetchAll(),
            dbCustomers.fetchAll(),
            dbCustomerStatuses.fetchAll(),
            dbManualNodes.fetchAll(),
            dbManualPageRoots.fetchAll(),
            dbWorkspaceConfig.get("rootPageIds"),
          ]);

        // Build manualPages from flat node list
        const manualPages: Record<string, ManualPageData> = {};
        for (const { pageId, node } of manualNodesData) {
          if (!manualPages[pageId]) manualPages[pageId] = { rootItems: [], items: {} };
          manualPages[pageId].items[node.id] = node;
        }
        for (const [pid, rootItems] of Object.entries(manualRoots)) {
          if (!manualPages[pid]) manualPages[pid] = { rootItems: [], items: {} };
          manualPages[pid].rootItems = rootItems;
        }

        const current = get();

        // 기본 샘플 업무 제목 목록 (업로드·병합에서 완전히 제외)
        const DEFAULT_TASK_TITLES = ["팀 메뉴얼 초안 작성", "업무 프로세스 정리"];

        // Supabase가 진실의 원천(Source of Truth):
        // Supabase에 데이터가 이미 존재하면 로컬 전용 데이터를 재업로드하지 않음
        // (재업로드 시 다른 기기에서 삭제한 데이터가 복원되는 버그 방지)
        // Supabase가 완전히 비어있을 때만 로컬 데이터를 첫 마이그레이션으로 업로드
        const supabaseHasPages = Object.keys(pages).length > 0;
        const supabaseHasTasks = tasks.filter((t) => !DEFAULT_TASK_TITLES.includes(t.title)).length > 0;
        const supabaseHasCustomers = customers.length > 0;

        const supaPageIds = new Set(Object.keys(pages));
        const localOnlyPages = supabaseHasPages
          ? [] // Supabase에 데이터 있으면 로컬 전용 업로드 금지
          : Object.values(current.pages).filter((p) => !supaPageIds.has(p.id));

        const supaTaskIds = new Set(tasks.map((t) => t.id));
        const localOnlyTasks = supabaseHasTasks
          ? []
          : current.tasks.filter(
              (t) => !supaTaskIds.has(t.id) && !DEFAULT_TASK_TITLES.includes(t.title)
            );

        const supaCustomerIds = new Set(customers.map((c) => c.id));
        const localOnlyCustomers = supabaseHasCustomers
          ? []
          : current.customers.filter((c) => !supaCustomerIds.has(c.id));

        const uploadOps: Promise<void>[] = [];
        if (localOnlyPages.length > 0) uploadOps.push(dbPages.upsertMany(localOnlyPages));
        if (localOnlyTasks.length > 0) uploadOps.push(...localOnlyTasks.map((t) => dbTasks.upsert(t)));
        if (localOnlyCustomers.length > 0) uploadOps.push(...localOnlyCustomers.map((c) => dbCustomers.upsert(c)));
        if (uploadOps.length > 0) await Promise.all(uploadOps);

        // Seed workspace config if missing
        if (!supabaseHasPages) {
          await Promise.all([
            dbCustomerStatuses.upsertMany(current.customerStatuses),
            dbWorkspaceConfig.set("rootPageIds", current.rootPageIds),
          ]);
        }

        // Supabase가 있으면 그것만 사용, 없으면 로컬 첫 마이그레이션 데이터 사용
        const mergedPages = supabaseHasPages
          ? pages
          : { ...pages, ...Object.fromEntries(localOnlyPages.map((p) => [p.id, p])) };

        // Supabase에 남아있는 기본 샘플 업무 항목 모두 삭제 (중복 포함)
        const defaultTasksInSupa = tasks.filter((t) => DEFAULT_TASK_TITLES.includes(t.title));
        if (defaultTasksInSupa.length > 0) {
          defaultTasksInSupa.forEach((t) => dbTasks.delete(t.id));
        }
        const cleanedTasks = tasks.filter((t) => !DEFAULT_TASK_TITLES.includes(t.title));

        const mergedTasks = supabaseHasTasks
          ? cleanedTasks
          : [...cleanedTasks, ...localOnlyTasks];
        const mergedCustomers = supabaseHasCustomers
          ? customers
          : [...customers, ...localOnlyCustomers];

        // rootPageIds 결정: workspace_config > Supabase pages에서 도출 > 로컬 유지
        const derivedRootPageIds = (rootPageIdsConfig as string[] | null) ??
          (supabaseHasPages
            ? Object.values(mergedPages)
                .filter((p) => p.parentId === null)
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .map((p) => p.id)
            : current.rootPageIds);

        // workspace_config에 없었던 경우 저장해 두어 다음 기기도 정확히 불러오게 함
        if (supabaseHasPages && !rootPageIdsConfig) {
          dbWorkspaceConfig.set("rootPageIds", derivedRootPageIds);
        }

        set({
          pages: Object.keys(mergedPages).length > 0 ? mergedPages : current.pages,
          rootPageIds: derivedRootPageIds,
          tasks: mergedTasks,
          customers: mergedCustomers,
          customerStatuses: statuses.length > 0 ? statuses : current.customerStatuses,
          // manualPages: Supabase에 데이터가 있으면 사용, 비어있으면 로컬 유지
          // (인증 실패로 fetch가 빈 배열을 반환해도 로컬 데이터 보호)
          manualPages: Object.keys(manualPages).length > 0 ? manualPages : current.manualPages,
          isRefreshing: false,
        });
        } catch (e) {
          set({ isRefreshing: false, syncError: true });
          throw e;
        }
      },
    }),
    {
      name: "statfordegree-hub-storage",
      version: 7,
      // UI 상태만 localStorage에 저장 — 데이터는 Supabase가 단일 소스
      partialize: (state) => ({
        ...state,
        pages: {},
        rootPageIds: [],
        tasks: [],
        customers: [],
        customerStatuses: [],
        manualPages: {},
      }),
      migrate: (persistedState: unknown, version: number) => {
        const s = persistedState as Record<string, unknown>;
        const DEFAULT_TITLES = ["팀 메뉴얼 초안 작성", "업무 프로세스 정리"];

        if (version === 6) {
          // v6 → v7: 기본 업무 항목 완전 제거 (중복 누적된 경우도 모두 삭제)
          return {
            ...s,
            tasks: ((s.tasks as Task[]) ?? []).filter(
              (t) => !DEFAULT_TITLES.includes(t.title)
            ),
          };
        }
        if (version === 5) {
          // v5 → v7
          return {
            ...s,
            tasks: ((s.tasks as Task[]) ?? []).filter(
              (t) => !DEFAULT_TITLES.includes(t.title)
            ),
          };
        }
        if (version === 4) {
          // v4 → v7
          return {
            ...freshState,
            tasks: [],
            customers: ((s.customers as Customer[]) ?? []).map((c) => ({
              ...customerDefaults,
              ...c,
              monthPageId: (c as Customer).monthPageId ?? null,
            })),
            customerStatuses: (s.customerStatuses as StatusOption[]) ?? freshState.customerStatuses,
            sidebarCollapsed: (s.sidebarCollapsed as boolean) ?? false,
            darkMode: (s.darkMode as boolean) ?? false,
          };
        }
        // 구버전: 전체 초기화
        return freshState;
      },
    }
  )
);
