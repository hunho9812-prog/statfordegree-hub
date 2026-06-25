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

function doc(title: string, ...nodes: object[]) {
  return JSON.stringify({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] },
      ...nodes,
      { type: "paragraph", content: [] },
    ],
  });
}

function makeAnalysisManualContent(): string {
  return doc(
    "분석 시 메뉴얼",
    calloutYellow("분석 시작 전 반드시 숙지하세요."),
    h2("📁 SPSS 파일 정리법"),
    blist(
      "맨 왼쪽에 No 변수 만들어주기.",
      "인구통계 범주화 한 변수는 기존 인구통계 변수 바로 옆에 붙여주기.",
      "EFA에서 삭제되는 문항, 역코딩 진행 후 원래 문항 등 분석에 사용하지 않는 문항은 맨 위로 옮겨놓기 (분석에 안 쓰이는 문항. 삭제 X)",
      "하위요인 네이밍 한 후 같은 하위요인끼리 뭉쳐놓기.",
      "평균 or 합계 계산할 때 '자기효능감 평균', '자기효능감합계' 등 '변수이름+평균' 형식으로 네이밍하기.",
      "상위요인은 '전체평균', '전체합계' 붙이기 (상위요인과 하위요인 구분 위해)",
      "일반적 특성 각 범주 라벨링하기!"
    ),
    h2("⚠️ 분석 시 주의할 점"),
    blist(
      "범주화 등 변수 수정 과정에서 원래 변수 삭제하지 않기 (AS 과정에서 원래 변수가 필요한 경우 많음)",
      "데이터 수정 등의 작업 진행 후 이전 SPSS 파일 삭제하지 않고 히스토리 저장하기 (AS 과정에서 이전 데이터가 필요한 경우 많음)",
      "시작 날짜에 고객님께 분석 시작한다고 언급하기",
      "분석 시작하기 전 논문 주제, 자료분석방법 읽고 큰 틀 이해하기"
    ),
    h2("📊 모논문 없을 때 표해석 양식"),
    h3("소수점 자리수 / 소수점 앞 0 생략 여부"),
    blist(
      "모든 분석에서 t/F, p는 #.000으로 작성해줍니다.",
      "기술통계와 차이검정에서 최소값, 최대값, M(평균), SD(표준편차)의 경우 0.00으로 작성해줍니다.",
      "유의확률 .000은 <.001로 바꿔줍니다!!"
    ),
    h3("표 밑 유의확률"),
    blist(
      "표 밑의 유의확률 표시는 해당 표에서 어떤 유의확률 값이 나타났는지에 따라 다르게 써야합니다.",
      "표의 세로선은 모두 없애줍니다.",
      "표와 해석 글씨는 바탕글로 통일해줍니다 (AS 할 때 편함)"
    ),
    h3("빈도분석 표 형식"),
    p("1. 어떤 분석을 진행하였고 표 몇 번에 해당하는지 서술"),
    quote("응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 <표 1>과 같이 나타내었다."),
    p("2. 각 변수마다 응답이 가장 많은 집단부터 가장 적은 집단 순서대로 빈도와 퍼센트를 서술해줍니다."),
    h3("차이검정 표 형식"),
    blist(
      "표 형식: N, M, SD, t/F, p, Scheffe 순으로",
      "ANOVA 결과는 유의한데(p가 0.05보다 작은데) 사후검정이 나눠지지 않으면 (n/a)로 기재.",
      "사후검정 알파벳은 첫 집단부터 a, b, c…로 지정",
      "ANOVA 결과는 유의하지 않으면(p가 0.05보다 큰데) 사후검정이 나눠지더라도 기재 X."
    ),
    h3("회귀분석 표 형식"),
    blist(
      "표 형식 → B, SE, β, t, p, VIF, R², 수정된 R², Durbin-Watson 모두 표기 (더미변수 투입한 경우 Ref도 표기)",
    ),
    quote("차이검정에서 유의한 차이를 보인 인구통계 변수를 통제변수로 투입한 후 다중회귀분석을 실시하였고 결과는 <표 >와 같다.\n\n먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(VIF) 값은 모두 10 미만으로 나타나 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2에 가까워 잔차의 자기상관성 문제도 없었다.")
  );
}

