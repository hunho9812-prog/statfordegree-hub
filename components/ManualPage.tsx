"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Pin, Lightbulb, AlertCircle, BookOpen } from "lucide-react";

/* ─────────────────────────────────────────────
   재사용 컴포넌트
───────────────────────────────────────────── */

function Callout({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: "yellow" | "blue" | "red";
  children: React.ReactNode;
}) {
  const colors = {
    yellow: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-900 dark:text-yellow-100",
    blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-100",
    red: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-100",
  };
  return (
    <div className={`flex gap-3 px-4 py-3 rounded-lg border mb-4 ${colors[color]}`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Section({
  title,
  level = 1,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  level?: 1 | 2 | 3;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const sizeClass =
    level === 1
      ? "text-base font-semibold text-[#37352f] dark:text-[#e6e6e4]"
      : level === 2
      ? "text-sm font-semibold text-[#37352f] dark:text-[#e6e6e4]"
      : "text-sm font-medium text-[#555453] dark:text-[#b0aeac]";

  const paddingClass = level === 1 ? "py-2.5" : level === 2 ? "py-2" : "py-1.5";
  const indentClass = level === 2 ? "ml-4" : level === 3 ? "ml-8" : "";

  return (
    <div className={indentClass}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 ${paddingClass} rounded-md hover:bg-[rgba(55,53,47,0.06)] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left group`}
      >
        {open ? (
          <ChevronDown size={14} className="flex-shrink-0 text-[#9b9a97]" />
        ) : (
          <ChevronRight size={14} className="flex-shrink-0 text-[#9b9a97]" />
        )}
        <span className={sizeClass}>{title}</span>
        {badge && (
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-[#37352f]/10 dark:bg-white/10 text-[#37352f] dark:text-[#e6e6e4]">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="mt-1 mb-1">{children}</div>}
    </div>
  );
}

function Bullet({ children, level = 0 }: { children: React.ReactNode; level?: number }) {
  const ml = level === 0 ? "ml-6" : level === 1 ? "ml-12" : "ml-16";
  return (
    <div className={`flex gap-2 ${ml} py-0.5`}>
      <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#9b9a97] dark:bg-[#6b6b6b]" />
      <p className="text-sm text-[#37352f] dark:text-[#e6e6e4] leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-6 my-2 px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{children}</p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-6 my-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
      <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{children}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-[#f1f1ef] dark:bg-[#2f2f2f] text-[#eb5757] dark:text-[#f87171] text-xs font-mono">
      {children}
    </code>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-[#37352f] dark:text-[#e6e6e4] flex items-center gap-2 mt-10 mb-4 pb-2 border-b border-[#e9e9e7] dark:border-[#3f3f3f]">
      {children}
    </h2>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */

export default function ManualPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-16 py-12">
        {/* 페이지 제목 */}
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={36} className="text-[#37352f] dark:text-[#e6e6e4]" />
          <h1 className="text-4xl font-bold text-[#37352f] dark:text-[#e6e6e4]">메뉴얼</h1>
        </div>
        <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mb-8">
          SPSS 파일 정리법 · 분석 과정 · 표해석 양식 종합 가이드
        </p>

        {/* ────────────── 필독 ────────────── */}
        <Callout icon={<Pin size={16} />} color="yellow">
          <strong>필독</strong> — 분석 시작 전 반드시 읽어주세요.
        </Callout>

        {/* ════════════ SECTION 1: SPSS 파일 정리법 ════════════ */}
        <H2>
          <span>📁</span> SPSS 파일 정리법
        </H2>

        <div className="space-y-0.5">
          <Section title="SPSS 파일 정리법 (체크리스트)" defaultOpen={true}>
            <Bullet>맨 왼쪽에 <strong>No 변수</strong> 만들어주기.</Bullet>
            <Bullet>인구통계 범주화 한 변수는 <strong>기존 인구통계 변수 바로 옆</strong>에 붙여주기.</Bullet>
            <Bullet>EFA에서 삭제되는 문항, 역코딩 진행 후 원래 문항 등 분석에 사용하지 않는 문항은 <strong>맨 위로 옮겨놓기</strong> (분석에 안 쓰이는 문항. 삭제 X)</Bullet>
            <Bullet>하위요인 네이밍 한 후 <strong>같은 하위요인끼리 뭉쳐놓기</strong>.</Bullet>
            <Bullet>평균 or 합계 계산할 때 <Code>자기효능감 평균</Code>, <Code>자기효능감합계</Code> 등 <strong>'변수이름+평균'</strong> 형식으로 네이밍하기.</Bullet>
            <Bullet>상위요인은 <Code>전체평균</Code>, <Code>전체합계</Code> 붙이기 (상위요인과 하위요인 구분 위해).</Bullet>
            <Bullet>일반적 특성 각 범주 <strong>라벨링</strong>하기!</Bullet>
          </Section>

          <Section title="분석 시 주의할 점 ⚠️" defaultOpen={true}>
            <Warn>
              범주화 등 변수 수정 과정에서 <strong>원래 변수 삭제하지 않기</strong> — AS 과정에서 원래 변수가 필요한 경우 많음.
            </Warn>
            <Warn>
              데이터 수정 등의 작업 진행 후 <strong>이전 SPSS 파일 삭제하지 않고 히스토리 저장하기</strong> — AS 과정에서 이전 데이터가 필요한 경우 많음.
            </Warn>
            <Bullet>시작 날짜에 고객님께 분석 시작한다고 언급하기.</Bullet>
            <Bullet>분석 시작하기 전 논문 주제, 자료분석방법 읽고 큰 틀 이해하기.</Bullet>
          </Section>
        </div>

        {/* ════════════ SECTION 2: 표해석 양식 ════════════ */}
        <H2>
          <span>📊</span> 모논문 없을 때 표해석 양식
        </H2>

        <div className="space-y-0.5">

          <Section title="소수점 자리수 / 소수점 앞 0 생략 여부" defaultOpen={true}>
            <Bullet>모든 분석에서 <strong>t/F, p</strong>는 <Code>#.000</Code>으로 작성.</Bullet>
            <Bullet>기술통계와 차이검정에서 최소값, 최대값, <strong>M(평균), SD(표준편차)</strong>는 <Code>0.00</Code>으로 작성.</Bullet>
            <Tip>유의확률 <Code>.000</Code>은 반드시 <Code>&lt;.001</Code>로 바꿔줍니다!!</Tip>
          </Section>

          <Section title="표 밑 유의확률 표시 방법">
            <Bullet>표에서 어떤 유의확률 값이 나타났는지에 따라 다르게 작성.</Bullet>
            <Bullet level={1}>예시1 — p&lt;.01과 p&lt;.001만 있는 경우</Bullet>
            <Bullet level={1}>예시2 — p&lt;.05만 있는 경우</Bullet>
            <Bullet level={1}>예시3 — 빈도분석, 기술통계 등 p가 없는 표의 경우</Bullet>
            <Tip>
              표 형식 통일: 세로선은 모두 없애기 · 굵은 선과 (N=)은 필수 아님 · 표와 해석 글씨는 <strong>바탕글</strong>로 통일(AS 할 때 편함).
            </Tip>
          </Section>

          <Section title="빈도분석 표 형식 & 해석" defaultOpen={true}>
            <Bullet>표 형식: <strong>구분 / 빈도(n) / 백분율(%)</strong></Bullet>
            <Section title="해석 형식" level={2}>
              <Bullet level={1}>
                어떤 분석을 진행하였고 표 몇 번에 해당하는지 서술.
              </Bullet>
              <Tip>
                응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 &lt;표 1&gt;과 같이 나타내었다.
              </Tip>
              <Bullet level={1}>
                각 변수마다 <strong>응답이 가장 많은 집단 → 가장 적은 집단 순서</strong>로 빈도와 퍼센트를 서술.
              </Bullet>
              <Tip>
                성별에서는 여성이 127명(62.6%)으로 남성 76명(37.4%)보다 높은 비율을 차지하였다. 연령을 살펴보면, 30대가 68명(33.5%)으로 가장 많았으며, 이어 40대가 59명(29.1%), 20대가 37명(18.2%), 50대가 25명(12.3%), 10대가 14명(6.9%) 순으로 나타났다.
              </Tip>
            </Section>
          </Section>

          <Section title="기술통계분석 표 형식">
            <Bullet>표 형식: <strong>구분 / 최소값 / 최대값 / M / SD</strong></Bullet>
            <Bullet>소수점: M, SD → <Code>0.00</Code> / 최소·최대 → <Code>0.00</Code></Bullet>
          </Section>

          <Section title="신뢰도 표 형식 (해석 별도 작성 X)">
            <Bullet>표 형식: <strong>척도 / 하위요인 / 문항 수 / Cronbach's α</strong></Bullet>
            <Tip>신뢰도가 0.6보다 낮은 경우 → 문항 삭제 or 데이터 수정 (3인톡방에 물어보기)</Tip>
          </Section>

          <Section title="차이검정 표 형식 & 해석" defaultOpen={true}>
            <Bullet>표 형식 열 순서: <strong>N → M → SD → t/F → p → Scheffe</strong></Bullet>
            <Tip>응답자 수가 1인 집단이라 표준편차가 0일 때 → <Code>0.00</Code>으로 써주기</Tip>
            <Section title="사후검정 작성 유의사항" level={2}>
              <Bullet level={1}>ANOVA 결과는 유의한데(p&lt;.05) 사후검정이 나눠지지 않으면 <Code>(n/a)</Code>로 기재.</Bullet>
              <Bullet level={1}>사후검정 알파벳은 첫 집단부터 a, b, c… 로 지정.</Bullet>
              <Bullet level={1}>ANOVA 결과가 유의하지 않으면(p&gt;.05) 사후검정이 나눠지더라도 기재 X.</Bullet>
            </Section>
            <Section title="해석 작성 방식(틀)" level={2}>
              <Bullet level={1}>응답자의 일반적 특성에 따라 어떤 변수의 차이를 알아보는지 서술.</Bullet>
              <Bullet level={1}>유의한 차이가 나타난 인구통계 변수와 차이가 나타나지 않은 변수 각각 모두 (t/F=, p=) 서술.</Bullet>
              <Bullet level={1}>유의한 인구통계 변수만 가장 평균이 높은 집단과 낮은 집단 언급.</Bullet>
              <Bullet level={1}>Scheffe 사후검정 결과 서술.</Bullet>
            </Section>
          </Section>

          <Section title="상관관계 해석 작성 방식(틀)">
            <Bullet>언급 순서: 상위요인 A-B / A-C / A-D / B-C / B-D / C-D 순으로 서술.</Bullet>
            <Bullet><strong>왼쪽 요인은 상위요인만</strong>, <strong>오른쪽 요인은 상위요인+하위요인 모두</strong> 언급.</Bullet>
            <Section title="상위요인 4개 해석 예시" level={2}>
              <Tip>
                먼저, 외상 후 성장은 의도적 반추(r=.599, p&lt;.01)와 유의한 정(+)의 상관관계를 나타냈다. 또한 자기노출(r=.319, p&lt;.01)과 유의한 정(+)의 상관관계를 보였으며, 자기노출의 하위 요인인 자기노출 사건(r=.284, p&lt;.01)과 자기노출 감정(r=.339, p&lt;.01) 모두와 정(+)의 상관관계를 나타냈다.
              </Tip>
            </Section>
            <Section title="상위요인 3개 해석 순서" level={2}>
              <Bullet level={1}>메타인지↔반성적 사고 / 메타인지↔핵심역량 / 반성적 사고↔핵심역량 순서로 서술.</Bullet>
              <Bullet level={1}>서술 시 왼쪽 요인은 상위요인만, 오른쪽 요인은 상위요인+하위요인 모두 언급.</Bullet>
            </Section>
          </Section>

          <Section title="회귀분석 표 형식 & 해석">
            <Bullet>표 형식 필수 열: <strong>B · SE · β · t · p · VIF · R² · 수정된 R² · Durbin-Watson</strong></Bullet>
            <Bullet>더미변수 투입한 경우 <strong>Ref</strong>도 함께 표기.</Bullet>
            <Section title="해석 작성 틀" level={2}>
              <Bullet level={1}>어떤 분석을 실시하였는지 (통제변수 + 독립변수 + 종속변수).</Bullet>
              <Bullet level={1}>VIF 범위(모두 10 미만), Durbin-Watson 값(2에 가까움), 설명력(R²%), F(p) 기재.</Bullet>
              <Tip>
                먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(VIF) 값은 1.256~3.147로 모두 10 미만으로 나타나 변수 간의 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2.202로 2에 가까워 잔차의 자기상관성 문제도 없었다. 회귀모형의 설명력(R²)은 70.7%로 나타났으며, 모형은 통계적으로 유의한 것으로 확인되었다(F=21.664, p&lt;.001).
              </Tip>
              <Bullet level={1}>분석 결과 독립변수의 유의 여부 기재 (β=, t=, p=).</Bullet>
              <Tip>
                회귀분석 결과, 태도요인(β=.351, t=5.203, p&lt;.001), 경험요인(β=.259, t=3.531, p=.001), 인지요인(β=.155, t=2.357, p=.020)이 중대재해 감소에 유의한 정(+)의 영향을 미치는 것으로 나타났다.
              </Tip>
            </Section>
          </Section>
        </div>

        {/* ════════════ SECTION 3: 분석과정 메뉴얼 ════════════ */}
        <H2>
          <span>💡</span> 분석과정 메뉴얼
        </H2>

        <div className="space-y-0.5">

          {/* 1] 엑셀 */}
          <Section title="1] 엑셀 받고 데이터 클리닝" defaultOpen={true}>
            <Warn>이 부분 너무 중요함. 검토 여러 번..!</Warn>
            <Bullet>역문항, 하위문항 확인하기 — 어떤 문항이 역문항인지, 각 척도의 하위문항 구성 확인. 변수계산은 평균/합계 중 어떤 걸로 할지 연구계획서에서 확인 (없으면 물어보기).</Bullet>
            <Bullet>맨 왼쪽에 <Code>No</Code> 추가 — 데이터마다 일련번호 부여하면 AS 시 작업이 용이함. (<Code>-obs</Code>)</Bullet>
            <Bullet>문항 번호 넣기 — <Code>개인특성1</Code>, <Code>개인특성2</Code>… (오른쪽 아래 드래그로 한 번에 가능)</Bullet>
            <Tip>변수계산에서 <Code>sum(직무만족도1 to 직무만족도9)</Code> 처럼 to 구문 사용 가능.</Tip>
            <Bullet>설문지 보면서 한글을 숫자로 변경 (자동화 프로그램 사용).</Bullet>
            <Bullet>역코딩 후 변수계산 (자동화툴 사용).</Bullet>
            <Bullet>복수 응답 코딩 방법 — countif 함수 이용.</Bullet>
          </Section>

          {/* 2] SPSS 연동 */}
          <Section title="2] SPSS 연동 후 데이터 클리닝" defaultOpen={true}>
            <Section title="① 빈도분석으로 결측치 확인" level={2}>
              <Bullet level={1}>인구통계변수(성별, 연령대) 결측치 있는 경우 고객님께 문의.</Bullet>
              <Bullet level={2}><strong>방법1</strong>: 가장 많이 응답한 숫자로 채우기 (권장).</Bullet>
              <Bullet level={2}><strong>방법2</strong>: 결측치 있는 응답자 삭제 (방법1보다 비권장).</Bullet>
              <Bullet level={1}>척도(ex. 직무만족도1) 결측치는 SPSS가 자동 제외 후 평균 계산 → 넘어가면 됨.</Bullet>
              <Bullet level={1}>척도 오타 확인 — 전체 빈도분석 후 <Code>44</Code>, <Code>55</Code> 등 오타 여부 체크 → 4, 5로 수정.</Bullet>
            </Section>
            <Section title="② 기술통계로 이상치 확인" level={2}>
              <Bullet level={1}>최소값·최대값 확인 후 이상치 여부 점검 (오타로 인한 44, 55 등). 어떻게 처리할지 고객에게 물어봄.</Bullet>
            </Section>
            <Section title="③ 역코딩 하기 (엑셀에서 했으면 Skip)" level={2}>
              <Tip>반드시 '다른 변수로 코딩 변경' 이용!</Tip>
            </Section>
            <Section title="④ 신뢰도 분석" level={2}>
              <Bullet level={1}>신뢰도가 0.6보다 낮은 경우 → 문항 삭제 or 데이터 수정 (3인톡방에 물어보기).</Bullet>
            </Section>
            <Section title="⑤ 변수계산 하기 (엑셀에서 했으면 Skip)" level={2}>
              <Bullet level={1}>SPSS로 변수 평균 구하기: 변환 → 변수계산 → MEAN() 또는 SUM() 함수 사용.</Bullet>
            </Section>
            <Section title="⑥ 정규성 검정 (선택사항)" level={2}>
              <Bullet level={1}>해야 하는 경우: 연구계획서에 비모수 검정이 있거나 정규성 검정을 시행한다고 적혀있는 경우, 표본 개수가 30 미만인 경우.</Bullet>
              <Tip>애매하면 3인톡방에 질문하기. SPSS로 Kruskal-Wallis 돌려보기.</Tip>
            </Section>
          </Section>

          {/* 3] 통계분석 SPSS */}
          <Section title="3] 통계분석 (SPSS)">
            <Section title="탐색적 요인분석 (EFA)" level={2}>
              <Warn>이쁘게 안 묶이면 3인톡방에 말해주기. 고객님께 얘기하고 문항 하나씩 삭제해야 함.</Warn>
              <Bullet level={1}>도저히 EFA가 안 묶일 경우:</Bullet>
              <Bullet level={2}>척도를 그대로 가져왔을 때 수정하지 않은 경우 EFA 생략 가능함을 말씀드리기.</Bullet>
              <Bullet level={2}>구조방정식 논문 진행하면 EFA 대신 CFA로 바로 넘어가기.</Bullet>
              <Bullet level={2}>꼭 EFA를 해야 한다면 하위요인을 삭제하고 진행.</Bullet>
            </Section>
            <Section title="교차검정" level={2}>
              <Bullet level={1}>분석 → 기술통계량 → 교차분석으로 진행.</Bullet>
            </Section>
            <Section title="빈도분석" level={2}>
              <Bullet level={1}>분석 → 기술통계량 → 빈도분석.</Bullet>
              <Bullet level={1}>해석: 가장 많은 집단 → 가장 적은 집단 순서로 빈도와 퍼센트 서술.</Bullet>
            </Section>
            <Section title="복수응답 빈도분석" level={2}>
              <Bullet level={1}>분석 → 다중반응 → 다중반응 세트 정의 → 빈도분석.</Bullet>
            </Section>
            <Section title="기술통계분석" level={2}>
              <Bullet level={1}>분석 → 기술통계량 → 기술통계로 진행.</Bullet>
            </Section>
            <Section title="상관관계분석" level={2}>
              <Bullet level={1}>분석 → 상관분석 → 이변량 상관계수.</Bullet>
              <Bullet level={1}>Pearson 상관계수, 양측검정으로 진행.</Bullet>
            </Section>
            <Section title="차이검정" level={2}>
              <Bullet level={1}><strong>독립표본 t검정</strong>: 분석 → 평균비교 → 독립표본 T검정.</Bullet>
              <Bullet level={1}><strong>일원분산분석(ANOVA)</strong>: 분석 → 평균비교 → 일원배치분산분석 → 사후검정(Scheffe).</Bullet>
            </Section>
            <Section title="다중회귀분석" level={2}>
              <Bullet level={1}>분석 → 회귀분석 → 선형. 더미변수 사전 생성 필요.</Bullet>
              <Bullet level={1}>표: B, SE, β, t, p, VIF, R², 수정된 R², Durbin-Watson 기재.</Bullet>
            </Section>
            <Section title="Baron&Kenny 매개/조절효과 (위계적 회귀분석)" level={2}>
              <Bullet level={1}>매개효과: 3단계 위계적 회귀분석으로 검증.</Bullet>
              <Bullet level={1}>조절효과: 상호작용항 생성 후 3단계 위계적 회귀분석으로 검증.</Bullet>
            </Section>
            <Section title="프로세스 매크로 (1, 4, 5, 6번)" level={2}>
              <Bullet level={1}><strong>4번</strong>: 매개효과 검증.</Bullet>
              <Bullet level={1}><strong>1번</strong>: 조절효과 검증 (위계적 회귀분석 방식).</Bullet>
              <Bullet level={1}><strong>6번</strong>: 이중매개효과 검증.</Bullet>
              <Bullet level={1}><strong>5번</strong>: 조절된 직접효과.</Bullet>
              <Section title="프로세스 매크로 1번 해석 틀" level={3}>
                <Bullet level={2}>어떤 가설을 검증하는지, 각 단계는 어떤 영향을 검증하는지 기재.</Bullet>
                <Bullet level={2}>각 단계의 F와 p값, 설명력 기재.</Bullet>
                <Tip>먼저 회귀모형은 1단계(F=51.714, p&lt;.001), 2단계(F=26.047, p&lt;.001), 3단계(F=17.537, p&lt;.001)에서 모두 통계적으로 유의하게 나타났다.</Tip>
                <Bullet level={2}>각 단계의 회귀계수 유의성 기재.</Bullet>
                <Bullet level={2}>최종 결과(조절효과 유의 여부) 기재.</Bullet>
              </Section>
            </Section>
          </Section>

          {/* 4] AMOS */}
          <Section title="4] 통계분석 (AMOS)">
            <Section title="확인적 요인분석 (CFA)" level={2} defaultOpen={true}>
              <Section title="표 채우는 방법" level={3}>
                <Bullet level={2}>표준화 요인적재량(β), C.R., p, AVE, CR(개념신뢰도) 기재.</Bullet>
                <Bullet level={2}>AVE&CR 계산: 스탯지니(stat-genie.com) 활용.</Bullet>
              </Section>
              <Section title="모형적합도 기재" level={3}>
                <Bullet level={2}>χ², df, p, CFI, TLI, RMSEA 등 모논문 형식에 따라 기재.</Bullet>
                <Tip>χ² 통계량의 p=0.000으로 적합도 기준에 미치지 못하나, 샘플 크기가 증가할수록 χ² 값도 증가하므로 다른 적합지수와 함께 고려해야 한다(배병렬, 2014).</Tip>
              </Section>
              <Section title="집중타당성 기준" level={3}>
                <Bullet level={2}>요인적재량 0.4 이상 (0.5 이상이면 중요 변수).</Bullet>
                <Bullet level={2}>개념신뢰도(CR) 0.7 이상.</Bullet>
                <Bullet level={2}>AVE 0.5 이상.</Bullet>
              </Section>
              <Section title="AVE가 0.5보다 낮을 때 대처" level={3}>
                <Bullet level={2}>1. 문항 삭제를 통해 AVE 올려보기.</Bullet>
                <Bullet level={2}>2. 도저히 안 올라가면 개념신뢰도가 0.6 이상이면 타당도 적절 가능 (Fornell &amp; Larcker, 1981) 문구 기재.</Bullet>
              </Section>
              <Section title="오류 대응: 'sample moment matrix is not positive definite'" level={3}>
                <Warn>상관행렬 계산 불가 상태. 원인: ① 문항 하나의 분산이 0 ② 특정 변수가 다른 변수와 완전히 동일하거나 반대.</Warn>
              </Section>
            </Section>

            <Section title="판별타당성" level={2}>
              <Bullet level={1}>상관관계 채우기 + AVE 제곱근 계산 후 비교.</Bullet>
              <Bullet level={1}><strong>AVE 제곱근 &gt; 상관계수</strong>이면 판별타당성 충족.</Bullet>
              <Section title="판별타당성 미충족 시 대처" level={3}>
                <Bullet level={2}>신뢰구간 방법 적용: 상관계수 ± 2×표준오차 → 1을 포함하지 않으면 판별타당성 확보.</Bullet>
                <Tip>
                  판별타당성 검증은 ①AVE&gt;상관계수², ②(상관계수±2×표준오차)가 1 미포함, ③χ² 차이분석(유의적) 중 하나를 충족하면 판별타당성 있음으로 판단(Anderson &amp; Gerbing, 1988).
                </Tip>
              </Section>
            </Section>

            <Section title="구조방정식 (SEM)" level={2}>
              <Bullet level={1}>표: 경로계수(B, β, C.R., p) + 모형적합도.</Bullet>
              <Bullet level={1}>CFA와 구조방정식 모형적합도 동일한 논문 참고 가능.</Bullet>
            </Section>

            <Section title="AMOS 매개효과" level={2}>
              <Bullet level={1}>부트스트래핑(Bootstrapping)으로 간접효과 유의성 검증.</Bullet>
              <Bullet level={1}>이중매개 시 팬텀변수 활용.</Bullet>
            </Section>

            <Section title="AMOS 조절효과 (다중집단비교분석)" level={2}>
              <Bullet level={1}>형태동일성 → 측정동일성 → 구조동일성 순서로 검증.</Bullet>
              <Bullet level={1}>χ² 차이검정으로 집단 간 차이 확인.</Bullet>
            </Section>
          </Section>

          {/* 5] 메모 */}
          <Section title="5] 메모 (도움말 남기기)">
            <Bullet>해석 아카이브 형식과 동일하게, 고객님의 예시(빨간색 표시) 수정해주기.</Bullet>
            <Tip>
              해석 작성 챗GPT: ChatGPT → 통계분석 해석 작성 도우미 (g-KBJrZ74Ld)
            </Tip>
          </Section>
        </div>

        {/* ════════════ SECTION 4: 통계주머니 ════════════ */}
        <H2>
          <span>🗨️</span> 통계주머니
        </H2>

        <div className="space-y-0.5">

          <Section title="연구모형 제작 PPT">
            <Bullet>연구모형 예시.pptx 파일 참고.</Bullet>
          </Section>

          <Section title="한글표 제작 꿀팁" defaultOpen={true}>
            <Section title="단축키" level={2}>
              <Bullet level={1}><Code>Alt + Shift + Enter</Code> — 드래그 후 윗첨자 변경.</Bullet>
              <Bullet level={1}><Code>Ctrl + Enter</Code> — 표 열 추가.</Bullet>
              <Bullet level={1}><Code>Ctrl + Backspace</Code> — 표 열 제거.</Bullet>
            </Section>
            <Section title="상용구 사용법" level={2}>
              <Bullet level={1}>입력 → 입력 도우미 → 상용구 → 상용구 내용.</Bullet>
              <Bullet level={1}>사용: 준말 입력 후 <Code>Alt + i</Code></Bullet>
              <Bullet level={1}>예시 — <Code>d</Code>: R²=, Adj.R²=, F=, p&lt;.001, Durbin-Watson=</Bullet>
              <Bullet level={1}>예시 — <Code>k</Code>: Kaiser-Meyer-Olkin Measure of Sampling Adequacy</Bullet>
            </Section>
            <Section title="표 폭 줄이기 (표 다이어트)" level={2}>
              <Bullet level={1}>naver.com/lavieenrose77/221967385573 블로그 포스팅 참고.</Bullet>
            </Section>
          </Section>

          <Section title="Graph (조절효과 그래프)">
            <Bullet>조절효과그래프.xlsx 파일 이용.</Bullet>
            <Bullet level={1}>1단계: 그래프 만들기 — 블로그 참고 (statstorm / kimpubli1214 블로그).</Bullet>
            <Bullet level={1}>2단계: 논문 형식으로 가공하기.</Bullet>
          </Section>

          <Section title="IPA와 Borich 요구도">
            <Section title="IPA 분석" level={2}>
              <Bullet level={1}>IPA 분석에 대해 요약한 블로그 참고.</Bullet>
              <Bullet level={1}>IPA 산출.xlsx / IPA 분석 예시.hwp 파일로 진행.</Bullet>
            </Section>
            <Section title="Borich 요구도" level={2}>
              <Bullet level={1}>Borich 요구도 분석방법 영상 참고.</Bullet>
              <Bullet level={1}>borich 요구도 산출.xlsx / Borich 요구도 예시.hwp 파일로 진행.</Bullet>
            </Section>
          </Section>

          <Section title="분석 표 양식 주머니">
            <Bullet>각 분석에 대한 표 양식 모음. 모논문과 해당 모음집을 참고하여 제작.</Bullet>
            <Bullet level={1}><strong>SPSS</strong>: SPSS.zip 파일</Bullet>
            <Bullet level={1}><strong>AMOS</strong>: AMOS.zip 파일</Bullet>
          </Section>

          <Section title="APA 형식">
            <Bullet>사회과학, 교육, 심리학 등 학문 분야에서 널리 쓰이는 표준 논문 작성 및 인용 스타일.</Bullet>
            <Bullet>간혹 APA 형식으로 작성을 부탁하시는 고객님이 계심. APA 형식 내용 참고하여 작성.</Bullet>
          </Section>

          <Section title="MANOVA">
            <Tip>다변량 분산분석. 종속변수가 2개 이상일 때 사용.</Tip>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#e9e9e7] dark:border-[#3f3f3f]">
          <p className="text-xs text-[#c4c3bf] dark:text-[#4f4f4f] text-center">
            Statfordegree Hub · 분석 메뉴얼 · 최종 업데이트 2026년 3월
          </p>
        </div>
      </div>
    </div>
  );
}
