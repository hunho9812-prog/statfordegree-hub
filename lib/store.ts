import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { WorkspaceState, Page, Task, Customer, StatusOption, CustomColumnDef, CustomColumnType, ManualNode, ManualPageData } from "./types";
import {
  dbPages,
  dbTasks,
  dbCustomers,
  dbCustomerStatuses,
  dbTableColumns,
  dbManualNodes,
  dbManualPageRoots,
  dbWorkspaceConfig,
} from "./db";
import { isSupabaseConfigured, supabase } from "./supabase";

// 자동 저장 디바운스 타이머 — 편집 후 1.5초 뒤 Supabase 저장
const customerUpsertTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Fixed IDs for the manual page hierarchy
export const MENU_IDS = {
  MANUAL: "menu-manual",
  MANUAL_ANALYSIS: "menu-manual-analysis",
  MANUAL_ANALYSIS_FILES: "menu-manual-analysis-files",
  MANUAL_ANALYSIS_CAUTION: "menu-manual-analysis-caution",
  MANUAL_ANALYSIS_FORMAT: "menu-manual-analysis-format",
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

function calloutBlue(emoji: string, title: string) {
  return {
    type: "calloutBlock",
    attrs: { emoji, color: "blue" },
    content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: title }] }],
  };
}

function calloutRed(emoji: string, title: string) {
  return {
    type: "calloutBlock",
    attrs: { emoji, color: "red" },
    content: [{ type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: title }] }],
  };
}

function calloutGreen(emoji: string, text: string) {
  return {
    type: "calloutBlock",
    attrs: { emoji, color: "green" },
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function quote(text: string) {
  return {
    type: "blockquote",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

function taskList(...items: string[]) {
  return {
    type: "taskList",
    content: items.map((text) => ({
      type: "taskItem",
      attrs: { checked: false },
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    })),
  };
}

function isEffectivelyEmpty(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as { type: string; content?: { type: string; content?: unknown[] }[] };
    const nodes = parsed?.content ?? [];
    return nodes.length <= 2 && nodes.every((n) =>
      n.type === "heading" || (n.type === "paragraph" && (!n.content || n.content.length === 0))
    );
  } catch {
    return false;
  }
}

// toggleH2/toggleH3: previously produced toggleHeading nodes.
// Now flattened to regular heading + body so all text is directly editable.
function toggleH2(title: string, ...bodyNodes: object[]): object[] {
  return [
    h2(title),
    ...(bodyNodes.length > 0 ? bodyNodes : [{ type: "paragraph", content: [] }]),
  ];
}

function toggleH3(title: string, ...bodyNodes: object[]): object[] {
  return [
    h3(title),
    ...(bodyNodes.length > 0 ? bodyNodes : [{ type: "paragraph", content: [] }]),
  ];
}

function doc(title: string, ...nodes: (object | object[])[]) {
  const flat = nodes.flatMap((n) => (Array.isArray(n) ? n : [n]));
  return JSON.stringify({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] },
      ...flat,
      { type: "paragraph", content: [] },
    ],
  });
}

function makeManualRootContent(): string {
  return doc(
    "메뉴얼",
    calloutBlue("📋", "SPSS 분석 가이드 · 고객 응대 크레도 · 응대 체크리스트"),
    p("아래 하위 페이지를 클릭해서 각 메뉴얼로 이동하세요.")
  );
}

function makeAnalysisManualContent(): string {
  return doc(
    "분석 시 메뉴얼",
    calloutYellow("분석 시작 전 반드시 숙지하세요. 아래 하위 페이지를 클릭해 각 항목을 확인하세요."),
    p("아래 하위 페이지를 클릭하면 세부 내용을 확인할 수 있습니다.")
  );
}

function makeAnalysisFilesContent(): string {
  return doc(
    "📁 SPSS 파일 정리법",
    blist(
      "맨 왼쪽에 No 변수 만들어주기.",
      "인구통계 범주화 한 변수는 기존 인구통계 변수 바로 옆에 붙여주기.",
      "EFA에서 삭제되는 문항, 역코딩 진행 후 원래 문항 등 분석에 사용하지 않는 문항은 맨 위로 옮겨놓기 (삭제 X)",
      "하위요인 네이밍 한 후 같은 하위요인끼리 뭉쳐놓기.",
      "평균 or 합계 계산할 때 '자기효능감 평균', '자기효능감합계' 등 '변수이름+평균' 형식으로 네이밍하기.",
      "상위요인은 '전체평균', '전체합계' 붙이기",
      "일반적 특성 각 범주 라벨링하기!"
    )
  );
}

function makeAnalysisCautionContent(): string {
  return doc(
    "⚠️ 분석 시 주의할 점",
    blist(
      "범주화 등 변수 수정 과정에서 원래 변수 삭제하지 않기 (AS 과정에서 필요한 경우 많음)",
      "데이터 수정 후 이전 SPSS 파일 삭제하지 않고 히스토리 저장하기",
      "시작 날짜에 고객님께 분석 시작한다고 언급하기",
      "분석 시작 전 논문 주제, 자료분석방법 읽고 큰 틀 이해하기"
    )
  );
}

function makeAnalysisFormatContent(): string {
  return doc(
    "📊 모논문 없을 때 표해석 양식",
    toggleH2("소수점 · 표기 기본 규칙",
      blist(
        "모든 분석에서 t/F, p는 #.000으로 작성",
        "기술통계·차이검정의 M(평균), SD(표준편차)는 0.00으로 작성",
        "유의확률 .000은 <.001로 바꾸기",
        "표의 세로선은 모두 없애기",
        "표와 해석 글씨는 바탕글로 통일 (AS 할 때 편함)"
      )
    ),
    toggleH2("빈도분석 표 형식",
      p("1. 어떤 분석을 진행하였고 표 몇 번에 해당하는지 서술"),
      quote("응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 <표 1>과 같이 나타내었다."),
      p("2. 각 변수마다 응답이 가장 많은 집단부터 가장 적은 집단 순서대로 빈도와 퍼센트를 서술해줍니다.")
    ),
    toggleH2("차이검정 표 형식",
      blist(
        "표 형식: N, M, SD, t/F, p, Scheffe 순으로",
        "ANOVA 결과는 유의한데(p<0.05) 사후검정이 나눠지지 않으면 (n/a)로 기재.",
        "사후검정 알파벳은 첫 집단부터 a, b, c…로 지정",
        "ANOVA 결과는 유의하지 않으면(p>0.05) 사후검정이 나눠지더라도 기재 X."
      )
    ),
    toggleH2("회귀분석 표 형식",
      blist(
        "표 형식 → B, SE, β, t, p, VIF, R², 수정된 R², Durbin-Watson 모두 표기 (더미변수 투입한 경우 Ref도 표기)",
      ),
      quote("차이검정에서 유의한 차이를 보인 인구통계 변수를 통제변수로 투입한 후 다중회귀분석을 실시하였고 결과는 <표 >와 같다.\n\n먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(VIF) 값은 모두 10 미만으로 나타나 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2에 가까워 잔차의 자기상관성 문제도 없었다.")
    )
  );
}

function makeProcessManualContent(): string {
  return doc(
    "분석과정 메뉴얼",
    calloutBlue("💡", "분석과정 메뉴얼 — 단계별로 진행하세요"),
    toggleH2("1] 엑셀 받고 데이터 클리닝 (이 부분 너무 중요함. 검토 여러 번..!)",
      toggleH3("1] 역문항, 하위문항 확인하기",
        blist(
          "어떤 문항이 역문항에 해당되는지, 각 척도는 어떤 하위문항으로 구성되어 있는지, 각 번호 확인",
          "변수계산은 평균 or 합계 중 어떤 걸로 할지 확인 (연구계획서 척도 설명 부분)"
        )
      ),
      toggleH3("2] 맨 왼쪽에 No 추가 (일련번호 부여)"),
      toggleH3("3] 문항 번호 넣기",
        blist(
          "개인특성1, 개인특성2 …… (오른쪽 아래 드래그로 한 번에 가능)",
          "예시: sum(직무만족도1 to 직무만족도9) — 직무만족도1부터 9까지 모두 더하는 함수"
        )
      ),
      toggleH3("4] 설문지 보면서 한글을 숫자로 변경 (자동화 프로그램 사용)"),
      toggleH3("5] 역코딩 후 변수계산"),
      toggleH3("추가] 복수 응답 코딩 방법 (countif 함수 이용)")
    ),
    toggleH2("2] SPSS 연동 후 데이터 클리닝",
      toggleH3("1) 빈도분석으로 결측치 확인",
        blist(
          "인구통계변수(성별, 연령대)에 결측치 있는 경우 고객님께 물어보기",
          "방법1: 가장 많이 응답한 숫자 채우기 / 방법2: 결측치 있는 응답자 삭제",
          "척도 결측치는 SPSS가 알아서 제외 후 평균내줌",
          "오타 확인: 44, 55 등 이상 값 → 4, 5로 수정"
        )
      ),
      toggleH3("2) 기술통계로 이상치 확인",
        p("최소값·최대값 확인 후 이상치 처리 방법 고객에게 물어봄.")
      ),
      toggleH3("3) 역코딩 ('다른 변수로 코딩 변경' 이용!)"),
      toggleH3("4) 신뢰도 분석",
        p("신뢰도 0.6 미만 → 문항 삭제 or 데이터 수정 (3인톡방에 물어보기)")
      ),
      toggleH3("5) 정규성 검정 (연구계획서에 비모수검정이 있을 때만)",
        blist(
          "연구계획서에 비모수 검정 or 정규성 검정이 적혀있는 경우",
          "표본의 개수가 30 미만인 경우"
        )
      )
    ),
    toggleH2("3] 통계분석 → SPSS/AMOS 하위 페이지 참고"),
    toggleH2("5] 메모 (도움말 남기기)",
      p("해석 아카이브 형식과 동일하게, 고객님의 예시(빨간색 표시) 수정해주기."),
      p("해석 작성 챗GPTs: https://chatgpt.com/g/g-KBJrZ74Ld")
    )
  );
}