function makeProcessManualContent(): string {
  return doc(
    "분석과정 메뉴얼",
    calloutBlue("💡", "분석과정 메뉴얼 — 단계별로 진행하세요"),
    h2("1] 엑셀 받고 데이터 클리닝 (이 부분 너무 중요함. 검토 여러 번..!)"),
    h3("1] 역문항, 하위문항 확인하기"),
    blist(
      "어떤 문항이 역문항에 해당되는지, 각 척도는 어떤 하위문항으로 구성되어 있는지, 하위문항은 각각 몇 번에 해당하는지",
      "변수계산은 평균이랑 합계 중 어떤 걸로 할지 확인하기 (연구계획서 척도 설명 부분에 나와있음. 없으면 물어보기)"
    ),
    h3("2] 맨 왼쪽에 No 추가 (데이터마다 일련번호 부여하면 AS 시 작업이 용이함) — -obs"),
    h3("3] 문항 번호 넣기 (열번호)"),
    blist(
      "개인특성1, 개인특성2 …… (오른쪽 아래 드래그로 한 번에 가능)",
      "위와 같이 번호만 바뀌는 문항명은 변수 계산 할 때 유리하다. ex) '변수계산'에서 sum(직무만족도1 to 직무만족도9)"
    ),
    h3("4] 설문지 보면서 한글을 숫자로 변경 (자동화 프로그램 사용 영상)"),
    h3("5] 역코딩 후 변수계산 (자동화툴 사용 영상)"),
    h3("추가] 복수 응답 코딩 방법 (countif 함수 이용)"),
    h2("2] SPSS 연동 후 데이터 클리닝"),
    h3("1) 빈도분석으로 결측치 확인"),
    blist(
      "인구통계변수(성별, 연령대)에 결측치가 있는 경우 물어보기",
      "방법1: 가장 많이 응답한 숫자 넣기 (여성이 남성보다 많은 경우 결측치를 모두 여성으로 채움)",
      "방법2: 결측치가 있는 응답자 삭제 (방법1보다 추천하지는 않음)",
      "척도(ex. 직무만족도1)에 결측치가 있는 경우 그냥 넘어가면 됨. SPSS가 알아서 제외 후 평균내줌.",
      "척도(ex. 직무만족도1) 오타 확인 — 문항 전체 빈도분석 돌려서 값 확인. 가끔 44, 55 등 오타 있음 → 4, 5로 수정"
    ),
    h3("2) 기술통계로 이상치 확인"),
    p("최소값과 최대값 확인 후 이상치 있는지 확인 (오타로 인해 44, 55 등의 숫자가 있을 수 있음). 어떻게 처리할지 고객에게 물어봄."),
    h3("3) 역코딩 하기 (엑셀 파일에서 했으면 넘어가기)"),
    p("SPSS로 역코딩하는 방법: 꼭 '다른 변수로 코딩 변경' 이용!"),
    h3("4) 신뢰도 분석"),
    p("신뢰도가 0.6보다 낮은 경우 → 문항 삭제 or 데이터 수정 (3인톡방에 물어보기)"),
    h3("5) 정규성 검정 (필수는 아님. 연구계획서에 정규성검정 or 비모수검정이 있다면 해줘야 함)"),
    blist(
      "연구계획서에 비모수 검정이 있거나 정규성 검정을 시행한다고 적혀있다.",
      "표본의 개수가 30 미만이다."
    ),
    h2("3] 통계분석 (SPSS) — 하위 페이지 참고"),
    h2("4] 통계분석 (AMOS) — 하위 페이지 참고"),
    h2("5] 메모 (도움말 남기기)"),
    p("해석 아카이브 형식과 동일하게, 고객님의 예시(빨간색 표시) 수정해주기."),
    p("해석 작성 챗GPTs 링크: https://chatgpt.com/g/g-KBJrZ74Ld-seupodi-haeseog-jagseong-doumi")
  );
}