function makeSpssContent(): string {
  return doc(
    "통계분석(SPSS)",
    calloutBlue("📈", "각 분석방법을 클릭하면 상세 메뉴얼로 이동합니다"),
    p("아래 하위 페이지를 클릭해서 각 분석 메뉴얼로 이동하세요.")
  );
}

function makeAmosContent(): string {
  return doc(
    "통계분석(AMOS)",
    calloutBlue("🔷", "AMOS 분석 메뉴얼 — CFA, 판별타당성, 구조방정식, 매개/조절효과"),
    p("아래 하위 페이지를 클릭해서 각 분석 메뉴얼로 이동하세요.")
  );
}

function makePocketContent(): string {
  return doc(
    "통계주머니",
    calloutBlue("🗨️", "자주 쓰는 자료 모음"),
    p("아래 하위 페이지를 클릭하면 각 항목의 세부 내용을 확인할 수 있습니다.")
  );
}

function makePocketTableContent(): string {
  return doc(
    "한글표 제작 꿀팁",
    toggleH2("단축키",
      blist(
        "드래그 후 Alt + Shift + Enter — 윗첨자 변경",
        "표 열 추가: Ctrl + Enter",
        "표 열 제거: Ctrl + Backspace"
      )
    ),
    toggleH2("상용구 사용법",
      blist(
        "입력방법: 입력 > 입력 도우미 > 상용구 > 상용구 내용",
        "사용방법: 준말 입력 후 Alt + i",
        "'d': R²=, Adj.R²=, F=, p<.001, Durbin-Watson=",
        "'k': Kaiser-Meyer-Olkin Measure of Sampling Adequacy"
      )
    ),
    toggleH2("표 폭 줄이기",
      p("blog.naver.com/lavieenrose77/221967385573 참고")
    )
  );
}

function makePocketExcelContent(): string {
  return doc(
    "Excel 함수",
    p("함수 종합.xlsx 파일 참고")
  );
}

function makePocketGraphContent(): string {
  return doc(
    "Graph 자료",
    p("조절효과그래프.xlsx 파일 참고")
  );
}

function makePocketIpaContent(): string {
  return doc(
    "IPA 분석",
    blist("IPA 산출.xlsx / IPA 분석 예시.hwp 파일 참고")
  );
}

function makePocketBorichContent(): string {
  return doc(
    "Borich 요구도",
    blist("borich 요구도 산출.xlsx / Borich 요구도 예시.hwp 파일 참고")
  );
}

function makePocketFormContent(): string {
  return doc(
    "분석 표 양식",
    blist(
      "SPSS: SPSS통계표메모아카이브.zip",
      "AMOS: AMOS.zip"
    )
  );
}

function makePocketApaContent(): string {
  return doc(
    "APA 형식",
    p("사회과학, 교육, 심리학 등 학문 분야의 표준 논문 작성 및 인용 스타일")
  );
}

// ── SPSS 서브페이지 콘텐츠 ──────────────────────────────────────────────────

function makeSpssEfaContent(): string {
  return doc(
    "탐색적 요인분석 (EFA)",
    calloutBlue("🔍", "EFA — Exploratory Factor Analysis"),
    toggleH2("EFA가 잘 묶이지 않을 경우 대처 방법",
      blist(
        "1. 척도를 가져왔을 때 수정하지 않은 경우 → EFA를 하지 않아도 된다고 말씀드리기",
        "2. 구조방정식 논문 진행하면 EFA 대신 CFA로 바로 넘어가기",
        "3. 죽어도 EFA를 해야 한다 → 하위요인을 삭제하고 진행하기"
      )
    ),
    toggleH2("결과 해석하기",
      blist(
        "요인적재량: .4 이상 유의, .5 이상이 이상적",
        "고유값(Eigenvalue): 1 이상인 요인만 추출",
        "총 분산 설명력: 60% 이상 권장",
        "Cronbach α: .6 이상 (신뢰도 기준)"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "하나의 문항이 여러 요인에 이중 적재 → 해당 문항 삭제 검토",
        "요인 수가 기대와 다르게 추출됨 → 고유값 기준 재확인",
        "분산 설명력이 낮음 → 문항 수 감소 또는 요인 수 재설정"
      )
    ),
    toggleH2("참고자료",
      p("[SPSS 결과 해석하기] 9. 탐색적 요인분석"),
      p("blog.naver.com/kimpubli1214/223268804837")
    )
  );
}

function makeSpssCrossContent(): string {
  return doc(
    "교차분석",
    calloutBlue("✖️", "교차분석 — 범주형 변수 간 연관성 분석"),
    toggleH2("분석 방법",
      blist(
        "SPSS: 분석 > 기술통계량 > 교차분석",
        "행: 독립변수(집단), 열: 종속변수(항목)",
        "통계량: 카이제곱(Chi-square) 체크",
        "셀: 행 퍼센트 체크"
      )
    ),
    toggleH2("결과 해석",
      p("χ²(df)=값, p=값 형태로 보고. 유의한 경우 각 범주별 비율 언급."),
      blist(
        "p < .05이면 두 변수 간 유의한 관계 있음",
        "Cramer's V 효과크기도 함께 보고 권장"
      )
    ),
    toggleH2("오류 해결",
      blist(
        "기대빈도 5 미만 셀이 전체 20% 초과 → 범주 통합 또는 Fisher 정확 검정 사용",
        "Chi-square 값이 NA → 셀 빈도 너무 적음, 범주 재조정 필요"
      )
    ),
    toggleH2("참고자료",
      p("SPSS 교차분석 해석 방법: blog.naver.com/kimpubli1214")
    )
  );
}

function makeSpssFreqContent(): string {
  return doc(
    "빈도분석",
    calloutBlue("📊", "빈도분석 — 일반적 특성 파악"),
    toggleH2("표 형식",
      blist(
        "열: 구분 / 빈도 / 퍼센트",
        "유의확률 없음 (빈도분석에는 p 값이 없음)",
        "합계 행 마지막에 추가"
      )
    ),
    toggleH2("해석 형식",
      toggleH3("1. 어떤 분석을 진행하였고 표 몇 번에 해당하는지 서술",
        quote("응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 <표 1>과 같이 나타내었다.")
      ),
      toggleH3("2. 각 변수마다 응답이 가장 많은 집단부터 서술",
        quote("성별에서는 여성이 127명(62.6%)으로 남성 76명(37.4%)보다 높은 비율을 차지하였다. 연령을 살펴보면, 30대가 68명(33.5%)으로 가장 많았으며, 이어 40대가 59명(29.1%), 20대가 37명(18.2%), 50대가 25명(12.3%), 10대가 14명(6.9%) 순으로 나타났다.")
      )
    ),
    toggleH2("복수응답 빈도분석",
      p("SPSS: 분석 > 다중반응 > 빈도분석"),
      blist(
        "사전에 다중반응 세트 정의 필요 (분석 > 다중반응 > 변수 세트 정의)",
        "이분형: 체크 여부, 범주형: 코드 값으로 구분"
      )
    ),
    toggleH2("참고자료",
      p("[SPSS 결과 해석하기] 1. 빈도분석: blog.naver.com/kimpubli1214")
    )
  );
}

function makeSpssDescContent(): string {
  return doc(
    "기술통계",
    calloutBlue("📉", "기술통계 — 평균, 표준편차 파악"),
    toggleH2("표 형식",
      blist(
        "열: 변수명 / N / 최솟값 / 최댓값 / M / SD",
        "M(평균), SD(표준편차)는 소수점 둘째 자리까지 (0.00 형식)"
      )
    ),
    toggleH2("해석 방법",
      p("각 변수의 평균과 표준편차를 보고하고, 측정 척도 범위 기준으로 해석."),
      blist(
        "5점 척도: 3점 기준으로 높고 낮음 판단",
        "표준편차가 크면 응답 분산이 크다는 의미"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "N이 전체 응답자 수와 다름 → 결측치 존재, 빈도분석으로 확인",
        "평균이 척도 범위 초과 → 데이터 코딩 오류 확인"
      )
    ),
    toggleH2("참고자료",
      p("[SPSS 결과 해석하기] 2. 기술통계: blog.naver.com/kimpubli1214")
    )
  );
}

function makeSpssCorrContent(): string {
  return doc(
    "상관관계 분석",
    calloutBlue("🔗", "상관관계 분석 — Pearson 상관계수"),
    toggleH2("표 형식",
      blist(
        "대각선 기준 아래(또는 위) 삼각형만 표기",
        "유의수준: * p<.05, ** p<.01, *** p<.001",
        "대각선에는 1 기재"
      )
    ),
    toggleH2("해석 순서 (상위요인 4개일 때)",
      p("A와 B / A와 C / A와 D / B와 C / B와 D / C와 D 순서로 서술"),
      p("왼쪽 요인은 상위요인만, 오른쪽 요인은 상위요인과 하위요인 모두 언급"),
      quote("대상자의 외상 후 성장은 의도적 반추(r=.599, p<.01)와 유의한 정(+)의 상관관계를 나타냈다. 또한 자기노출(r=.319, p<.01)과 유의한 정(+)의 상관관계를 보였으며...")
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "상관계수가 1 초과 → 데이터 오류 또는 역코딩 미처리",
        "모든 상관이 유의 → 표본 크기가 매우 크거나 변수 간 중복",
        "상관이 전혀 없음 → 변수 계산 오류 가능성"
      )
    ),
    toggleH2("참고자료",
      p("[SPSS 결과 해석하기] 3. 상관관계분석"),
      p("blog.naver.com/kimpubli1214/223188535601")
    )
  );
}

function makeSpssDiffContent(): string {
  return doc(
    "차이검정",
    calloutBlue("⚖️", "차이검정 — t검정, ANOVA"),
    toggleH2("표 형식",
      p("N, M, SD, t/F, p, Scheffe 순으로"),
      blist(
        "응답자 수가 1인 집단이라 표준편차가 0일 때 → 0.00으로 써주기",
        "t검정: 집단 2개 / F검정: 집단 3개 이상"
      )
    ),
    toggleH2("사후검정 작성 시 유의사항",
      blist(
        "ANOVA 결과는 유의한데(p<.05) 사후검정이 나눠지지 않으면 (n/a)로 기재",
        "사후검정 알파벳은 첫 집단부터 a, b, c… 로 지정",
        "ANOVA 결과가 유의하지 않으면(p>.05) 사후검정이 나눠지더라도 기재 X"
      )
    ),
    toggleH2("해석 작성 순서",
      blist(
        "1. 응답자의 일반적 특성에 따라 어떤 변수의 차이를 알아보는지 서술",
        "2. 유의한 차이가 나타난 인구통계 변수와 차이가 나타나지 않은 변수 각각 모두 (t/F=, p=) 서술",
        "3. 유의한 인구통계 변수만 가장 평균이 높은 집단과 낮은 집단 언급",
        "4. Scheffe 사후검정 결과 서술"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "등분산 검정(Levene) 위반 → Welch t-test 또는 Brown-Forsythe 사용",
        "정규성 위반 + 표본 소 → 비모수 검정(Mann-Whitney, Kruskal-Wallis) 사용"
      )
    ),
    toggleH2("참고자료",
      p("[SPSS 결과 해석하기] 4. 독립표본 t검정 / 5. 일원배치 분산분석"),
      p("blog.naver.com/kimpubli1214")
    )
  );
}

function makeSpssRegContent(): string {
  return doc(
    "다중회귀분석",
    calloutBlue("📐", "다중회귀분석 — Multiple Regression"),
    toggleH2("표 형식",
      blist(
        "B, SE, β, t, p, VIF, R², 수정된 R², Durbin-Watson 모두 표기",
        "더미변수 투입한 경우 Ref도 표기"
      )
    ),
    toggleH2("해석 작성 틀",
      quote("차이검정에서 유의한 차이를 보인 인구통계 변수를 통제변수로 투입한 후 다중회귀분석을 실시하였고 결과는 <표 >와 같다."),
      toggleH3("1. 다중공선성 검정",
        quote("먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(VIF) 값은 1.256~3.147로 모두 10 미만으로 나타나 변수 간의 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2.202로 2에 가까워 잔차의 자기상관성 문제도 없었다.")
      ),
      toggleH3("2. 모형 적합도",
        quote("회귀모형의 설명력(R²)은 70.7%로 나타났으며, 모형은 통계적으로 유의한 것으로 확인되었다(F=21.664, p<.001).")
      ),
      toggleH3("3. 유의한 독립변수 서술",
        quote("회귀분석 결과, 태도요인(β=.351, t=5.203, p<.001), 경험요인(β=.259, t=3.531, p=.001)이 유의한 정(+)의 영향을 미치는 것으로 나타났다.")
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "VIF > 10 → 다중공선성 문제: 변수 제거 또는 능형회귀 사용",
        "Durbin-Watson이 2와 많이 다름 → 자기상관 문제",
        "잔차 정규성 위반 → 로그 변환 또는 비모수 방법 고려"
      )
    ),
    toggleH2("더미변수 참고",
      p("더미변수 만드는 방법: blog.naver.com/kimpubli1214")
    )
  );
}

function makeSpssMedContent(): string {
  return doc(
    "매개효과",
    calloutBlue("🔀", "매개효과 — Baron & Kenny / PROCESS Macro 4번"),
    toggleH2("Baron & Kenny 매개효과",
      blist(
        "1단계: X → Y 회귀분석 (유의해야 함)",
        "2단계: X → M 회귀분석 (유의해야 함)",
        "3단계: X, M → Y 회귀분석",
        "매개효과: 3단계에서 X의 β가 감소하면 매개 (완전 or 부분)"
      )
    ),
    toggleH2("PROCESS Macro 4번 매개효과",
      blist(
        "Model 4로 매개효과 검증",
        "부트스트래핑 5,000회 이상 권장",
        "간접효과의 95% CI가 0을 포함하지 않으면 유의"
      ),
      p("PROCESS Macro 4번으로 매개효과 검증하기 — blog.naver.com/kimpubli1214")
    ),
    toggleH2("이중매개 (PROCESS Macro 6번)",
      blist(
        "매개변수가 2개인 경우 Model 6 사용",
        "경로: X → M1 → M2 → Y",
        "각 간접경로의 Boot CI 확인"
      ),
      p("[SPSS 결과 해석하기] 8. 프로세스 매크로 6번 이중매개효과"),
      p("blog.naver.com/kimpubli1214/223252381973")
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "1단계(X→Y)가 유의하지 않아도 간접효과는 유의할 수 있음 (현대적 관점)",
        "PROCESS 설치 후 SPSS에서 인식 안 될 때 → 관리자 권한으로 재설치"
      )
    ),
    toggleH2("참고자료",
      p("[SPSS 결과 해석하기] 7. 매개효과 위계적 회귀분석"),
      p("blog.naver.com/kimpubli1214/223251339862")
    )
  );
}

function makeSpssModContent(): string {
  return doc(
    "조절효과",
    calloutBlue("🎛️", "조절효과 — Baron & Kenny / PROCESS Macro 1번"),
    toggleH2("Baron & Kenny 조절효과",
      blist(
        "1단계: X → Y",
        "2단계: X, M → Y",
        "3단계: X, M, X×M → Y (상호작용항 투입)",
        "X×M(상호작용항)이 유의하면 조절효과 있음"
      )
    ),
    toggleH2("PROCESS Macro 1번",
      p("표 형식: step1: X → Y / step2: X, M → Y / step3: X, M, X×M → Y"),
      quote("대인관계성향이 외모관리행동에 미치는 영향에서 연령의 조절효과를 검증하기 위해 위계적 회귀분석을 실시한 결과를 <표 9>에 제시하였다. 1단계에서는 독립변인인 대인관계성향이 외모관리행동에 미치는 영향을 검증하였고, 2단계에서는 독립변인인 대인관계성향과 조절변인인 연령이 외모관리행동에 미치는 영향을 분석하였다. 3단계에서는 대인관계성향과 연령의 상호작용항을 추가로 투입하여 외모관리행동에 미치는 영향을 검증하였다.")
    ),
    toggleH2("조절효과 그래프 만들기",
      blist(
        "그래프 만들기: blog.naver.com/kimpubli1214/222964405846",
        "논문 형식으로 가공하기: blog.naver.com/kimpubli1214/224060096428"
      )
    ),
    toggleH2("매개된 조절효과",
      blist(
        "Muller et al.(2005)의 접근법 (SPSS 위계적회귀분석)"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "상호작용항 비유의 → 조절효과 없음으로 해석 (그래프 그리지 않기)",
        "평균중심화 없이 상호작용항 투입 → 다중공선성 증가 우려"
      )
    ),
    toggleH2("참고자료",
      p("blog.naver.com/kimpubli1214/222964405846")
    )
  );
}

function makeSpssProcContent(): string {
  return doc(
    "PROCESS Macro",
    calloutBlue("⚙️", "PROCESS Macro — Hayes (2013)"),
    toggleH2("모델 번호",
      blist(
        "Model 1: 조절효과",
        "Model 4: 매개효과 (단순/이중)",
        "Model 5: 조절된 직접효과",
        "Model 6: 이중매개효과"
      )
    ),
    toggleH2("공통 주의사항",
      blist(
        "PROCESS 실행 전 반드시 변수 계산 완료 확인",
        "부트스트래핑 횟수: 5,000 이상 권장",
        "신뢰구간(95% CI)이 0을 포함하지 않으면 유의"
      )
    ),
    toggleH2("Model 4 매개효과 해석",
      p("직접효과(c')와 간접효과(a×b) 보고. Boot CI가 0 미포함이면 간접효과 유의."),
      blist(
        "완전매개: c' 비유의, 간접효과 유의",
        "부분매개: c' 유의, 간접효과 유의"
      )
    ),
    toggleH2("Model 1 조절효과 해석",
      p("상호작용 계수(B)가 유의하고 CI가 0 미포함이면 조절효과 있음."),
      blist(
        "평균중심화 후 상호작용항 생성 권장",
        "존슨-네이만 구간으로 조절 범위 파악 가능"
      )
    ),
    toggleH2("Model 6 이중매개 해석",
      p("blog.naver.com/kimpubli1214/223252381973 참고"),
      blist(
        "경로 1: X → M1 → Y",
        "경로 2: X → M2 → Y",
        "경로 3: X → M1 → M2 → Y",
        "각 경로의 Boot CI 개별 확인"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "PROCESS가 SPSS 메뉴에 보이지 않음 → Extensions > Utilities > Install Custom Dialog 재시도",
        "부트스트랩 결과가 매번 달라짐 → 랜덤 시드 설정 권장"
      )
    )
  );
}

// ── AMOS 서브페이지 콘텐츠 ──────────────────────────────────────────────────