function makeSpssContent(): string {
  return doc(
    "통계분석(SPSS)",
    h2("SPSS 분석 항목"),
    blist(
      "2] 탐색적 요인분석 (EFA) — 이쁘게 안 묶이면 3인톡방에 말해주기",
      "3] 교차검정",
      "4] 빈도분석",
      "4-1] 복수응답 빈도분석",
      "5] 기술통계분석",
      "6] 상관관계분석",
      "7] 차이검정",
      "8] 다중회귀분석",
      "9] Baron&Kenny 이용한 매개효과",
      "10] Baron&Kenny 이용한 조절효과 (+ 상호작용항 만들기)",
      "10-1] 조절효과 그래프 만들기",
      "11] 매개된 조절효과",
      "12] 프로세스 매크로 (1, 4, 5, 6번)"
    ),
    h2("탐색적 요인분석 EFA"),
    p("EFA가 잘 묶이지 않을 경우 대처 방법:"),
    blist(
      "1. 척도를 가져왔을 때 수정하지 않은 경우 EFA를 하지 않아도 되는 걸 말씀드리기.",
      "2. 구조방정식 논문 진행하면 EFA 대신 CFA로 바로 넘어가기.",
      "3. 죽어도 EFA를 해야한다 → 하위요인을 삭제하고 진행하기."
    ),
    h2("상관관계분석 해석 틀"),
    p("상위요인 변수가 4개일 때: 외상후성장과 의도적반추 / 외상후성장과 자기노출 / 외상후성장과 사회적지지 / 의도적반추와 자기노출 / 의도적반추와 사회적지지 / 자기노출과 사회적지지 순서대로 서술."),
    p("왼쪽 요인은 상위요인만, 오른쪽 요인은 상위요인과 하위요인 모두 언급."),
    h2("다중회귀분석 해석 틀"),
    quote("차이검정에서 유의한 차이를 보인 인구통계 변수를 통제변수로 투입한 후 다중회귀분석을 실시하였고 결과는 <표 >와 같다.\n\n먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(VIF) 값은 모두 10 미만으로 나타나 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2에 가까워 잔차의 자기상관성 문제도 없었다. 회귀모형의 설명력(R²)은 00%로 나타났으며, 모형은 통계적으로 유의한 것으로 확인되었다(F=, p<.001)."),
    h2("프로세스 매크로"),
    blist(
      "Model 1: 조절효과",
      "Model 4: 매개효과",
      "Model 5: 조절된 직접효과",
      "Model 6: 이중매개효과"
    )
  );
}

function makeAmosContent(): string {
  return doc(
    "통계분석(AMOS)",
    h2("AMOS 분석 항목"),
    blist(
      "1] CFA (확인적 요인분석)",
      "2] 판별타당성",
      "3] 구조방정식 (SEM)",
      "4] AMOS 매개효과",
      "5] AMOS 조절효과 (다중집단 비교분석)"
    ),
    h2("1] CFA 표해석 메뉴얼"),
    h3("집중타당성 기준"),
    blist(
      "요인적재치: 사회과학 연구에서 .4 이상일 때 유의한 변수, .5 이상일 때 중요한 변수",
      "C.R.(개념신뢰도): .7 이상이면 집중타당성 있음",
      "AVE(평균분산추출): .5 이상일 때 수렴타당도 있음"
    ),
    p("AVE가 0.5보다 낮을 때: 문항 삭제를 통해 AVE를 올려본다. 도저히 안 올라가면 개념신뢰도가 0.6보다 높을 경우 타당도가 적절할 수 있다는 선행연구 인용 (Fornell & Larcker, 1981)."),
    h3("모형적합도 기준"),
    p("X² 통계량의 경우 p=0.000으로 적합도의 기준에 미치지 못하나, 샘플의 개수가 증가할수록 X² 값도 증가하게 되므로 다른 적합지수와 함께 고려하여 적합도를 판단하여야한다 (배병렬, 2014)"),
    h3("오류: sample moment matrix is not positive definite"),
    p("상관행렬을 계산할 수 없는 상태. 발생 이유: 1. 문항 하나가 분산이 0인 경우 / 2. 특정 변수가 다른 변수와 완전히 똑같거나 반대인 경우"),
    h2("2] 판별타당성"),
    p("판별타당성 충족 안 될 경우 (상관계수 > AVE 제곱근): 상관계수 ± 2×표준오차값이 1을 포함하지 않는지 확인하는 방법으로 2차 검증 수행."),
    h2("4] AMOS 매개효과 관련 파일"),
    blist(
      "AMOS이용매개효과.pdf",
      "AMOS이용다중매개논문.pdf",
      "이중매개팬텀변수.pdf"
    ),
    h2("5] AMOS 조절효과 관련 파일"),
    blist(
      "측정동일성!amos조절효과_조충경님.pdf",
      "측정동일성형태동일성_든든한고등어.pdf",
      "amos다중집단비교분석.pdf"
    )
  );
}