function makeAmosCfaContent(): string {
  return doc(
    "CFA (확인적 요인분석)",
    calloutBlue("🔷", "CFA — Confirmatory Factor Analysis"),
    toggleH2("집중타당성 기준",
      blist(
        "요인적재치: .4 이상 유의, .5 이상 중요 (최현철, 2016)",
        "C.R.(개념신뢰도): .7 이상",
        "AVE(평균분산추출): .5 이상"
      )
    ),
    toggleH2("AVE가 0.5보다 낮을 때",
      quote("평균분산추출(AVE)값이 0.5보다 낮게 나왔을 때 개념 신뢰도가 0.6보다 높을 경우 타당도가 적절할 수 있다는 선행연구에 따라 집중타당성이 있다고 판단하였다(Fornell & Larcker, 1981)."),
      blist(
        "1. 문항 삭제를 통해 AVE를 올려본다",
        "2. 도저히 안 올라가면 위의 인용구 사용"
      )
    ),
    toggleH2("모형적합도 기준",
      p("X²: p=.000이어도 표본 크기 때문일 수 있음 → 다른 지수와 함께 판단 (배병렬, 2014)"),
      blist(
        "CFI / TLI: .90 이상",
        "RMSEA: .08 이하",
        "SRMR: .08 이하"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "오류: sample moment matrix is not positive definite",
        "원인 1: 문항 하나가 분산이 0인 경우 (ex. 100명 전원이 같은 점수)",
        "원인 2: 특정 변수가 다른 변수와 완전히 동일하거나 반대"
      )
    ),
    toggleH2("AVE & CR 계산 방법",
      blist(
        "1) 스탯지니 접속 — stat-genie.com",
        "2) 표준화 요인적재량 입력",
        "3) 결과 확인 (AVE, CR 자동 계산)"
      )
    )
  );
}

function makeAmosDiscContent(): string {
  return doc(
    "판별타당성",
    calloutBlue("✅", "판별타당성 — Discriminant Validity"),
    toggleH2("판별타당성 기준",
      p("상관계수의 제곱값이 AVE보다 작아야 함 (Fornell & Larcker, 1981)"),
      p("또는: 상관계수 ± 2 × 표준오차 의 신뢰구간에 1이 포함되지 않아야 함")
    ),
    toggleH2("판별타당성이 충족 안 될 경우",
      quote("본 연구의 측정모델 내 판별타당성 검증을 위해 변수 간 상관관계를 확인한 결과, 태도와 이용의도의 상관계수가 AVE 제곱근을 상회하는 것으로 나타나 판별타당성을 확보하지 못함을 알 수 있었다. 이에 변수 간 상관계수의 신뢰구간을 확인하는 방법을 적용하여 판별타당성에 대한 2차 검증을 수행하였다.\n\n측정변수의 신뢰구간을 상관계수±2 × 표준오차값으로 산출하여 확인한 결과, 모든 변수의 상관계수 신뢰구간 내에 1이 포함되지 않는 것으로 나타나 측정모델의 판별타당성 기준을 충족하고 판별타당성을 확보하였다.")
    ),
    toggleH2("표 채우는 방법",
      blist(
        "1. 상관관계 채우기 (상관관계 분석 과정과 동일)",
        "2. AVE 제곱근 계산: stat-genie.com에서 표준화 요인적재량 입력 후 확인",
        "3. 대각선에 AVE 제곱근 기입"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "AVE 제곱근이 상관계수보다 낮음 → 문항 제거 후 CFA 재실행 검토",
        "AVE 값이 계산되지 않음 → stat-genie.com 재확인"
      )
    )
  );
}

function makeAmosSemContent(): string {
  return doc(
    "구조방정식 (SEM)",
    calloutBlue("🔗", "SEM — Structural Equation Modeling"),
    toggleH2("분석 순서",
      blist(
        "1. CFA로 측정모형 확인",
        "2. 판별타당성 확인",
        "3. 구조방정식 모형 설정 및 실행",
        "4. 모형적합도 확인 및 보고",
        "5. 경로계수 보고"
      )
    ),
    toggleH2("표 형식",
      blist(
        "열: 경로 (변수명 → 변수명) / B / β / S.E. / C.R. / p",
        "모형적합도: χ², df, p, CFI, TLI, RMSEA, SRMR 보고"
      )
    ),
    toggleH2("모형적합도 기재 방법",
      blist(
        "1. AMOS 결과 파일에서 Model Fit 탭 확인",
        "2. 표에 기재 (모논문 형식 우선)",
        "3. 모논문 없으면 CFI, TLI, RMSEA, SRMR 필수 보고"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "적합도 불량 → MI(수정지수) 확인 후 공분산 설정 검토",
        "경로계수 방향이 예상과 반대 → 역코딩 또는 이론 재검토",
        "수렴 실패 → 초기값 변경 또는 모형 단순화"
      )
    ),
    toggleH2("참고자료",
      p("CFA와 구조방정식 모형적합도가 동일한 논문 참고"),
      p("배병렬(2014) AMOS 구조방정식 모형 참고")
    )
  );
}

function makeAmosMedContent(): string {
  return doc(
    "AMOS 매개효과",
    calloutBlue("🔀", "AMOS 매개효과 — Bootstrapping"),
    toggleH2("분석 방법",
      blist(
        "Bootstrapping으로 간접효과 유의성 검정",
        "팬텀 변수(Phantom Variable) 방법으로 이중매개 검증",
        "Analysis Properties > Bootstrap 탭에서 설정"
      )
    ),
    toggleH2("Bootstrap 설정",
      blist(
        "Bootstrap samples: 5,000 이상",
        "Bias-corrected confidence intervals 선택",
        "신뢰수준: 95%"
      )
    ),
    toggleH2("결과 해석",
      blist(
        "Indirect effect의 Lower/Upper CI가 0을 포함하지 않으면 유의",
        "완전매개 vs 부분매개 판단: 직접효과 유의 여부로 구분"
      )
    ),
    toggleH2("관련 파일",
      blist(
        "AMOS이용매개효과.pdf",
        "AMOS이용다중매개논문.pdf",
        "이중매개팬텀변수.pdf"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "Bootstrap 결과가 나오지 않음 → Analysis Properties 재확인",
        "팬텀 변수 설정 오류 → 제약식 표기 방법 재확인"
      )
    )
  );
}

function makeAmosModContent(): string {
  return doc(
    "AMOS 조절효과",
    calloutBlue("🎛️", "AMOS 조절효과 — 다중집단 비교분석"),
    toggleH2("측정동일성 검증 순서",
      blist(
        "1. 형태동일성 (Configural Invariance): 자유모형",
        "2. 측정동일성 (Metric Invariance): 요인부하량 동일 제약",
        "3. 구조동일성 (Scalar Invariance): 절편 동일 제약",
        "각 단계마다 CFI 차이 .01 이하, RMSEA 차이 .015 이하 확인"
      )
    ),
    toggleH2("다중집단 비교분석",
      blist(
        "집단 간 경로계수 차이 검정 (Critical Ratio for Differences)",
        "|CR| > 1.96이면 집단 간 유의한 차이"
      )
    ),
    toggleH2("관련 파일",
      blist(
        "측정동일성!amos조절효과_조충경님.pdf",
        "측정동일성형태동일성_든든한고등어.pdf",
        "측정동일성형태동일성구조동일성amos_김민경님.pdf",
        "amos다중집단비교분석.pdf"
      )
    ),
    toggleH2("자주 발생하는 오류",
      blist(
        "측정동일성 미충족 → 부분동일성 검증으로 전환 가능",
        "집단 크기 불균형 → 결과 해석 시 주의"
      )
    )
  );
}