function makePocketContent(): string {
  return doc(
    "통계주머니",
    calloutBlue("🗨️", "통계주머니 — 자주 쓰는 자료 모음"),
    h2("연구모형 제작 PPT"),
    p("연구모형 예시.pptx 파일 첨부"),
    h2("한글표 제작 꿀팁"),
    h3("단축키"),
    blist(
      "드래그 후 Alt + Shift + Enter — 윗첨자 변경",
      "표 열 추가: Ctrl + Enter",
      "표 열 제거: Ctrl + Backspace"
    ),
    h3("상용구 사용법"),
    blist(
      "입력방법: 입력 > 입력 도우미 > 상용구 > 상용구 내용",
      "사용방법: 준말 입력 후 Alt + i",
      "예시 'd': R²=, Adj.R²=, F=, p<.001, Durbin-Watson=",
      "예시 'k': Kaiser-Meyer-Olkin Measure of Sampling Adequacy"
    ),
    h3("표 폭 줄이기 (표 다이어트)"),
    p("blog.naver.com/lavieenrose77/221967385573 참고"),
    h2("Graph"),
    p("조절효과그래프.xlsx 파일 첨부"),
    h2("엑셀(Excel) 함수"),
    p("함수 종합.xlsx 파일 첨부"),
    h2("IPA와 Borich 요구도"),
    h3("IPA 분석"),
    blist(
      "IPA 산출.xlsx 파일 참고",
      "IPA 분석 예시.hwp 파일 참고"
    ),
    h3("Borich 요구도"),
    blist(
      "borich 요구도 산출.xlsx 파일 참고",
      "Borich 요구도 예시.hwp 파일 참고"
    ),
    h2("분석 표 양식 주머니"),
    p("각 분석에 대한 표 양식을 모아보았습니다. 모논문과 해당 모음집 참고하여 제작에 도움이 되셨으면 좋겠습니다."),
    blist(
      "SPSS: SPSS통계표메모아카이브.zip",
      "AMOS: AMOS.zip"
    ),
    h2("APA 형식"),
    p("APA 형식이란 사회과학, 교육, 심리학 등 학문 분야에서 널리 쓰이는 표준 논문 작성 및 인용 스타일입니다. 간혹 APA 형식으로 작성을 부탁하시는 고객님이 계십니다."),
    h2("국건영 메뉴얼"),
    p("blog.naver.com/kimpubli1214/224245377569 참고")
  );
}

function makeManualRootContent(): string {
  return doc(
    "메뉴얼",
    calloutBlue("📋", "SPSS 분석 가이드 · 고객 응대 크레도 · 응대 체크리스트"),
    h2("📊 분석 시 메뉴얼"),
    p("SPSS 파일 정리법, 분석 시 주의할 점, 표해석 양식, 분석과정 메뉴얼, SPSS/AMOS 통계분석 가이드, 통계주머니"),
    h2("✅ 크레도 / 응대 체크리스트"),
    p("고객 응대 크레도 6원칙, 응대 멘트 메뉴얼, 분석 중·표해석·결과물 전달 체크리스트")
  );
}

function makeChecklistContent(): string {
  return doc(
    "크레도 / 응대 체크리스트",
    calloutRed("⚠️", "크레도 필독 — 고객 응대 전 반드시 숙지하세요."),
    h2("❤️ 크레도 (응대 원칙)"),
    h3("1. 채팅은 웃으면서, 부드럽게, 친절하게"),
    p("스탯포디그리는 고객과 얼굴을 대면하지 않고 채팅으로 응대합니다. 사람은 얼굴을 보지 않고 채팅만 보면 말의 뉘앙스를 부정적으로 인지하는 경우가 많습니다."),
    calloutGreen("📌", "고객님께 채팅할 때는 끝에 항상 '^^, !, ㅎㅎ' 등의 감정표현을 붙여줍니다. 평서문(맞습니다. 네. 그렇습니다.)은 사용하지 않습니다."),
    p("특히 고객님이 반복적인 AS나 질문을 하시는 경우 미안해하시는 경우가 많습니다. 언제 어디서나 감정표현 필수입니다."),
    h3("2. 중간중간 소통과 대화는 필수"),
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
    quote("의뢰자님 표 먼저 드립니다! 이대로 해석작업 들어가겠습니다 혹시 궁금하신 부분 있으면 말씀주세요ㅎㅎ"),
    h3("3. 제출할 땐 이것만 기억하자"),
    calloutRed("⚠️", "결과물을 너무 늦은 밤에 제출하거나, 결과물을 제출하고 잠수를 타는 상황은 절대 지양합니다!"),
    p("만약 목요일이 제출 기한이라면 적어도 목요일 오후 6시 전에는 제출해야 합니다. 고객님이 말씀하신 기한이란, 결과물을 확인하고 피드백까지 진행하는 시간을 말합니다."),
    p("크몽 고객님 결과물 제출 멘트:"),
    quote("의뢰자님 결과물 크몽으로도 제출하겠습니다! 크몽 100자 이상 후기 남겨주시면 한 달 무료로 AS 도와드리고 있습니다^^ AS 소개서도 드리니 한 번 확인해주세요. 후기가 정말 큰 힘이 됩니다ㅜㅜ"),
    p("잔금이 지연되는 경우:"),
    quote("저희가 결과물 드린 후 잔금받고 AS 도와드리고 있어서 시간되실때 부탁드려요!"),
    h3("4. (AS) 시간만 잘 안내해도 고객 만족도 업!"),
    p("반복적인 AS 요청이 올 경우 AS 사항을 한 번에 정리해달라고 요청하시면 됩니다."),
    quote("정리해서 카톡 남겨주시면 오늘 오후 6시 안으로 확인 도와드리겠습니다!"),
    calloutGreen("📌", "고객님의 만족도를 위해 꼭 바로바로 답장하지 않아도 됩니다. 답장 가능한 정확한 시간만 알려드리면 고객님의 만족도를 최상으로 유지시킬 수 있습니다."),
    h3("5. (AS) 고객이 요청하는 방법이 통계적으로 가능한지 헷갈릴때"),
    p("이 경우 동일한 방법을 사용한 레퍼런스(선행논문)이 있는지 질문을 드리면 됩니다. 가능한지 여부가 헷갈린다면 은호 or 현호에게 질문주세요 :)"),
    h3("6. 유료 AS 사례 + 멘트"),
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
    ),
    h2("💬 응대 멘트 메뉴얼"),
    h3("1. 첫 멘트"),
    quote("불만족시 백프로 환불 스포디입니다!"),
    blist(
      "필요한 자료 요청: 연구계획서, 비슷한 통계형식의 모논문, 데이터나 설문지",
      "크몽의 경우 '자주 쓰는 문구'의 '기본 인사' 사용",
      "서비스소개서 보내기"
    ),
    h3("2. 파일 확인 후 견적"),
    blist(
      "파일 확인 후 바로 견적 이야기하지 않기. 자료를 바탕으로 질문 or 소통을 통해 라포를 형성한 후 견적.",
      "논문 형식의 표해석뿐 아니라 한 달 A/S와 졸업까지 통계질문도 도와드린다고 언급."
    ),
    quote("의뢰 주시면 논문형식의 표해석뿐 아니라 교수님 피드백 위한 한달 무료 A/S, 졸업까지 통계 이해 위한 질문도 도와드리고 있어요"),
    h3("3. 분석 기한 + 후기 할인 안내"),
    blist(
      "분석 시작 후 일주일 내로 드리고 있으며, 중간에 표 먼저 드리는 것도 가능하다고 언급.",
      "앞에 예약이 찼을 경우 예약 가능 날짜 안내.",
      "마지막으로 정성 후기 가능하면 만 원 할인 언급."
    ),
    h3("4. 결제창 보내기 + '정성' 후기 할인 언급"),
    p("결제창 전송 후 정성 후기 빌드업. 제출 때도 동일하게 후기 언급."),
    h3("5. 결제 후"),
    blist(
      "크몽의 경우 비즈니스로 연결하기.",
      "비즈니스 연결 후 이름 변경."
    ),
    h2("🔄 분석 중 체크리스트"),
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
    ),
    h2("📋 표, 해석, 메모 체크리스트"),
    taskList(
      "8] 표해석 양식은 모논문의 구조를 최대한 참고하기. 모논문 없다면 분석시 메뉴얼의 양식을 참고하기.",
      "9] 챗지피티 복붙한 후 티 안나게 다듬기 (챗지피티 그대로 복붙은 절대 지양!!) — 안 오게 / '~' 누락 안 되게 / 오타나 오류 없는지 확인",
      "11] 통계결과를 임의로 수정하지 않습니다 (분석파일 요구하면 결국 걸림)",
      "13] 메모를 작성할 때는 아카이브에 있는 메모를 임의로 빠트리지 않습니다. (메모를 복붙하고 특정 값들을 해당 표에 맞게 수정해주세요)"
    ),
    h2("📦 결과물 전달 시 체크리스트"),
    taskList(
      "1] 제출 전 검토 하였는가?",
      "2] (크몽) 정성 후기 안내 전달하였는가? — 크몽: 평점 5.0 후기 남겨주시면 한 달 간 A/S 무료로 도와드린다고 언급 / 비즈니스 고객은 후기 상관없이 한 달 무료",
      "3] (크몽) 제출 전 카톡으로 먼저 제출했는가? — 카톡 제출 후 → '선생님, 크몽으로도 제출하겠습니다!'",
      "4] 결과물 제공 후 잔금 받고 AS 진행한다고 전달하였는가?",
      "5] AS 정책 소개서 전달하였는가?",
      "6] 현금영수증 발급 안내하였는가? — '번호 보내주시면 현금영수증 발급도 도와드리겠습니다!'"
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
  monthlyCosts: [],
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
        const mergedPages: Record<string, Page> = supabaseHasPages
          ? { ...pages }
          : { ...pages, ...Object.fromEntries(localOnlyPages.map((p) => [p.id, p])) };

        // 기본 메뉴얼 페이지 복원: Supabase에 없거나 비어있는 경우 seeded content 사용
        const defaultSeeds: Record<string, string> = {
          [MENU_IDS.MANUAL]: makeManualRootContent(),
          [MENU_IDS.MANUAL_ANALYSIS]: makeAnalysisManualContent(),
          [MENU_IDS.MANUAL_PROCESS]: makeProcessManualContent(),
          [MENU_IDS.MANUAL_SPSS]: makeSpssContent(),
          [MENU_IDS.MANUAL_AMOS]: makeAmosContent(),
          [MENU_IDS.MANUAL_POCKET]: makePocketContent(),
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
      version: 8,
      migrate: (persistedState: unknown, version: number) => {
        const s = persistedState as Record<string, unknown>;
        const DEFAULT_TITLES = ["팀 메뉴얼 초안 작성", "업무 프로세스 정리"];

        if (version === 7) {
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
          return { ...s, pages: updatedPages };
        }

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
          // v5 → v8: same as v6 migration
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