function makeChecklistContent(): string {
  return doc(
    "크레도 / 응대 체크리스트",
    calloutRed("⚠️", "크레도 필독 — 고객 응대 전 반드시 숙지하세요."),
    toggleH2("❤️ 크레도 (응대 원칙)",
      toggleH3("1. 채팅은 웃으면서, 부드럽게, 친절하게",
        p("스탯포디그리는 고객과 얼굴을 대면하지 않고 채팅으로 응대합니다. 사람은 얼굴을 보지 않고 채팅만 보면 말의 뉘앙스를 부정적으로 인지하는 경우가 많습니다."),
        calloutGreen("📌", "고객님께 채팅할 때는 끝에 항상 '^^, !, ㅎㅎ' 등의 감정표현을 붙여줍니다. 평서문(맞습니다. 네. 그렇습니다.)은 사용하지 않습니다."),
        p("특히 고객님이 반복적인 AS나 질문을 하시는 경우 미안해하시는 경우가 많습니다. 언제 어디서나 감정표현 필수입니다.")
      ),
      toggleH3("2. 중간중간 소통과 대화는 필수",
        p("분석 과정에서 애매한 부분이 있으면 임의로 처리하는 것보다는 고객님께 질문을 해주세요."),
        quote("의뢰자님~ 연령을 나눌때 혹시 원하시는 기준이 있을까요~?"),
        p("고객님이 통계가 생소해 잘 모르겠다고 하시면:"),
        quote("그럼 고객님들이 많이 진행하시는 방향으로 도와드리겠습니다!"),
        calloutRed("⚠️", "타당도, 신뢰도, 가설검증 결과는 분석 초기에 꼭 말씀드려야 합니다. 따로 보고하지 않고 최종 결과물을 받을 때 이러한 사실을 알게 되면 고객만족도는 땅으로 떨어집니다(환불 요청하는 경우도 있음)."),
        p("진행 일정 기준:"),
        blist(
          "분석 시작 1~2일 내: 타당도, 신뢰도, 가설검증 결과 보고",
          "분석 시작 3~4일 내: 표 결과 보고",
          "분석 시작 5~6일 내: 해석까지 최종 결과물 제출"
        ),
        p("질문했는데 고객님이 잘 모르겠다고 하면?"),
        quote("우선 그럼 제가 제안드린 방향으로 진행해보고, 나중에 교수님이 수정하라고 하시면 수정 도와드리는건 어떠실까요??"),
        p("중간 소통 예시 멘트:"),
        quote("의뢰자님 가설 5개중 3개가 채택이 되었네요^^ 이대로 표해석작업 진행하겠습니다!"),
        quote("의뢰자님 표 먼저 드립니다! 이대로 해석작업 들어가겠습니다 혹시 궁금하신 부분 있으면 말씀주세요ㅎㅎ")
      ),
      toggleH3("3. 제출할 땐 이것만 기억하자",
        calloutRed("⚠️", "결과물을 너무 늦은 밤에 제출하거나, 결과물을 제출하고 잠수를 타는 상황은 절대 지양합니다!"),
        p("만약 목요일이 제출 기한이라면 적어도 목요일 오후 6시 전에는 제출해야 합니다. 고객님이 말씀하신 기한이란, 결과물을 확인하고 피드백까지 진행하는 시간을 말합니다."),
        p("크몽 고객님 결과물 제출 멘트:"),
        quote("의뢰자님 결과물 크몽으로도 제출하겠습니다! 크몽 100자 이상 후기 남겨주시면 한 달 무료로 AS 도와드리고 있습니다^^ AS 소개서도 드리니 한 번 확인해주세요. 후기가 정말 큰 힘이 됩니다ㅜㅜ"),
        p("잔금이 지연되는 경우:"),
        quote("저희가 결과물 드린 후 잔금받고 AS 도와드리고 있어서 시간되실때 부탁드려요!")
      ),
      toggleH3("4. (AS) 시간만 잘 안내해도 고객 만족도 업!",
        p("반복적인 AS 요청이 올 경우 AS 사항을 한 번에 정리해달라고 요청하시면 됩니다."),
        quote("정리해서 카톡 남겨주시면 오늘 오후 6시 안으로 확인 도와드리겠습니다!"),
        calloutGreen("📌", "고객님의 만족도를 위해 꼭 바로바로 답장하지 않아도 됩니다. 답장 가능한 정확한 시간만 알려드리면 고객님의 만족도를 최상으로 유지시킬 수 있습니다.")
      ),
      toggleH3("5. (AS) 고객이 요청하는 방법이 통계적으로 가능한지 헷갈릴때",
        p("이 경우 동일한 방법을 사용한 레퍼런스(선행논문)이 있는지 질문을 드리면 됩니다. 가능한지 여부가 헷갈린다면 은호 or 현호에게 질문주세요 :)")
      ),
      toggleH3("6. 유료 AS 사례 + 멘트",
        p("기본 유료 AS 기준표:"),
        blist(
          "응답자 삭제 — 표만 수정: +3만",
          "응답자 삭제 — 표 해석 수정: +5만",
          "응답자 삭제 — 가설 채택 만드는 작업: +5만",
          "회귀분석 등 단순 분석 추가 / 재범주화: 무료 (작업량 많으면 3~5만)",
          "새로운 데이터 파일로 데이터 가공부터: 작업량에 따라 5~20만원"
        ),
        p("AS 기간 내 유료 AS 사례:"),
        blist(
          "(10.11) 박하나님 — 5만원: 일반적 특성 범주 변경으로 차이검정 표 8개 수정 + 4개 추가, 상관관계·회귀분석 하위요인 4개 추가",
          "(10.15) 김경진님 — 8만원: 가설 채택 위한 응답자 삭제(3만) + 빈도·기술통계·차이검정10·상관관계·회귀분석 수정(5만)",
          "(10.29) 오상훈님 — 8만원: 표 30개에 대한 해석 추가",
          "(11.5) 권순규님 — 5만원: 하위영역 재작업, 역문항 잘못 적용, 회귀분석 재작업 (고객님 착오)",
          "(11.8) 문수님 — 8만원: 표 형식 수정+응답자 삭제 작업(3만)+모든 표해석 수정(5만)",
          "(25.9.15) 홍채연님 — 무료: 6개월 전 의뢰, 첫 AS라 무료 처리",
          "(25.9.21) 함세리님 — 15만원: IPA 23회, 다중회귀분석 12회",
          "(25.9.21) 이성도님 — 10만원: 조절효과 30번 분석 후 유의한 10개만 표해석"
        )
      )
    ),
    toggleH2("💬 응대 멘트 메뉴얼",
      toggleH3("1. 첫 멘트",
        quote("불만족시 백프로 환불 스포디입니다!"),
        blist(
          "필요한 자료 요청: 연구계획서, 비슷한 통계형식의 모논문, 데이터나 설문지",
          "크몽의 경우 '자주 쓰는 문구'의 '기본 인사' 사용",
          "서비스소개서 보내기"
        )
      ),
      toggleH3("2. 파일 확인 후 견적",
        blist(
          "파일 확인 후 바로 견적 이야기하지 않기. 자료를 바탕으로 질문 or 소통을 통해 라포를 형성한 후 견적.",
          "논문 형식의 표해석뿐 아니라 한 달 A/S와 졸업까지 통계질문도 도와드린다고 언급."
        ),
        quote("의뢰 주시면 논문형식의 표해석뿐 아니라 교수님 피드백 위한 한달 무료 A/S, 졸업까지 통계 이해 위한 질문도 도와드리고 있어요")
      ),
      toggleH3("3. 분석 기한 + 후기 할인 안내",
        blist(
          "분석 시작 후 일주일 내로 드리고 있으며, 중간에 표 먼저 드리는 것도 가능하다고 언급.",
          "앞에 예약이 찼을 경우 예약 가능 날짜 안내.",
          "마지막으로 정성 후기 가능하면 만 원 할인 언급."
        )
      ),
      toggleH3("4. 결제창 보내기 + '정성' 후기 할인 언급",
        p("결제창 전송 후 정성 후기 빌드업. 제출 때도 동일하게 후기 언급.")
      ),
      toggleH3("5. 결제 후",
        blist(
          "크몽의 경우 비즈니스로 연결하기.",
          "비즈니스 연결 후 이름 변경."
        )
      )
    ),
    toggleH2("🔄 분석 중 체크리스트",
      taskList(
        "1] 역문항 여부 물어보았는가? (모른다고 하실 경우 동일한 설문지 사용한 모논문 물어보기 → 없으면 설문지 보며 역문항 확인 후 고객님께 질문 → 신뢰도분석 0.6 이상 확인)",
        "2] 하위요인 각각 몇 번 문항에 해당하는지 물어보았는가?",
        "3] 역문항이 몇 점 척도인지 인지하였는가? / 역코딩 진행하였는가? (4점, 7점 척도이면 역코딩 다르게 해야함. 1→4, 2→3, 3→2, 4→1)",
        "4] 결측치 or 이상치 확인하였는가? (빈도분석, 기술통계분석) — 일반적 특성에는 결측치가 있으면 안 됨",
        "5] 변수 계산 꼼꼼히 진행하였는가? (주의!!! 변수 계산을 잘못하면 처음부터 다시 하거나 환불해줘야 하는 상황 생김!!)",
        "6] 문제상황 발생 시 임의로 처리하지 않고 고객님께 알려드렸는가? (예: 탐색적 요인분석이 잘 묶이지 않은 경우)",
        "7] 중간중간 고객님께 분석 진행 사항 전달했는가? (표 완성 후 중간 보고 했는가?)",
        "10] 분석 시 변수는 절대 삭제하지 않기!! (전화번호 등 개인정보는 무조건 삭제!!) — '같은 변수로 코딩하기' 말고 '다른 변수로 코딩하기'",
        "11] 분석마다 결과파일 저장하기 (학교 제출용으로 요구하는 경우 많고 AS시 필요)"
      )
    ),
    toggleH2("📋 표, 해석, 메모 체크리스트",
      taskList(
        "8] 표해석 양식은 모논문의 구조를 최대한 참고하기. 모논문 없다면 분석시 메뉴얼의 양식을 참고하기.",
        "9] 챗지피티 복붙한 후 티 안나게 다듬기 (챗지피티 그대로 복붙은 절대 지양!!) — 안 오게 / '~' 누락 안 되게 / 오타나 오류 없는지 확인",
        "11] 통계결과를 임의로 수정하지 않습니다 (분석파일 요구하면 결국 걸림)",
        "13] 메모를 작성할 때는 아카이브에 있는 메모를 임의로 빠트리지 않습니다. (메모를 복붙하고 특정 값들을 해당 표에 맞게 수정해주세요)"
      )
    ),
    toggleH2("📦 결과물 전달 시 체크리스트",
      taskList(
        "1] 제출 전 검토 하였는가?",
        "2] (크몽) 정성 후기 안내 전달하였는가? — 크몽: 평점 5.0 후기 남겨주시면 한 달 간 A/S 무료로 도와드린다고 언급 / 비즈니스 고객은 후기 상관없이 한 달 무료",
        "3] (크몽) 제출 전 카톡으로 먼저 제출했는가? — 카톡 제출 후 → '선생님, 크몽으로도 제출하겠습니다!'",
        "4] 결과물 제공 후 잔금 받고 AS 진행한다고 전달하였는가?",
        "5] AS 정책 소개서 전달하였는가?",
        "6] 현금영수증 발급 안내하였는가? — '번호 보내주시면 현금영수증 발급도 도와드리겠습니다!'"
      )
    )
  );
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
    makeManualRootContent(),
    true
  ),

  // 분석 시 메뉴얼 (with rich content + child pages)
  makePage(
    MENU_IDS.MANUAL_ANALYSIS,
    "분석 시 메뉴얼",
    "📊",
    MENU_IDS.MANUAL,
    [
      MENU_IDS.MANUAL_ANALYSIS_FILES,
      MENU_IDS.MANUAL_ANALYSIS_CAUTION,
      MENU_IDS.MANUAL_ANALYSIS_FORMAT,
      MENU_IDS.MANUAL_PROCESS,
      MENU_IDS.MANUAL_SPSS,
      MENU_IDS.MANUAL_AMOS,
      MENU_IDS.MANUAL_POCKET,
    ],
    makeAnalysisManualContent(),
    false
  ),

  // 분석 시 메뉴얼 sub-pages
  makePage(MENU_IDS.MANUAL_ANALYSIS_FILES, "SPSS 파일 정리법", "📁", MENU_IDS.MANUAL_ANALYSIS, [], makeAnalysisFilesContent()),
  makePage(MENU_IDS.MANUAL_ANALYSIS_CAUTION, "분석 시 주의할 점", "⚠️", MENU_IDS.MANUAL_ANALYSIS, [], makeAnalysisCautionContent()),
  makePage(MENU_IDS.MANUAL_ANALYSIS_FORMAT, "표해석 양식", "📊", MENU_IDS.MANUAL_ANALYSIS, [], makeAnalysisFormatContent()),

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
  makePage(MENU_IDS.MANUAL_POCKET_TABLE, "한글표 제작 꿀팁", "📋", MENU_IDS.MANUAL_POCKET, [], makePocketTableContent()),
  makePage(MENU_IDS.MANUAL_POCKET_EXCEL, "Excel 함수", "📊", MENU_IDS.MANUAL_POCKET, [], makePocketExcelContent()),
  makePage(MENU_IDS.MANUAL_POCKET_GRAPH, "Graph 자료", "📈", MENU_IDS.MANUAL_POCKET, [], makePocketGraphContent()),
  makePage(MENU_IDS.MANUAL_POCKET_IPA, "IPA 분석", "🎯", MENU_IDS.MANUAL_POCKET, [], makePocketIpaContent()),
  makePage(MENU_IDS.MANUAL_POCKET_BORICH, "Borich 요구도", "📌", MENU_IDS.MANUAL_POCKET, [], makePocketBorichContent()),
  makePage(MENU_IDS.MANUAL_POCKET_FORM, "분석 표 양식", "📄", MENU_IDS.MANUAL_POCKET, [], makePocketFormContent()),
  makePage(MENU_IDS.MANUAL_POCKET_APA, "APA 형식", "📝", MENU_IDS.MANUAL_POCKET, [], makePocketApaContent()),

  // 크레도/응대 체크리스트
  makePage(MENU_IDS.MANUAL_CHECKLIST, "크레도 / 응대 체크리스트", "✅", MENU_IDS.MANUAL, [], makeChecklistContent()),

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

// 기존에 하드코딩되어 있던 체크박스 컬럼들 (customers.custom_fields 마이그레이션과 키를 맞춤)
const initialCustomColumns: CustomColumnDef[] = [
  { id: "review_proposed", label: "후기제안", type: "checkbox", order: 0 },
  { id: "balance_received", label: "잔금받음?", type: "checkbox", order: 1 },
  { id: "kmong_review", label: "크몽후기", type: "checkbox", order: 2 },
  { id: "kakao_review", label: "카톡후기", type: "checkbox", order: 3 },
  { id: "cash_receipt", label: "현금영수증", type: "checkbox", order: 4 },
];

// Default fields for Customer (handles migration from old schema)
const customerDefaults: Partial<Customer> = {
  route: "",
  settlement_amount: null,
  alba: "",
  monthPageId: null,
  custom_fields: {},
};

const freshState = {
  pages: initialPages,
  rootPageIds: [MENU_IDS.MANUAL, MENU_IDS.TAX, MENU_IDS.ADMATCH, MENU_IDS.STATGENIE],
  tasks: initialTasks,
  customers: initialCustomers,
  customerStatuses: initialCustomerStatuses,
  customColumns: initialCustomColumns,
  manualPages: {} as Record<string, ManualPageData>,
  monthlyCosts: [],
  sidebarCollapsed: false,
  darkMode: false,
  isRefreshing: false,
  syncError: false,
  customerSyncStatus: "saved" as const,
  crmColOrder: null,
  crmColLabels: {} as Record<string, string>,
  crmHiddenCols: [] as string[],
  crmColTypes: {} as Record<string, CustomColumnType>,
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
      pushOps.push(dbCustomers.upsert(localCustomer).then(() => {}));
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

const FORCE_RESEED_V9_FLAG = "manual_force_reseed_v15";

export async function forceReseedManualPages(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FORCE_RESEED_V9_FLAG) === "true") return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const seeds: Record<string, string> = {
    [MENU_IDS.MANUAL]: makeManualRootContent(),
    [MENU_IDS.MANUAL_ANALYSIS]: makeAnalysisManualContent(),
    [MENU_IDS.MANUAL_PROCESS]: makeProcessManualContent(),
    [MENU_IDS.MANUAL_SPSS]: makeSpssContent(),
    [MENU_IDS.MANUAL_SPSS_EFA]: makeSpssEfaContent(),
    [MENU_IDS.MANUAL_SPSS_CROSS]: makeSpssCrossContent(),
    [MENU_IDS.MANUAL_SPSS_FREQ]: makeSpssFreqContent(),
    [MENU_IDS.MANUAL_SPSS_DESC]: makeSpssDescContent(),
    [MENU_IDS.MANUAL_SPSS_CORR]: makeSpssCorrContent(),
    [MENU_IDS.MANUAL_SPSS_DIFF]: makeSpssDiffContent(),
    [MENU_IDS.MANUAL_SPSS_REG]: makeSpssRegContent(),
    [MENU_IDS.MANUAL_SPSS_MED]: makeSpssMedContent(),
    [MENU_IDS.MANUAL_SPSS_MOD]: makeSpssModContent(),
    [MENU_IDS.MANUAL_SPSS_PROC]: makeSpssProcContent(),
    [MENU_IDS.MANUAL_AMOS]: makeAmosContent(),
    [MENU_IDS.MANUAL_AMOS_CFA]: makeAmosCfaContent(),
    [MENU_IDS.MANUAL_AMOS_DISC]: makeAmosDiscContent(),
    [MENU_IDS.MANUAL_AMOS_SEM]: makeAmosSemContent(),
    [MENU_IDS.MANUAL_AMOS_MED]: makeAmosMedContent(),
    [MENU_IDS.MANUAL_AMOS_MOD]: makeAmosModContent(),
    [MENU_IDS.MANUAL_POCKET]: makePocketContent(),
    [MENU_IDS.MANUAL_POCKET_TABLE]: makePocketTableContent(),
    [MENU_IDS.MANUAL_POCKET_EXCEL]: makePocketExcelContent(),
    [MENU_IDS.MANUAL_POCKET_GRAPH]: makePocketGraphContent(),
    [MENU_IDS.MANUAL_POCKET_IPA]: makePocketIpaContent(),
    [MENU_IDS.MANUAL_POCKET_BORICH]: makePocketBorichContent(),
    [MENU_IDS.MANUAL_POCKET_FORM]: makePocketFormContent(),
    [MENU_IDS.MANUAL_POCKET_APA]: makePocketApaContent(),
    [MENU_IDS.MANUAL_ANALYSIS_FILES]: makeAnalysisFilesContent(),
    [MENU_IDS.MANUAL_ANALYSIS_CAUTION]: makeAnalysisCautionContent(),
    [MENU_IDS.MANUAL_ANALYSIS_FORMAT]: makeAnalysisFormatContent(),
    [MENU_IDS.MANUAL_CHECKLIST]: makeChecklistContent(),
  };

  const state = useWorkspaceStore.getState();
  const nowTs = new Date().toISOString();
  const ops: Promise<void>[] = [];

  // Fetch current pages from Supabase to compare (avoid overwriting user edits)
  const supaPages = await dbPages.fetchAll();

  // Upsert content for all known pages — but only if the page is effectively empty
  // (no user content). This prevents overwriting user-added text/images.
  for (const [id, content] of Object.entries(seeds)) {
    const supaPage = supaPages[id];
    const localPage = state.pages[id] ?? initialPages[id];
    const currentContent = supaPage?.content ?? localPage?.content ?? "";
    // Skip if the page already has meaningful user content
    if (!isEffectivelyEmpty(currentContent)) continue;
    const basePage = supaPage ?? localPage;
    if (basePage) {
      const updated = { ...basePage, content, updatedAt: nowTs };
      ops.push(dbPages.upsert(updated));
    }
  }

  // Ensure MANUAL_ANALYSIS children includes the 3 new sub-pages
  const analysisPage = state.pages[MENU_IDS.MANUAL_ANALYSIS] ?? initialPages[MENU_IDS.MANUAL_ANALYSIS];
  if (analysisPage) {
    const requiredChildren = [
      MENU_IDS.MANUAL_ANALYSIS_FILES,
      MENU_IDS.MANUAL_ANALYSIS_CAUTION,
      MENU_IDS.MANUAL_ANALYSIS_FORMAT,
      MENU_IDS.MANUAL_PROCESS,
      MENU_IDS.MANUAL_SPSS,
      MENU_IDS.MANUAL_AMOS,
      MENU_IDS.MANUAL_POCKET,
    ];
    const hasAll = requiredChildren.every((c) => (analysisPage.children as string[]).includes(c));
    if (!hasAll) {
      // Merge: keep any extra user-added children, ensure required ones present
      const existing = (analysisPage.children as string[]).filter((c) => !(requiredChildren as string[]).includes(c));
      const merged = { ...analysisPage, children: [...requiredChildren, ...existing], updatedAt: nowTs };
      ops.push(dbPages.upsert(merged));
    }
  }

  // Ensure MANUAL_POCKET children includes all 8 sub-pages
  const pocketPage = state.pages[MENU_IDS.MANUAL_POCKET] ?? initialPages[MENU_IDS.MANUAL_POCKET];
  if (pocketPage) {
    const requiredPocketChildren = [
      MENU_IDS.MANUAL_POCKET_PPT,
      MENU_IDS.MANUAL_POCKET_TABLE,
      MENU_IDS.MANUAL_POCKET_EXCEL,
      MENU_IDS.MANUAL_POCKET_GRAPH,
      MENU_IDS.MANUAL_POCKET_IPA,
      MENU_IDS.MANUAL_POCKET_BORICH,
      MENU_IDS.MANUAL_POCKET_FORM,
      MENU_IDS.MANUAL_POCKET_APA,
    ];
    const hasAll = requiredPocketChildren.every((c) => (pocketPage.children as string[]).includes(c));
    if (!hasAll) {
      const existing = (pocketPage.children as string[]).filter((c) => !(requiredPocketChildren as string[]).includes(c));
      const merged = { ...pocketPage, children: [...requiredPocketChildren, ...existing], updatedAt: nowTs };
      ops.push(dbPages.upsert(merged));
    }
  }

  if (ops.length > 0) await Promise.all(ops);

  localStorage.setItem(FORCE_RESEED_V9_FLAG, "true");
  await useWorkspaceStore.getState().loadFromSupabase();
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      ...freshState,

      createPage: (parentId = null, insertAfter, customId) => {
        const id = customId ?? uuidv4();
        // 이미 동일한 ID가 있으면 중복 생성 방지 (결정적 ID 사용 시 멱등성 보장)
        if (get().pages[id]) return id;
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
        // 로컬 state 즉시 반영
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id
              ? { ...c, ...updates, updated_at: new Date().toISOString() }
              : c
          ),
        }));
        // 1.5초 디바운스 후 Supabase 저장 (자동 저장)
        // functional get()으로 최신 state 읽어 race condition 없음
        if (customerUpsertTimers[id]) clearTimeout(customerUpsertTimers[id]);
        customerUpsertTimers[id] = setTimeout(() => {
          const customer = get().customers.find((c) => c.id === id);
          if (customer) dbCustomers.upsert(customer);
          delete customerUpsertTimers[id];
        }, 1500);
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
        dbCustomers.delete(id);
      },

      restoreCustomer: (customer) => {
        set((state) => ({
          customers: state.customers.some((c) => c.id === customer.id)
            ? state.customers.map((c) => (c.id === customer.id ? customer : c))
            : [...state.customers, customer],
        }));
        dbCustomers.upsert(customer);
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

      upsertCustomColumn: (column) => {
        set((state) => {
          const exists = state.customColumns.find((c) => c.id === column.id);
          if (exists) {
            return {
              customColumns: state.customColumns.map((c) =>
                c.id === column.id ? column : c
              ),
            };
          }
          return { customColumns: [...state.customColumns, column] };
        });
        dbTableColumns.upsert(column);
      },

      deleteCustomColumn: (id) => {
        set((state) => ({
          customColumns: state.customColumns.filter((c) => c.id !== id),
        }));
        dbTableColumns.delete(id);
      },

      reorderCustomColumns: (orderedIds) => {
        set((state) => {
          const byId = Object.fromEntries(state.customColumns.map((c) => [c.id, c]));
          const reordered = orderedIds
            .map((id, i) => (byId[id] ? { ...byId[id], order: i } : null))
            .filter((c): c is CustomColumnDef => c !== null);
          return { customColumns: reordered };
        });
        dbTableColumns.upsertMany(get().customColumns);
      },

      // ── CRM column layout ─────────────────────────────────────────────────

      setCrmColOrder: (order) => {
        set({ crmColOrder: order });
        dbWorkspaceConfig.set("crmColOrder", order);
      },
      setCrmColLabel: (id, label) => {
        set((state) => {
          const next = { ...state.crmColLabels, [id]: label };
          dbWorkspaceConfig.set("crmColLabels", next);
          return { crmColLabels: next };
        });
      },
      setCrmHiddenCols: (cols) => {
        set({ crmHiddenCols: cols });
        dbWorkspaceConfig.set("crmHiddenCols", cols);
      },
      setCrmColType: (id, type) => {
        set((state) => {
          const next = { ...state.crmColTypes, [id]: type };
          dbWorkspaceConfig.set("crmColTypes", next);
          return { crmColTypes: next };
        });
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

      upsertMonthlyCost: (cost) => {
        set((state) => {
          const rest = state.monthlyCosts.filter(
            (c) => !(c.year === cost.year && c.month === cost.month)
          );
          return { monthlyCosts: [...rest, cost] };
        });
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
              .map((c) => dbCustomers.upsert(c).then(() => {})),
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

        const [pages, tasks, customers, statuses, columns, manualNodesData, manualRoots,
               rootPageIdsConfig, crmColOrderConfig, crmColLabelsConfig, crmHiddenColsConfig, crmColTypesConfig] =
          await Promise.all([
            dbPages.fetchAll(),
            dbTasks.fetchAll(),
            dbCustomers.fetchAll(),
            dbCustomerStatuses.fetchAll(),
            dbTableColumns.fetchAll(),
            dbManualNodes.fetchAll(),
            dbManualPageRoots.fetchAll(),
            dbWorkspaceConfig.get("rootPageIds"),
            dbWorkspaceConfig.get("crmColOrder"),
            dbWorkspaceConfig.get("crmColLabels"),
            dbWorkspaceConfig.get("crmHiddenCols"),
            dbWorkspaceConfig.get("crmColTypes"),
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

        const uploadOps: Promise<void>[] = [];
        if (localOnlyPages.length > 0) uploadOps.push(dbPages.upsertMany(localOnlyPages));
        if (localOnlyTasks.length > 0) uploadOps.push(...localOnlyTasks.map((t) => dbTasks.upsert(t)));
        if (uploadOps.length > 0) await Promise.all(uploadOps);

        // Seed workspace config if missing
        if (!supabaseHasPages) {
          await Promise.all([
            dbCustomerStatuses.upsertMany(current.customerStatuses),
            dbWorkspaceConfig.set("rootPageIds", current.rootPageIds),
          ]);
        }
        if (columns.length === 0 && current.customColumns.length > 0) {
          dbTableColumns.upsertMany(current.customColumns);
        }

        // Supabase가 있으면 그것만 사용, 없으면 로컬 첫 마이그레이션 데이터 사용
        const mergedPages: Record<string, Page> = supabaseHasPages
          ? { ...pages }
          : { ...pages, ...Object.fromEntries(localOnlyPages.map((p) => [p.id, p])) };

        // 기본 메뉴얼 페이지 복원: Supabase에 없거나 비어있는 경우 seeded content 사용
        const defaultSeeds: Record<string, string> = {
          [MENU_IDS.MANUAL]: makeManualRootContent(),
          [MENU_IDS.MANUAL_ANALYSIS]: makeAnalysisManualContent(),
          [MENU_IDS.MANUAL_PROCESS]: makeProcessManualContent(),
          [MENU_IDS.MANUAL_SPSS]: makeSpssContent(),
          [MENU_IDS.MANUAL_SPSS_EFA]: makeSpssEfaContent(),
          [MENU_IDS.MANUAL_SPSS_CROSS]: makeSpssCrossContent(),
          [MENU_IDS.MANUAL_SPSS_FREQ]: makeSpssFreqContent(),
          [MENU_IDS.MANUAL_SPSS_DESC]: makeSpssDescContent(),
          [MENU_IDS.MANUAL_SPSS_CORR]: makeSpssCorrContent(),
          [MENU_IDS.MANUAL_SPSS_DIFF]: makeSpssDiffContent(),
          [MENU_IDS.MANUAL_SPSS_REG]: makeSpssRegContent(),
          [MENU_IDS.MANUAL_SPSS_MED]: makeSpssMedContent(),
          [MENU_IDS.MANUAL_SPSS_MOD]: makeSpssModContent(),
          [MENU_IDS.MANUAL_SPSS_PROC]: makeSpssProcContent(),
          [MENU_IDS.MANUAL_AMOS]: makeAmosContent(),
          [MENU_IDS.MANUAL_AMOS_CFA]: makeAmosCfaContent(),
          [MENU_IDS.MANUAL_AMOS_DISC]: makeAmosDiscContent(),
          [MENU_IDS.MANUAL_AMOS_SEM]: makeAmosSemContent(),
          [MENU_IDS.MANUAL_AMOS_MED]: makeAmosMedContent(),
          [MENU_IDS.MANUAL_AMOS_MOD]: makeAmosModContent(),
          [MENU_IDS.MANUAL_POCKET]: makePocketContent(),
          [MENU_IDS.MANUAL_POCKET_TABLE]: makePocketTableContent(),
          [MENU_IDS.MANUAL_POCKET_EXCEL]: makePocketExcelContent(),
          [MENU_IDS.MANUAL_POCKET_GRAPH]: makePocketGraphContent(),
          [MENU_IDS.MANUAL_POCKET_IPA]: makePocketIpaContent(),
          [MENU_IDS.MANUAL_POCKET_BORICH]: makePocketBorichContent(),
          [MENU_IDS.MANUAL_POCKET_FORM]: makePocketFormContent(),
          [MENU_IDS.MANUAL_POCKET_APA]: makePocketApaContent(),
          [MENU_IDS.MANUAL_ANALYSIS_FILES]: makeAnalysisFilesContent(),
          [MENU_IDS.MANUAL_ANALYSIS_CAUTION]: makeAnalysisCautionContent(),
          [MENU_IDS.MANUAL_ANALYSIS_FORMAT]: makeAnalysisFormatContent(),
          [MENU_IDS.MANUAL_CHECKLIST]: makeChecklistContent(),
        };
        const reseedOps: Promise<void>[] = [];
        for (const [id, defaultPage] of Object.entries(initialPages)) {
          if (!mergedPages[id]) {
            mergedPages[id] = defaultPage;
          } else if (defaultSeeds[id] && isEffectivelyEmpty(mergedPages[id].content)) {
            const reseeded = { ...mergedPages[id], content: defaultSeeds[id] };
            mergedPages[id] = reseeded;
            reseedOps.push(dbPages.upsert(reseeded));
          }
        }
        if (reseedOps.length > 0) await Promise.all(reseedOps);

        // Supabase에 남아있는 기본 샘플 업무 항목 모두 삭제 (중복 포함)
        const defaultTasksInSupa = tasks.filter((t) => DEFAULT_TASK_TITLES.includes(t.title));
        if (defaultTasksInSupa.length > 0) {
          defaultTasksInSupa.forEach((t) => dbTasks.delete(t.id));
        }
        const cleanedTasks = tasks.filter((t) => !DEFAULT_TASK_TITLES.includes(t.title));

        const mergedTasks = supabaseHasTasks
          ? cleanedTasks
          : [...cleanedTasks, ...localOnlyTasks];

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

        const supaCustomerIds = new Set(customers.map((c) => c.id));

        // set()에 함수를 넘겨 실행 시점의 최신 state를 참조
        // (async fetch 동안 추가된 신규 고객도 latest.customers에 포함되어 유실되지 않음)
        set((latest) => {
          // fetch 완료 시점의 최신 로컬 상태 기준으로 localOnly 재계산
          const localOnlyCustomers = latest.customers.filter((c) => !supaCustomerIds.has(c.id));
          const mergedCustomers = [...customers, ...localOnlyCustomers];

          return {
            pages: Object.keys(mergedPages).length > 0 ? mergedPages : latest.pages,
            rootPageIds: derivedRootPageIds,
            tasks: mergedTasks,
            customers: mergedCustomers,
            customerStatuses: statuses.length > 0 ? statuses : latest.customerStatuses,
            customColumns: columns.length > 0 ? columns : latest.customColumns,
            // manualPages: Supabase에 데이터가 있으면 사용, 비어있으면 로컬 유지
            manualPages: Object.keys(manualPages).length > 0 ? manualPages : latest.manualPages,
            // CRM 열 레이아웃: Supabase 값 우선, 없으면 로컬 유지
            ...(crmColOrderConfig !== null && { crmColOrder: crmColOrderConfig as string[] }),
            ...(crmColLabelsConfig !== null && { crmColLabels: crmColLabelsConfig as Record<string, string> }),
            ...(crmHiddenColsConfig !== null && { crmHiddenCols: crmHiddenColsConfig as string[] }),
            ...(crmColTypesConfig !== null && { crmColTypes: crmColTypesConfig as Record<string, CustomColumnType> }),
            isRefreshing: false,
          };
        });
        } catch (e) {
          set({ isRefreshing: false, syncError: true });
          throw e;
        }
      },
    }),
    {
      name: "statfordegree-hub-storage",
      version: 9,
      migrate: (persistedState: unknown, version: number) => {
        const s = persistedState as Record<string, unknown>;
        const DEFAULT_TITLES = ["팀 메뉴얼 초안 작성", "업무 프로세스 정리"];

        let migrated: Record<string, unknown>;

        if (version === 8) {
          // v8 → v9: no shape change besides the custom_fields conversion below
          migrated = { ...s };
        } else if (version === 7) {
          // v7 → v8: populate manual page content (was empty stubs)
          const pages = (s.pages as Record<string, Page>) ?? {};
          const updatedPages = { ...pages };
          const contentMap: Record<string, string> = {
            [MENU_IDS.MANUAL]: makeManualRootContent(),
            [MENU_IDS.MANUAL_ANALYSIS]: makeAnalysisManualContent(),
            [MENU_IDS.MANUAL_PROCESS]: makeProcessManualContent(),
            [MENU_IDS.MANUAL_SPSS]: makeSpssContent(),
            [MENU_IDS.MANUAL_AMOS]: makeAmosContent(),
            [MENU_IDS.MANUAL_POCKET]: makePocketContent(),
            [MENU_IDS.MANUAL_CHECKLIST]: makeChecklistContent(),
          };
          for (const [id, content] of Object.entries(contentMap)) {
            if (updatedPages[id]) {
              updatedPages[id] = { ...updatedPages[id], content };
            }
          }
          migrated = { ...s, pages: updatedPages };
        } else if (version === 6) {
          // v6 → v9: 기본 업무 항목 완전 제거 (중복 누적된 경우도 모두 삭제)
          migrated = {
            ...s,
            tasks: ((s.tasks as Task[]) ?? []).filter(
              (t) => !DEFAULT_TITLES.includes(t.title)
            ),
          };
        } else if (version === 5) {
          migrated = {
            ...s,
            tasks: ((s.tasks as Task[]) ?? []).filter(
              (t) => !DEFAULT_TITLES.includes(t.title)
            ),
          };
        } else if (version === 4) {
          migrated = {
            ...freshState,
            tasks: [],
            customers: ((s.customers as Customer[]) ?? []).map((c) => ({
              ...customerDefaults,
              ...c,
            })),
            customerStatuses: (s.customerStatuses as StatusOption[]) ?? freshState.customerStatuses,
            sidebarCollapsed: (s.sidebarCollapsed as boolean) ?? false,
            darkMode: (s.darkMode as boolean) ?? false,
          };
        } else {
          // 구버전: 전체 초기화
          return freshState;
        }

        // v4~v8 → v9: 하드코딩된 체크박스 컬럼(후기제안/잔금받음?/크몽후기/카톡후기/현금영수증)을
        // custom_fields(동적 컬럼 값 맵)으로 이전. 기존 값 손실 없이 매핑.
        const LEGACY_BOOL_KEYS = [
          "review_proposed",
          "balance_received",
          "kmong_review",
          "kakao_review",
          "cash_receipt",
        ] as const;

        const migratedCustomers = ((migrated.customers as Record<string, unknown>[]) ?? []).map((c) => {
          const custom_fields: Record<string, boolean> = {
            ...((c.custom_fields as Record<string, boolean>) ?? {}),
          };
          for (const key of LEGACY_BOOL_KEYS) {
            if (key in c && !(key in custom_fields)) {
              custom_fields[key] = Boolean(c[key]);
            }
          }
          const rest = { ...c };
          for (const key of LEGACY_BOOL_KEYS) delete rest[key];
          return { ...rest, monthPageId: (c.monthPageId as string | null | undefined) ?? null, custom_fields };
        });

        return {
          ...migrated,
          customers: migratedCustomers,
          customColumns: (migrated.customColumns as CustomColumnDef[]) ?? freshState.customColumns,
        };
      },
    }
  )
);

// ── Supabase Realtime 부분 reload (useSupabaseInit에서 사용) ──────────────────
// 변경된 테이블만 fetch해서 state를 업데이트합니다.
// loadFromSupabase (전체 12테이블 동시 fetch) 대신 가벼운 부분 reload를 사용합니다.

export async function _reloadCustomers() {
  const next = await dbCustomers.fetchAll();
  // fetch 실패(빈 배열 반환)와 실제로 DB가 빈 경우를 구분
  // 로컬에 고객이 있는데 next가 비어있으면 fetch 오류로 간주하고 건너뜀
  const currentCount = useWorkspaceStore.getState().customers.length;
  if (next.length === 0 && currentCount > 0) return;
  // Supabase가 진실의 원천 — 전체 교체 (localOnly 로직을 쓰면 삭제된 고객이 되살아나는 버그 발생)
  useWorkspaceStore.setState({ customers: next });
}

export async function _reloadColumns() {
  const next = await dbTableColumns.fetchAll();
  const currentCount = useWorkspaceStore.getState().customColumns.length;
  if (next.length === 0 && currentCount > 0) return;
  useWorkspaceStore.setState({ customColumns: next });
}

export async function _reloadStatuses() {
  const next = await dbCustomerStatuses.fetchAll();
  const currentCount = useWorkspaceStore.getState().customerStatuses.length;
  if (next.length === 0 && currentCount > 0) return;
  useWorkspaceStore.setState({ customerStatuses: next });
}

export async function _reloadWorkspaceConfig() {
  if (!supabase) return;
  const [colOrder, colLabels, hiddenCols, colTypes] = await Promise.all([
    dbWorkspaceConfig.get("crmColOrder"),
    dbWorkspaceConfig.get("crmColLabels"),
    dbWorkspaceConfig.get("crmHiddenCols"),
    dbWorkspaceConfig.get("crmColTypes"),
  ]);
  useWorkspaceStore.setState({
    ...(colOrder !== null && { crmColOrder: colOrder as string[] }),
    ...(colLabels !== null && { crmColLabels: colLabels as Record<string, string> }),
    ...(hiddenCols !== null && { crmHiddenCols: hiddenCols as string[] }),
    ...(colTypes !== null && { crmColTypes: colTypes as Record<string, CustomColumnType> }),
  });
}

