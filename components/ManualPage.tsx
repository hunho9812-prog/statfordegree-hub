"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Pin,
  AlertCircle,
  BookOpen,
  MessageSquare,
  CheckSquare,
} from "lucide-react";

/* ─────────────────────────────────────────────
   재사용 컴포넌트
───────────────────────────────────────────── */

function Callout({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: "yellow" | "blue" | "red" | "green";
  children: React.ReactNode;
}) {
  const colors = {
    yellow:
      "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-900 dark:text-yellow-100",
    blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-100",
    red: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-100",
    green:
      "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40 text-green-900 dark:text-green-100",
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
  children?: React.ReactNode;
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

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-6 my-2 px-4 py-3 rounded-md bg-green-50 dark:bg-green-950/20 border-l-4 border-green-400 dark:border-green-600">
      <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed italic">{children}</p>
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

function CheckItem({ children, level = 0 }: { children: React.ReactNode; level?: number }) {
  const ml = level === 0 ? "ml-6" : "ml-12";
  return (
    <div className={`flex gap-2 ${ml} py-0.5`}>
      <span className="flex-shrink-0 mt-0.5 text-[#9b9a97] dark:text-[#6b6b6b]">☐</span>
      <p className="text-sm text-[#37352f] dark:text-[#e6e6e4] leading-relaxed">{children}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   탭별 콘텐츠
───────────────────────────────────────────── */

function ImgSlot() {
  return (
    <div className="ml-6 my-2 h-8 rounded border border-dashed border-[#d3d2cf] dark:border-[#4a4a4a] flex items-center px-3">
      <span className="text-xs text-[#c4c3bf] dark:text-[#5a5a5a]">[ 이미지 ]</span>
    </div>
  );
}

function FileSlot({ name }: { name: string }) {
  return (
    <div className="ml-6 my-1 flex items-center gap-2 px-3 py-1.5 rounded bg-[#f7f7f5] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f]">
      <span className="text-xs">📄</span>
      <span className="text-xs text-[#9b9a97] dark:text-[#6b6b6b]">{name}</span>
    </div>
  );
}

function VideoSlot({ name }: { name: string }) {
  return (
    <div className="ml-6 my-1 flex items-center gap-2 px-3 py-1.5 rounded bg-[#f7f7f5] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f]">
      <span className="text-xs">🎬</span>
      <span className="text-xs text-[#9b9a97] dark:text-[#6b6b6b]">{name}</span>
    </div>
  );
}

function LinkSlot({ url, label }: { url: string; label?: string }) {
  return (
    <div className="ml-6 my-1 flex items-center gap-2 px-3 py-1.5 rounded bg-[#f7f7f5] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f]">
      <span className="text-xs">🔗</span>
      <span className="text-xs text-[#9b9a97] dark:text-[#6b6b6b] break-all">{label ?? url}</span>
    </div>
  );
}

function AnalysisManual() {
  return (
    <>
      <Callout icon={<Pin size={16} />} color="yellow">
        <strong>📌 필독</strong>
      </Callout>

      {/* ════ SPSS 파일 정리법 ════ */}
      <H2><span>📁</span> SPSS 파일 정리법</H2>
      <div className="space-y-0.5">
        <Section title="SPSS 파일 정리법" defaultOpen>
          <Bullet>맨 왼쪽에 <strong>No 변수</strong> 만들어주기.<ImgSlot /></Bullet>
          <Bullet>인구통계 범주화 한 변수는 <strong>기존 인구통계 변수 바로 옆</strong>에 붙여주기.<ImgSlot /></Bullet>
          <Bullet>EFA에서 삭제되는 문항, 역코딩 진행 후 원래 문항 등 분석에 사용하지 않는 문항은 <strong>맨 위로 옮겨놓기</strong> (분석에 안 쓰이는 문항. 삭제 X)<ImgSlot /></Bullet>
          <Bullet>하위요인 네이밍 한 후 <strong>같은 하위요인끼리 뭉쳐놓기</strong>.<ImgSlot /></Bullet>
          <Bullet>평균 or 합계 계산할 때 <Code>자기효능감 평균</Code>, <Code>자기효능감합계</Code> 등 <strong>&#39;변수이름+평균&#39;</strong> 형식으로 네이밍하기.<ImgSlot /></Bullet>
          <Bullet>상위요인은 <Code>전체평균</Code>, <Code>전체합계</Code> 붙이기 (상위요인과 하위요인 구분 위해)<ImgSlot /></Bullet>
          <Bullet>일반적 특성 각 범주 <strong>라벨링</strong>하기!<ImgSlot /></Bullet>
        </Section>

        <Section title="분석 시 주의할 점!! ⚠️" defaultOpen>
          <Bullet>범주화 등 변수 수정 과정에서 <strong>원래 변수 삭제하지 않기</strong>
            <Warn>AS 과정에서 원래 변수가 필요한 경우 많음</Warn>
          </Bullet>
          <Bullet>(데이터 수정 등의 작업 진행 후) <strong>이전 SPSS 파일 삭제하지 않고 히스토리 저장하기</strong>
            <Warn>AS 과정에서 이전 데이터가 필요한 경우 많음</Warn>
            <ImgSlot />
          </Bullet>
          <Bullet>시작 날짜에 고객님께 분석 시작한다고 언급하기<ImgSlot /></Bullet>
          <Bullet>분석 시작하기 전 논문 주제, 자료분석방법 읽고 큰 틀 이해하기</Bullet>
        </Section>
      </div>

      {/* ════ 모논문 없을 때 표해석 양식 ════ */}
      <H2><span>📊</span> 모논문 없을 때 표해석 양식</H2>
      <div className="space-y-0.5">

        <Section title="소수점 자리수 / 소수점 앞 0 생략 여부" defaultOpen>
          <Bullet>모든 분석에서 <strong>t/F, p</strong>는 <Code>#.000</Code>으로 작성해줍니다.<ImgSlot /></Bullet>
          <Bullet>기술통계와 차이검정에서 최소값, 최대값, <strong>M(평균), SD(표준편차)</strong>의 경우 <Code>0.00</Code>으로 작성해줍니다.
            <Section title="차이검정 (예시)" level={2}><ImgSlot /></Section>
            <Section title="기술통계 (예시)" level={2}><ImgSlot /></Section>
          </Bullet>
          <Bullet>유의확률 <Code>.000</Code>은 <Code>&lt;.001</Code>로 바꿔줍니다!!<ImgSlot /></Bullet>
        </Section>

        <Section title="표 밑 유의확률">
          <Bullet>표 밑의 유의확률 표시는 <strong>해당 표에서 어떤 유의확률 값이 나타났는지에 따라 다르게 써야합니다.</strong></Bullet>
          <Section title="예시1 — p&lt;.01과 p&lt;.001만 있는 경우" level={2}><ImgSlot /></Section>
          <Section title="예시2 — p&lt;.05만 있는 경우" level={2}><ImgSlot /></Section>
          <Section title="예시3 — 빈도분석, 기술통계 등 p가 없는 표의 경우" level={2}><ImgSlot /></Section>
          <Section title="전체적인 표 형식 통일하기" level={2}>
            <Bullet level={1}>표의 세로선은 모두 없애줍니다.<ImgSlot /></Bullet>
            <Bullet level={1}>굵은 선과 (N=)은 굳이 추가하지 않아도 괜찮습니다 (AS 과정에서 통일하기 비효율적)
              <Section title="(N=) 예시" level={3}><ImgSlot /></Section>
              <Section title="굵은 선 예시" level={3}><ImgSlot /></Section>
            </Bullet>
            <Bullet level={1}><strong>표와 해석 글씨는 바탕글로 통일해줍니다(AS 할 때 편함)</strong></Bullet>
          </Section>
        </Section>

        <Section title="빈도분석 표 형식" defaultOpen>
          <Section title="OT 영상" level={2}>
            <VideoSlot name="빈도분석OT완성.mp4" />
          </Section>
          <Section title="표 형식" level={2}><ImgSlot /></Section>
          <Section title="해석 형식" level={2}>
            <Bullet level={1}><strong>1. 어떤 분석을 진행하였고 표 몇 번에 해당하는지 서술</strong></Bullet>
            <Tip>응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 &lt;표 1&gt;과 같이 나타내었다.</Tip>
            <Bullet level={1}><strong>2. 각 변수마다 응답이 가장 많은 집단부터 가장 적은 집단 순서대로 빈도와 퍼센트를 서술해줍니다</strong> (ex. 표에서 연령의 경우 30대에서 10대 순서대로)</Bullet>
            <Tip>성별에서는 여성이 127명(62.6%)으로 남성 76명(37.4%)보다 높은 비율을 차지하였다. 연령을 살펴보면, 30대가 68명(33.5%)으로 가장 많았으며, 이어 40대가 59명(29.1%), 20대가 37명(18.2%), 50대가 25명(12.3%), 10대가 14명(6.9%) 순으로 나타났다. 최종 학력은 대학 졸업자가 122명(60.1%)으로 가장 많았으며, 석사 졸업자가 73명(36.0%), 박사 수료 이상이 8명(3.9%)으로 확인되었다. 학교 유형의 경우, 법인시설에 속하는 대상자가 116명(57.1%)으로 개인시설 소속 87명(42.9%)보다 높은 비율을 차지하였다. 마지막으로 지역의 경우, 대전이 71명(35.0%)으로 가장 많았으며, 서울과 강원이 각각 66명(32.5%)으로 동일한 비율을 보였다.</Tip>
          </Section>
        </Section>

        <Section title="기술통계분석 표 형식">
          <Section title="기술통계분석 OT (영상)" level={2}>
            <VideoSlot name="기술통계OT.mp4" />
          </Section>
          <Section title="표 예시" level={2}><ImgSlot /></Section>
        </Section>

        <Section title="신뢰도 표 형식 (신뢰도는 해석 따로 작성 X)">
          <ImgSlot />
        </Section>

        <Section title="차이검정 표 형식과 해석 작성 방식(틀)" defaultOpen>
          <Section title="차이검정 OT (영상)" level={2}>
            <Bullet level={1}>1. SPSS 분석과 표 만들기<VideoSlot name="차이검정OT(1).mp4" /></Bullet>
            <Bullet level={1}>2. 사후검정 기재하는 방법<VideoSlot name="차이검정OT(2)_사후검정기재하기.mp4" /></Bullet>
            <Bullet level={1}>3. 해석 작성하는 방법<VideoSlot name="차이검정OT(3)_해석작성하기.mp4" /></Bullet>
          </Section>
          <Section title="차이검정 표 형식 (N, M, SD, t/F, p, Scheffe 순으로)" level={2}><ImgSlot /></Section>
          <Section title="응답자 수가 1인 집단이라 표준편차가 0일 때 → 0.00으로 써주기" level={2}><ImgSlot /></Section>
          <Section title="⚠️ 사후검정 작성할 때 유의사항" level={2}>
            <Bullet level={1}>ANOVA 결과는 유의한데(p가 0.05보다 작은데) 사후검정이 나눠지지 않으면 <Code>(n/a)</Code>로 기재.<ImgSlot /></Bullet>
            <Bullet level={1}>사후검정 알파벳은 첫 집단부터 a, b, c…로 지정<ImgSlot /></Bullet>
            <Bullet level={1}>ANOVA 결과는 유의하지 않으면(p가 0.05보다 큰데) 사후검정이 나눠지더라도 기재 X.</Bullet>
          </Section>
          <Section title="해석 작성 방식(틀)" level={2}>
            <Bullet level={1}>응답자의 일반적 특성에 따라 어떤 변수의 차이를 알아보는지 서술<ImgSlot /><ImgSlot /></Bullet>
            <Bullet level={1}>유의한 차이가 나타난 인구통계 변수와 차이가 나타나지 않은 인구통계 변수 <strong>각각 모두</strong> (t/F=, p=) 서술하기.<ImgSlot /></Bullet>
            <Bullet level={1}><strong>유의한 인구통계 변수만</strong> 각각 가장 평균이 높은 집단과 낮은 집단 언급<ImgSlot /></Bullet>
            <Bullet level={1}>Scheffe 사후검정 결과 서술<ImgSlot /></Bullet>
          </Section>
        </Section>

        <Section title="상관관계 해석 작성 방식(틀)">
          <Section title="상관관계 OT 영상" level={2}>
            <Bullet level={1}>1. 분석 &amp; 표 만들기<VideoSlot name="상관관계1_분석과표만들기.mp4" /></Bullet>
            <Bullet level={1}>2. 해석 작성하기<VideoSlot name="상관관계2_해석.mp4" /></Bullet>
          </Section>
          <Section title="상위요인 변수가 4개일 때 해석" level={2}>
            <Bullet level={1}>표 예시 (상위요인: 외상후성장, 의도적반추, 자기노출, 사회적지지)<ImgSlot /></Bullet>
            <Bullet level={1}><strong>언급 순서:</strong> 외상후성장과 의도적반추 / 외상후성장과 자기노출 / 외상후성장과 사회적지지 / 의도적반추와 자기노출 / 의도적반추와 사회적지지 / 자기노출과 사회적지지 순으로 서술.</Bullet>
            <Bullet level={1}><strong>해석 전문</strong> (왼쪽 요인은 상위요인만, 오른쪽 요인은 상위요인과 하위요인 모두 언급)</Bullet>
            <Tip>대상자의 외상 후 성장, 새로운 가능성 발견, 자기지각의 변화, 영적 종교적 관심의 증가, 대인관계 깊이 증가, 의도적 반추, 자기노출, 사회적 지지, 주요 타인 지지, 가족 지지, 친구 지지의 상관관계는 &lt;표 13&gt;과 같다.<br /><br />— 어떤 분석을 진행하는지<br /><br />먼저, 외상 후 성장은 의도적 반추(r=.599, p&lt;.01)와 유의한 정(+)의 상관관계를 나타냈다. 또한 자기노출(r=.319, p&lt;.01)과 유의한 정(+)의 상관관계를 보였으며, 자기노출의 하위 요인인 자기노출 사건(r=.284, p&lt;.01)과 자기노출 감정(r=.339, p&lt;.01) 모두와 정(+)의 상관관계를 나타냈다. 아울러 사회적 지지(r=.391, p&lt;.01)와 유의한 정(+)의 상관관계를 보였으며, 사회적 지지의 하위 요인인 주요 타인 지지(r=.353, p&lt;.01), 가족 지지(r=.254, p&lt;.01), 친구 지지(r=.399, p&lt;.01)와도 유의한 정(+)의 상관관계를 보였다.<br /><br />— 외상 후 성장과 의도적 반추 / 외상 후 성장과 자기 노출 / 외상 후 성장과 사회적 지지<br /><br />의도적 반추는 자기노출(r=.240, p&lt;.01)과 유의한 정(+)의 상관관계를 나타냈으며, 자기노출의 하위 요인인 자기노출 사건(r=.227, p&lt;.01), 자기노출 감정(r=.244, p&lt;.01)과도 정(+)의 상관관계를 보였다. 또한 사회적 지지(r=.276, p&lt;.01)와 유의한 정(+)의 상관관계를 보였으며, 그 하위 요인인 주요 타인 지지(r=.270, p&lt;.01), 가족 지지(r=.166, p&lt;.05), 친구 지지(r=.277, p&lt;.01) 모두와 유의한 정(+)의 상관관계를 나타냈다.<br /><br />— 의도적 반추와 자기노출 / 의도적 반추와 사회적 지지<br /><br />마지막으로, 자기노출은 사회적 지지(r=.277, p&lt;.01)와 유의한 정(+)의 상관관계를 보였으며, 사회적 지지의 하위 요인 중 주요 타인 지지(r=.247, p&lt;.01), 친구 지지(r=.349, p&lt;.01)와도 유의한 정(+)의 상관관계를 나타냈다.<br /><br />— 자기노출과 사회적 지지<br /><br />이를 통해, 본 연구에서는 외상 후 성장, 의도적 반추, 자기노출, 사회적 지지 간에 유의미한 정(+)의 상관관계가 확인되었으며, 특히 사회적 지지가 외상 후 성장 및 관련 요인들과 밀접한 관계를 맺고 있음을 확인할 수 있었다.<br /><br />— 결론</Tip>
          </Section>
          <Section title="상위요인 변수가 3개일 때 해석" level={2}>
            <Bullet level={1}>만약 척도가 메타인지, 반성적 사고, 핵심역량 3개일 때</Bullet>
            <Bullet level={1}><strong>메타인지와 반성적 사고 / 메타인지와 핵심역량 / 반성적 사고와 핵심역량 순서대로 서술해준다.</strong></Bullet>
            <Bullet level={1}>서술할 때는 <strong>왼쪽 요인은 상위요인만, 오른쪽 요인은 상위요인과 하위요인 모두 언급해준다.</strong><br />(ex. 메타인지와 반성적 사고의 상관관계를 언급할 때는 메타인지는 전체만, 반성적 사고는 반성적 사고 전체와 반성적 사고의 하위요인인 일상, 교수, 학습 모두 언급해준다)</Bullet>
            <Section title="예시" level={3}><ImgSlot /></Section>
          </Section>
        </Section>

        <Section title="회귀분석 표 형식과 해석 작성 방식(틀)">
          <Bullet>표 형식 → B, SE, β, t, p, VIF, R², 수정된 R², Durbin-Watson 모두 표기 <strong>(더미변수 투입한 경우 Ref도 표기)</strong><ImgSlot /></Bullet>
          <Section title="해석 작성 틀" level={2}>
            <Tip>차이검정에서 중대재해 감소와 유의한 차이를 보인 연령, 학력, 업종, 직무를 통제변수로 투입한 후 중대재해처벌법 인식이 중대재해 감소에 미치는 영향을 알아보기 위해 다중회귀분석을 실시하였고 결과는 &lt;표 &gt;와 같다.<br /><br />— 어떤 분석 실시하였는지<br /><br />먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(Variance Inflation Factor, VIF) 값은 1.256~3.147로 모두 10 미만으로 나타나 변수 간의 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2.202로 2에 가까워 잔차의 자기상관성 문제도 없었다. 회귀모형의 설명력(R²)은 70.7%로 나타났으며, 모형은 통계적으로 유의한 것으로 확인되었다(F=21.664, p&lt;.001).<br /><br />— VIF, Durbin-Watson, 설명력, F(p) 기재<br /><br />회귀분석 결과, 중대재해처벌법 인식과 관련된 주요 요인 중 태도요인(β=.351, t=5.203, p&lt;.001), 경험요인(β=.259, t=3.531, p=.001), 인지요인(β=.155, t=2.357, p=.020)이 중대재해 감소에 유의한 정(+)의 영향을 미치는 것으로 나타났다. 이는 중대재해처벌법에 대한 인식이 높을수록 중대재해 감소에 긍정적인 영향을 미친다는 것을 의미한다.<br /><br />— 분석 결과 독립변수의 유의여부 기재</Tip>
          </Section>
        </Section>

      </div>

      {/* ════ 분석과정 메뉴얼 ════ */}
      <Callout icon={<Pin size={16} />} color="blue">
        <strong>💡 분석과정 메뉴얼</strong>
      </Callout>

      <div className="space-y-0.5">

        <Section title="1] 엑셀 받고 데이터 클리닝 (이 부분 너무 중요함. 검토 여러 번..!)" defaultOpen>
          <Section title="1] 역문항, 하위문항 확인하기" level={2}>
            <Bullet level={1}>어떤 문항이 역문항에 해당되는지, 각 척도는 어떤 하위문항으로 구성되어 있는지, 하위문항은 각각 몇 번에 해당하는지</Bullet>
            <Bullet level={1}>변수계산은 평균이랑 합계 중 어떤 걸로 할지 확인하기 (연구계획서 척도 설명 부분에 나와있음. 없으면 물어보기)</Bullet>
          </Section>
          <Section title="2] 맨 왼쪽에 No 추가 (데이터마다 일련번호 부여하면 AS 시 작업이 용이함) — -obs" level={2}>
            <ImgSlot />
          </Section>
          <Section title="3] 문항 번호 넣기 (열번호)" level={2}>
            <Bullet level={1}>개인특성1, 개인특성2 …… (오른쪽 아래 드래그로 한 번에 가능)</Bullet>
            <Tip>위와 같이 번호만 바뀌는 문항명은 변수 계산 할 때 유리하다.<br />ex) &quot;변수계산&quot;에서 <Code>sum(직무만족도1 to 직무만족도9)</Code> — 직무만족도1부터 직무만족도9까지 모두 더하는 함수</Tip>
            <ImgSlot />
          </Section>
          <Section title="4] 설문지 보면서 한글을 숫자로 변경 (자동화 프로그램 사용 영상)" level={2} />
          <Section title="5] 역코딩 후 변수계산 (자동화툴 사용 영상)" level={2} />
          <Section title="추가] 복수 응답 코딩 방법 (countif 함수 이용)" level={2} />
        </Section>

        <Section title="2] SPSS 연동 후 데이터 클리닝" defaultOpen>
          <Section title="1) 빈도분석으로 결측치 확인" level={2}>
            <Bullet level={1}>인구통계변수(성별, 연령대)에 결측치가 있는 경우 <strong>물어보기</strong></Bullet>
            <Bullet level={2}><strong>방법1</strong>: 가장 많이 응답한 숫자 넣기 (여성이 남성보다 많은 경우 결측치를 모두 여성으로 채움)</Bullet>
            <Bullet level={2}><strong>방법2</strong>: 결측치가 있는 응답자 삭제 (방법1보다 추천하지는 않음)</Bullet>
            <Bullet level={2}>고객님에게 방법1과 방법2 중 방법1이 나은 것 같은데 어떠신지 물어보기.</Bullet>
            <Bullet level={1}>척도(ex. 직무만족도1)에 결측치가 있는 경우 그냥 넘어가면 됨. SPSS가 알아서 제외 후 평균내줌.</Bullet>
            <Bullet level={1}>척도(ex. 직무만족도1) 오타 확인 — 문항 전체 빈도분석 돌려서 값 확인. 가끔 44, 55 등 오타 있음 → 4, 5로 수정</Bullet>
          </Section>
          <Section title="2) 기술통계로 이상치 확인" level={2}>
            <Bullet level={1}>최소값과 최대값 확인 후 이상치 있는지 확인 (오타로 인해 44, 55 등의 숫자가 있을 수 있음). 어떻게 처리할지 고객에게 물어봄.</Bullet>
            <ImgSlot />
          </Section>
          <Section title="3) 역코딩 하기 (엑셀 파일에서 했으면 넘어가기)" level={2}>
            <Tip>SPSS로 역코딩하는 방법 (꼭 &#39;다른 변수로 코딩 변경&#39; 이용!)</Tip>
          </Section>
          <Section title="4) 신뢰도 분석" level={2}>
            <ImgSlot />
            <Warn>신뢰도가 0.6보다 낮은 경우 → 문항 삭제 or 데이터 수정 (3인톡방에 물어보기)</Warn>
          </Section>
          <Section title="4) 변수계산 하기 (엑셀 파일에서 했으면 넘어가기)" level={2}>
            <Tip>SPSS로 변수 평균 구하는 방법!</Tip>
          </Section>
          <Section title="5) 정규성 검정 (필수는 아님. 연구계획서에 정규성검정 or 비모수검정이 있다면 해줘야 함)" level={2}>
            <Warn>해야 하는지 애매하면 3인톡방에 질문하기</Warn>
            <Bullet level={1}><strong>정규성 검정 해야 하는 상황</strong></Bullet>
            <Bullet level={2}>연구계획서에 비모수 검정이 있거나 정규성 검정을 시행한다고 적혀있다.</Bullet>
            <Bullet level={2}>표본의 개수가 30 미만이다.</Bullet>
            <ImgSlot />
            <Tip>SPSS로 Kruskal-Wallis 돌려보기 (ft. 정규성 검정까지)</Tip>
          </Section>
        </Section>

        <Section title="3] 통계분석 (SPSS)">
          <Section title="2] 탐색적 요인분석 (이쁘게 안 묶이면 3인톡방에 말해주기. 고객님께 얘기하고 문항 하나씩 삭제해야 함)" level={2}>
            <Section title="도저히 EFA가 안 묶여 EFA를 하지 못할 경우 멘트" level={3}>
              <Bullet level={2}>1. 척도를 가져왔을 때 수정하지 않은 경우 EFA를 하지 않아도 되는 걸 말씀드리기.</Bullet>
              <Bullet level={2}>2. 구조방정식 논문 진행하면 EFA 대신 CFA로 바로 넘어가기.</Bullet>
              <Bullet level={2}>3. 죽어도 EFA를 해야한다 → 하위요인을 삭제하고 진행하기..ㅜㅜ</Bullet>
              <ImgSlot />
            </Section>
            <LinkSlot url="https://blog.naver.com/PostView.naver?blogId=kimpubli1214&logNo=223268804837" label="[SPSS 결과 해석하기] 9. 탐색적 요인분석" />
          </Section>
          <Section title="3] 교차검정" level={2}>
            <Tip>SPSS로 교차분석 직접 해보기</Tip>
          </Section>
          <Section title="4] 빈도분석" level={2}>
            <Section title="빈도분석 OT (영상)" level={3}><VideoSlot name="빈도분석OT완성.mp4" /></Section>
            <Section title="표 형식" level={3}><ImgSlot /></Section>
            <Section title="해석 형식" level={3}>
              <Bullet level={2}><strong>1. 어떤 분석을 진행하였고 표 몇 번에 해당하는지 서술</strong></Bullet>
              <Tip>응답자의 일반적 특성을 알아보기 위하여 빈도분석을 실시하였으며, 그 결과를 &lt;표 1&gt;과 같이 나타내었다.</Tip>
              <Bullet level={2}><strong>2. 각 변수마다 응답이 가장 많은 집단부터 가장 적은 집단 순서대로 빈도와 퍼센트를 서술해줍니다</strong></Bullet>
              <Tip>성별에서는 여성이 127명(62.6%)으로 남성 76명(37.4%)보다 높은 비율을 차지하였다. 연령을 살펴보면, 30대가 68명(33.5%)으로 가장 많았으며, 이어 40대가 59명(29.1%), 20대가 37명(18.2%), 50대가 25명(12.3%), 10대가 14명(6.9%) 순으로 나타났다. 최종 학력은 대학 졸업자가 122명(60.1%)으로 가장 많았으며, 석사 졸업자가 73명(36.0%), 박사 수료 이상이 8명(3.9%)으로 확인되었다. 학교 유형의 경우, 법인시설에 속하는 대상자가 116명(57.1%)으로 개인시설 소속 87명(42.9%)보다 높은 비율을 차지하였다. 마지막으로 지역의 경우, 대전이 71명(35.0%)으로 가장 많았으며, 서울과 강원이 각각 66명(32.5%)으로 동일한 비율을 보였다.</Tip>
            </Section>
          </Section>
          <Section title="4-1] 복수응답 빈도분석" level={2}>
            <Tip>SPSS 복수응답(다중반응) 코딩, 빈도분석 하는 방법 5분만에 알아보기</Tip>
          </Section>
          <Section title="5] 기술통계분석" level={2}>
            <Section title="기술통계분석 OT (영상)" level={3}><VideoSlot name="기술통계OT.mp4" /></Section>
          </Section>
          <Section title="6] 상관관계분석" level={2}>
            <LinkSlot url="https://blog.naver.com/PostView.naver?blogId=kimpubli1214&logNo=223188535601" label="[SPSS 결과 해석하기] 3. 상관관계분석" />
          </Section>
          <Section title="7] 차이검정" level={2}>
            <Section title="차이검정 표 형식 (N, M, SD, t/F, p, Scheffe 순으로)" level={3}><ImgSlot /></Section>
            <Section title="응답자 수가 1인 집단이라 표준편차가 0일 때 → 0.00으로 써주기" level={3}><ImgSlot /></Section>
            <Section title="⚠️ 사후검정 작성할 때 유의사항" level={3}>
              <Bullet level={2}>ANOVA 결과는 유의한데(p가 0.05보다 작은데) 사후검정이 나눠지지 않으면 <Code>(n/a)</Code>로 기재.<ImgSlot /></Bullet>
              <Bullet level={2}>사후검정 알파벳은 첫 집단부터 a, b, c…로 지정<ImgSlot /></Bullet>
              <Bullet level={2}>ANOVA 결과는 유의하지 않으면(p가 0.05보다 큰데) 사후검정이 나눠지더라도 기재 X.</Bullet>
            </Section>
            <Section title="해석 작성 방식(틀)" level={3}>
              <Bullet level={2}>응답자의 일반적 특성에 따라 어떤 변수의 차이를 알아보는지 서술<ImgSlot /></Bullet>
              <Bullet level={2}>유의한 차이가 나타난 인구통계 변수와 차이가 나타나지 않은 인구통계 변수 <strong>각각 모두</strong> (t/F=, p=) 서술하기.<ImgSlot /></Bullet>
              <Bullet level={2}><strong>유의한 인구통계 변수만</strong> 각각 가장 평균이 높은 집단과 낮은 집단 언급<ImgSlot /></Bullet>
              <Bullet level={2}>Scheffe 사후검정 결과 서술<ImgSlot /></Bullet>
            </Section>
            <Tip>SPSS 독립표본 t검정 직접 분석해보기</Tip>
            <Tip>SPSS 일원배치분산분석(ANOVA) 직접 해보기! (ft. 해석방법, 사후검정)</Tip>
          </Section>
          <Section title="8] 다중회귀분석" level={2}>
            <Section title="표 형식 → B, SE, β, t, p, VIF, R², 수정된 R², Durbin-Watson (더미변수 투입한 경우 Ref도 표기)" level={3}><ImgSlot /></Section>
            <Section title="해석 작성 틀" level={3}>
              <Tip>차이검정에서 유의한 차이를 보인 인구통계 변수를 통제변수로 투입한 후 다중회귀분석을 실시하였고 결과는 &lt;표 &gt;와 같다.<br /><br />먼저 다중공선성 검정을 위해 살펴본 분산팽창지수(VIF) 값은 1.256~3.147로 모두 10 미만으로 나타나 다중공선성 문제는 없음을 확인하였다. 또한, Durbin-Watson 값은 2.202로 2에 가까워 잔차의 자기상관성 문제도 없었다. 회귀모형의 설명력(R²)은 70.7%로 나타났으며, 모형은 통계적으로 유의한 것으로 확인되었다(F=21.664, p&lt;.001).<br /><br />회귀분석 결과, 태도요인(β=.351, t=5.203, p&lt;.001), 경험요인(β=.259, t=3.531, p=.001), 인지요인(β=.155, t=2.357, p=.020)이 유의한 정(+)의 영향을 미치는 것으로 나타났다.</Tip>
            </Section>
            <LinkSlot url="https://blog.naver.com/kimpubli1214" label="SPSS로 더미변수 만드는 방법 3분만에 알아보자 (ft. 위계적 회귀분석, 통제변수, Reference)" />
          </Section>
          <Section title="9] Baron&amp;Kenny 이용한 매개효과" level={2}>
            <LinkSlot url="https://blog.naver.com/kimpubli1214/223251339862" label="[SPSS 결과 해석하기] 7. 매개효과 위계적 회귀분석" />
          </Section>
          <Section title="10] Baron&amp;Kenny 이용한 조절효과 (+ 상호작용항 만들기)" level={2}>
            <Tip>Baron&amp;Kenny 위계적 회귀분석으로 조절효과 직접 검증해보기 (ft. SPSS)</Tip>
          </Section>
          <Section title="10-1] 조절효과 그래프 만들기" level={2}>
            <Bullet level={1}>1. 그래프 만들기</Bullet>
            <LinkSlot url="https://m.blog.naver.com/kimpubli1214/222964405846" label="blog.naver.com/kimpubli1214/222964405846" />
            <Bullet level={1}>2. 논문 형식으로 가공하기</Bullet>
            <LinkSlot url="https://blog.naver.com/kimpubli1214/224060096428" label="blog.naver.com/kimpubli1214/224060096428" />
          </Section>
          <Section title="11] 매개된 조절효과" level={2}>
            <FileSlot name="매개된조절효과설명논문.pdf" />
            <FileSlot name="매개된조절_조절된매개_설명논문.pdf" />
            <Section title="Muller et al.(2005)의 접근법 (SPSS 위계적회귀분석)" level={3}>
              <LinkSlot url="#" label="매개된 조절효과 분석 : Muller et al.(2005)의 접근법" />
            </Section>
          </Section>
          <Section title="12] 프로세스 매크로 (1, 4, 5, 6번)" level={2}>
            <Tip>프로세스 매크로 분석 시 주의할 점 참고</Tip>
            <Section title="10-2] 프로세스 매크로 4번을 이용한 매개효과" level={3}>
              <LinkSlot url="#" label="프로세스 매크로 4번으로 매개효과 검증해보기" />
            </Section>
            <Section title="11-2] 프로세스 매크로 1번을 이용한 조절효과" level={3}>
              <LinkSlot url="#" label="프로세스 매크로 1번으로 조절효과 검증해보기 (블로그 포스팅)" />
              <Bullet level={2}><strong>표 형식</strong><ImgSlot /></Bullet>
              <Bullet level={2}><strong>해석 틀</strong></Bullet>
              <Tip>어떤 가설을 검증하는지, 각 단계는 어떤 영향을 검증하는지 기재.<br /><br />대인관계성향이 외모관리행동에 미치는 영향에서 연령의 조절효과를 검증하기 위해 위계적 회귀분석을 실시한 결과를 &lt;표 9&gt;에 제시하였다. 1단계에서는 독립변인인 대인관계성향이 외모관리행동에 미치는 영향을 검증하였고, 2단계에서는 독립변인인 대인관계성향과 조절변인인 연령이 외모관리행동에 미치는 영향을 분석하였다. 3단계에서는 대인관계성향과 연령의 상호작용항을 추가로 투입하여 외모관리행동에 미치는 영향을 검증하였다.<br /><br />먼저 회귀모형은 1단계(F=51.714, p&lt;.001), 2단계(F=26.047, p&lt;.001), 3단계(F=17.537, p&lt;.001)에서 모두 통계적으로 유의하게 나타났다. 회귀모형의 설명력은 1단계에서 16.9%, 2단계에서 16.7%, 3단계에서 16.6%로 나타났다.<br /><br />회귀계수의 유의성 검증 결과, 1단계에서 대인관계성향이 외모관리행동에 유의한 정(+)의 영향을 미치는 것으로 나타났다(β=.415, p&lt;.001). 2단계에서는 연령이 외모관리행동에 유의한 영향을 미치지 않는 것으로 나타났다(β=.041, p&gt;.05). 3단계에서는 대인관계성향과 연령의 상호작용 변수가 외모관리행동에 유의한 영향을 미치지 않는 것으로 나타났다(β=-.046, p&gt;.05).<br /><br />이러한 결과는 대인관계성향과 외모관리행동의 관계에서 연령의 조절효과가 유의하지 않음을 나타내며, 연령이 대인관계성향과 외모관리행동 간의 관계를 조절하는 요인으로 작용하지 않음을 알 수 있다.</Tip>
            </Section>
            <Section title="12] 프로세스 매크로 6번 (이중매개)" level={3}>
              <LinkSlot url="https://blog.naver.com/kimpubli1214/223252381973" label="[SPSS 결과 해석하기] 8. 프로세스 매크로 6번 이중매개효과 해석하기" />
            </Section>
            <Section title="13] 프로세스 매크로 5번 (조절된 직접효과)" level={3}>
              <Tip>박미화님 참고해서 포스팅 예정</Tip>
            </Section>
          </Section>
        </Section>

        <Section title="4] 통계분석 (AMOS)">
          <Section title="1] CFA" level={2} defaultOpen>
            <Section title="1단계: CFA 표해석 메뉴얼" level={3}>
              <Bullet level={2}><strong>표 예시 (모논문 표형식이 우선!)</strong><ImgSlot /></Bullet>
              <Bullet level={2}><strong>표 채우는 방법</strong><ImgSlot /><ImgSlot /></Bullet>
              <Section title="AVE&amp;CR 계산하는 방법" level={3}>
                <Bullet level={2}>1) 스탯지니 접속 — stat-genie.com<ImgSlot /></Bullet>
                <Bullet level={2}>2) 표준화 요인적재량 입력<ImgSlot /></Bullet>
                <Bullet level={2}>3) 결과 확인<ImgSlot /></Bullet>
              </Section>
              <Section title="모형적합도 기재 방법" level={3}>
                <Bullet level={2}>1. 파일에서 모형적합도 찾기<ImgSlot /></Bullet>
                <Bullet level={2}>2. 표에 기재하기 (모논문 형식대로)<ImgSlot /></Bullet>
              </Section>
              <Bullet level={2}><strong>해석 예시 (모논문 해석이 우선!)</strong><ImgSlot /></Bullet>
            </Section>
            <Section title="2단계: CFA 분석 메뉴얼" level={3}>
              <Section title="모형적합도" level={3}>
                <Tip>모형적합도 P가 0.05보다 작을 때 설명:<br />X² 통계량의 경우 p=0.000으로 적합도의 기준에 미치지 못하나, 샘플의 개수가 증가할수록 X² 값도 증가하게 되므로 값이 유의하지 않다고 반드시 적합도가 낮은 것은 아니며 다른 적합지수와 함께 고려하여 적합도를 판단하여야한다(배병렬, 2014)</Tip>
              </Section>
              <Section title="집중타당성 기준" level={3}>
                <Tip>수렴타당도는 요인적재치, 평균분산추출(AVE), 종합신뢰도 등을 평가하였다. 요인적재치를 통해 수렴타당도를 검증할 경우 요인적재치 계수와 통계적 유의성을 확보할 수 있다. 요인적재치는 학자마다 견해가 다르나 일반적으로 사회과학 연구에서는 .4 이상일 때 유의한 변수이며, .5 이상일 때 중요한 변수로 본다(최현철, 2016). C.R.(개념신뢰도)는 표준화된 요인부하량 합의 제곱을 표준화된 요인부하량 합의 제곱과 오차분산의 합으로 나눈 값이며, .7 이상이면 집중타당성이 있는 것으로 간주한다. 평균분산추출과 종합신뢰도는 .5 이상일 때 수렴타당도가 있다고 판단한다.</Tip>
                <FileSlot name="39p에CFA베타0.4이상출처나와있음.pdf" />
              </Section>
              <Section title="AVE가 0.5보다 낮을 때 대처 방법" level={3}>
                <Bullet level={2}>1. 문항 삭제를 통해 AVE를 올려본다</Bullet>
                <Bullet level={2}>2. 도저히 안 올라가면 다음과 같이 논문에 기재</Bullet>
                <Tip>확인적 요인분석 측정모형에 대한 요인구조의 집중타당도 검증을 위해 요인별 개념신뢰도와 평균분산추출(AVE), 유의성(C.R.)을 확인하였다. 검증 결과 주관적 안녕감의 요인별 개념 신뢰도는 전부 0.7 이상, 유의성(C.R)의 경우 1.96 이상으로 나타났으나 평균 분산추출(AVE)의 경우 삶의 만족도(.566)의 경우 .5 이상, 긍정정서(.38)과 부정정서(.343)으로 0.5 이하로 나타났다. 그러나 평균분산추출(AVE)값이 0.5보다 낮게 나왔을 때 개념 신뢰도가 0.6보다 높을 경우 타당도가 적절할 수 있다는 선행연구에 따라 집중타당성이 있다고 판단하였다(Fornell &amp; Larcker, 1981).</Tip>
                <FileSlot name="44pAVE0.5보다낮을때언급있음.pdf" />
              </Section>
              <Section title="개념신뢰도 0.7보다 낮은 경우" level={3}>
                <FileSlot name="개념신뢰도 0.7보다 낮은 논문.pdf" />
              </Section>
              <Section title="오류: sample moment matrix is not positive definite" level={3}>
                <Warn>상관행렬을 계산할 수 없는 상태. EFA도 돌아가지 않음.<br /><br />문제 발생 이유:<br />1. 문항 하나가 분산이 0인 경우 (예: &#39;커뮤니케이션1&#39; 문항에 100명 모두가 &#39;3점&#39;이라고 응답한 경우)<br />2. 특정 변수가 다른 변수와 완전히 똑같거나 반대인 경우 (커뮤니케이션1과 커뮤니케이션2가 완전히 동일)</Warn>
                <ImgSlot />
              </Section>
            </Section>
          </Section>

          <Section title="2] 판별타당성" level={2}>
            <Section title="1단계: 표해석 메뉴얼" level={3}>
              <Bullet level={2}><strong>표해석 예시 (모논문 형식이 우선!)</strong><ImgSlot /></Bullet>
              <Section title="표 채우는 방법" level={3}>
                <Bullet level={2}>1. 상관관계 채우기 (상관관계 분석 과정과 동일)<ImgSlot /></Bullet>
                <Bullet level={2}>2. AVE 제곱근 계산하기</Bullet>
                <Section title="AVE&amp;CR 계산하는 방법" level={3}>
                  <Bullet level={2}>1) 스탯지니 접속 — stat-genie.com<ImgSlot /></Bullet>
                  <Bullet level={2}>2) 표준화 요인적재량 입력<ImgSlot /></Bullet>
                  <Bullet level={2}>3) 결과 확인<ImgSlot /></Bullet>
                </Section>
                <ImgSlot />
              </Section>
              <Section title="판별타당성 충족 안 되면? (상관계수 &gt; AVE 제곱근)" level={3}>
                <Bullet level={2}>1. 판별타당성 충족 안 될 경우 아래 해석 추가 (상관계수가 AVE 제곱근보다 클 때)</Bullet>
                <Tip>판별타당성이란 서로 다른 변수들 간에는 그 측정치에도 분명한 차이가 나야 한다는 것을 의미하며, 여기서 분명한 차이는 상관계수 값을 기준으로 하여 한 변수와 다른 변수간의 상관관계가 낮아야 판별타당성을 확보되었다고 할 수 있다.<br /><br />또한, 집중타당성과 판별타당성의 차이점을 살펴보면 집중타당성은 상관관계가 높아야 하지만, 판별타당성은 그와 반대로 상관관계가 낮아야 타당성이 확보되었다고 할 수 있다(Fornell &amp; Larcker, 1981).<br />판별타당성 검증은 ①평균분산추출(AVE)&gt;상관계수의 제곱값, ②(상관계수 ± 2×표준오차)값이 1을 포함하지 않고, ③ 두 구성개념간 자유로운 상관를 갖는 비제약모델과 두 구성개념사이의 공분산을 1로 고정시킨 제약 모델간의 χ² 차이분석을 통하여 유의적(χ²=3.84 이상, df=1)인 것 중 하나가 충족하면 판별타당성이 있는 것으로 판단된다(Anderson &amp; Gerbing, 1988).<br /><br />본 연구의 측정모델 내 판별타당성 검증을 위해 변수 간 상관관계를 확인한 결과, 태도와 이용의도의 상관계수가 AVE 제곱근을 상회하는 것으로 나타나 판별타당성을 확보하지 못함을 알 수 있었다. 이에 변수 간 상관계수의 신뢰구간을 확인하는 방법을 적용하여 판별타당성에 대한 2차 검증을 수행하였다.<br /><br />측정변수의 신뢰구간을 상관계수±2 × 표준오차값으로 산출하여 확인한 결과, 모든 변수의 상관계수 신뢰구간 내에 1이 포함되지 않는 것으로 나타나 측정모델의 판별타당성 기준을 충족하고 판별타당성을 확보하였다.</Tip>
                <Bullet level={2}>2. 신뢰구간 표 형식<ImgSlot /></Bullet>
                <Bullet level={2}>3. 상관관계 신뢰구간으로 판별타당성 검증한 논문 예시</Bullet>
                <FileSlot name="46p상관관계신뢰구간으로판별타당성논문_김민경님.pdf" />
              </Section>
            </Section>
            <Section title="2단계: 분석 메뉴얼" level={3} />
          </Section>

          <Section title="3] 구조방정식" level={2}>
            <Section title="1단계: 표해석 메뉴얼" level={3}>
              <Bullet level={2}><strong>표 예시 (모논문 표형식이 우선!)</strong><ImgSlot /></Bullet>
              <Bullet level={2}><strong>표 채우는 방법</strong><ImgSlot /><ImgSlot /></Bullet>
              <Section title="모형적합도 기재 방법" level={3}>
                <Bullet level={2}>1. 파일에서 모형적합도 찾기<ImgSlot /></Bullet>
                <Bullet level={2}>2. 표에 기재하기 (모논문 형식 우선!)<ImgSlot /></Bullet>
              </Section>
            </Section>
            <Section title="2단계: 분석 메뉴얼" level={3}>
              <Tip>CFA와 구조방정식 모형적합도 동일한 논문 참고</Tip>
            </Section>
          </Section>

          <Section title="4] AMOS 매개효과" level={2}>
            <FileSlot name="AMOS이용매개효과.pdf" />
            <FileSlot name="AMOS이용다중매개논문.pdf" />
            <FileSlot name="이중매개팬텀변수.pdf" />
          </Section>

          <Section title="5] AMOS 조절효과" level={2}>
            <FileSlot name="측정동일성!amos조절효과_조충경님.pdf" />
            <FileSlot name="측정동일성형태동일성_든든한고등어.pdf" />
            <FileSlot name="측정동일성형태동일성구조동일성amos_김민경님.pdf" />
            <FileSlot name="amos다중집단비교분석.pdf" />
          </Section>
        </Section>

        <Section title="5] 메모 (도움말 남기기)">
          <Bullet>해석 아카이브 형식과 동일하게, 고객님의 예시(빨간색 표시) 수정해주기.</Bullet>
        </Section>

        <div className="ml-6 my-3">
          <p className="text-sm text-[#37352f] dark:text-[#e6e6e4] mb-1">해석 작성 챗GPTs 링크</p>
          <LinkSlot url="https://chatgpt.com/g/g-KBJrZ74Ld-seupodi-haeseog-jagseong-doumi" label="스포디 해석 작성 도우미 (chatgpt.com)" />
        </div>
      </div>

      {/* ════ 통계주머니 ════ */}
      <Callout icon={<Pin size={16} />} color="blue">
        <strong>🗨️ 통계주머니</strong>
      </Callout>
      <ImgSlot />

      <div className="space-y-0.5">
        <Section title="연구모형 제작 PPT">
          <FileSlot name="연구모형 예시.pptx" />
        </Section>

        <Section title="한글표 제작 꿀팁" defaultOpen>
          <Section title="단축키" level={2}>
            <Bullet level={1}>드래그 후 <Code>Alt + Shift + Enter</Code> — 윗첨자 변경</Bullet>
            <Bullet level={1}>표 열 추가: <Code>Ctrl + Enter</Code></Bullet>
            <Bullet level={1}>표 열 제거: <Code>Ctrl + Backspace</Code></Bullet>
          </Section>
          <Section title="상용구 사용법" level={2}>
            <Bullet level={1}><strong>입력방법:</strong> 입력 &gt; 입력 도우미 &gt; 상용구 &gt; 상용구 내용<ImgSlot /></Bullet>
            <Bullet level={1}><strong>사용방법:</strong> 준말 입력 후 <Code>Alt + i</Code></Bullet>
            <Bullet level={1}><strong>예시</strong></Bullet>
            <Bullet level={2}><Code>d</Code> : R²=, Adj.R²=, F=, p&lt;.001, Durbin-Watson=</Bullet>
            <Bullet level={2}><Code>k</Code> : Kaiser-Meyer-Olkin Measure of Sampling Adequacy</Bullet>
          </Section>
          <Section title="표 폭 줄이기 (표 다이어트)" level={2}>
            <LinkSlot url="https://m.blog.naver.com/lavieenrose77/221967385573" label="blog.naver.com/lavieenrose77/221967385573" />
          </Section>
        </Section>

        <Section title="Graph">
          <FileSlot name="조절효과그래프.xlsx" />
        </Section>

        <Section title="엑셀(Excel) 함수">
          <FileSlot name="함수 종합.xlsx" />
        </Section>

        <Section title="IPA와 Borich 요구도">
          <Section title="IPA 분석" level={2}>
            <LinkSlot url="https://m.blog.naver.com/PostView.naverblogId=statstorm&logNo=221994561980&proxyReferer=" label="IPA 분석에 대해 요약한 글 (blog.naver.com/statstorm)" />
            <Bullet level={1}>밑에 산출 엑셀 파일과 예시 파일로 진행하실 수 있습니다.</Bullet>
            <FileSlot name="IPA 산출.xlsx" />
            <FileSlot name="IPA 분석 예시.hwp" />
          </Section>
          <Section title="Borich 요구도" level={2}>
            <LinkSlot url="https://youtu.be/HylRgwm_v04?si=YWX7xn_tMeb2UQKx" label="Borich 요구도 분석방법 영상 (youtu.be)" />
            <Bullet level={1}>밑에 산출 엑셀 파일과 예시 파일로 진행하실 수 있습니다.</Bullet>
            <FileSlot name="borich 요구도 산출.xlsx" />
            <FileSlot name="Borich 요구도 예시.hwp" />
          </Section>
        </Section>

        <Section title="MANOVA">
          <Tip>다변량 분산분석. 종속변수가 2개 이상일 때 사용.</Tip>
        </Section>

        <Section title="분석 표 양식 주머니">
          <Bullet>각 분석에 대한 표 양식을 모아보았습니다. 모논문과 해당 모음집 참고하여 제작에 도움이 되셨으면 좋겠습니다.</Bullet>
          <Bullet level={1}><strong>SPSS</strong></Bullet>
          <FileSlot name="SPSS통계표메모아카이브.zip" />
          <Bullet level={1}><strong>AMOS</strong></Bullet>
          <FileSlot name="AMOS.zip" />
        </Section>

        <Section title="APA 형식">
          <Bullet>APA 형식이란 사회과학, 교육, 심리학 등 학문 분야에서 널리 쓰이는 표준 논문 작성 및 인용 스타일입니다. 간혹 APA 형식으로 작성을 부탁하시는 고객님이 계십니다. 밑 APA 형식 내용 참고하여 작성하시길 바랍니다.</Bullet>
          <Section title="글씨체" level={2} />
        </Section>

        <Section title="국건영 메뉴얼">
          <LinkSlot url="https://blog.naver.com/kimpubli1214/224245377569" label="blog.naver.com/kimpubli1214/224245377569" />
        </Section>
      </div>
    </>
  );
}

function ResponseManual() {
  return (
    <>
      <Callout icon={<AlertCircle size={16} />} color="red">
        <strong>크레도 필독</strong> — 고객 응대 전 반드시 숙지하세요.
      </Callout>

      {/* ════ 크레도 ════ */}
      <H2><span>❤️</span> 크레도 (응대 원칙)</H2>
      <div className="space-y-0.5">
        <Section title="1. 채팅은 웃으면서, 부드럽게, 친절하게" defaultOpen>
          <Bullet>스탯포디그리는 고객과 얼굴을 대면하지 않고 채팅으로 응대합니다.</Bullet>
          <Bullet>사람은 얼굴을 보지 않고 채팅만 보면 말의 뉘앙스를 부정적으로 인지하는 경우가 많습니다.</Bullet>
          <Callout icon={<Pin size={14} />} color="green">
            고객님께 채팅할 때는 끝에 항상 <strong>"^^, !, ㅎㅎ"</strong> 등의 감정표현을 붙여줍니다. 평서문(맞습니다. 네. 그렇습니다.)은 사용하지 않습니다.
          </Callout>
          <Bullet>특히 고객님이 반복적인 AS나 질문을 하시는 경우 미안해하시는 경우가 많습니다. 이때 딱딱한 평서문을 쓰면 부정적인 뉘앙스로 받아들일 가능성이 높습니다. 언제 어디서나 감정표현 필수입니다.</Bullet>
        </Section>

        <Section title="2. 중간중간 소통과 대화는 필수" defaultOpen>
          <Bullet>분석 과정에서 애매한 부분이 있으면 임의로 처리하는 것보다는 고객님께 질문을 해주세요.</Bullet>
          <Quote>"의뢰자님~ 연령을 나눌때 혹시 원하시는 기준이 있을까요~?"</Quote>
          <Bullet>고객님이 통계가 생소해 잘 모르겠다고 하시면:</Bullet>
          <Quote>"그럼 고객님들이 많이 진행하시는 방향으로 도와드리겠습니다!"</Quote>
          <Warn>타당도, 신뢰도, 가설검증 결과는 분석 초기에 꼭 말씀드려야 합니다. 따로 보고하지 않고 최종 결과물을 받을 때 이러한 사실을 알게 되면 고객만족도는 땅으로 떨어집니다(환불 요청하는 경우도 있음).</Warn>
          <Bullet>진행 일정 기준:</Bullet>
          <Bullet level={1}>분석 시작 <strong>1~2일 내</strong>: 타당도, 신뢰도, 가설검증 결과 보고</Bullet>
          <Bullet level={1}>분석 시작 <strong>3~4일 내</strong>: 표 결과 보고</Bullet>
          <Bullet level={1}>분석 시작 <strong>5~6일 내</strong>: 해석까지 최종 결과물 제출</Bullet>
          <Section title="(사례) 질문했는데 고객님이 잘 모르겠다고 하면?" level={2}>
            <Quote>"우선 그럼 제가 제안드린 방향으로 진행해보고, 나중에 교수님이 수정하라고 하시면 수정 도와드리는건 어떠실까요??"</Quote>
          </Section>
          <Section title="중간 소통 예시 멘트" level={2}>
            <Bullet level={1}>가설 채택 결과:</Bullet>
            <Quote>"의뢰자님 가설 5개중 3개가 채택이 되었네요^^ 이대로 표해석작업 진행하겠습니다!"</Quote>
            <Bullet level={1}>표 완성 후:</Bullet>
            <Quote>"의뢰자님 표 먼저 드립니다! 이대로 해석작업 들어가겠습니다 혹시 궁금하신 부분 있으면 말씀주세요ㅎㅎ"</Quote>
          </Section>
        </Section>

        <Section title="3. 제출할 땐 이것만 기억하자" defaultOpen>
          <Warn>결과물을 너무 늦은 밤에 제출하거나, 결과물을 제출하고 잠수를 타는 상황은 절대 지양합니다!</Warn>
          <Bullet>만약 목요일이 제출 기한이라면 적어도 목요일 오후 6시 전에는 제출해야 합니다.</Bullet>
          <Bullet>고객님이 말씀하신 기한이란, 결과물을 확인하고 피드백까지 진행하는 시간을 말합니다.</Bullet>
          <Section title="결과물 제출 멘트 (크몽 고객님 외)" level={2}>
            <Bullet level={1}>후기 언급 포함하여 제출.</Bullet>
          </Section>
          <Section title="결과물 제출 멘트 (크몽 고객님)" level={2}>
            <Bullet level={1}>크몽 결제 전에 카톡으로 먼저 제출 후 아래 멘트 추가.</Bullet>
            <Quote>"의뢰자님 결과물 크몽으로도 제출하겠습니다! 크몽 100자 이상 후기 남겨주시면 한 달 무료로 AS 도와드리고 있습니다^^ AS 소개서도 드리니 한 번 확인해주세요. 후기가 정말 큰 힘이 됩니다ㅜㅜ"</Quote>
          </Section>
          <Section title="잔금이 지연되는 경우 대처 방법" level={2}>
            <Bullet level={1}>첫 잔금 요청은 결과물을 드리면서 합니다.</Bullet>
            <Quote>"저희가 결과물 드린 후 잔금받고 AS 도와드리고 있어서 시간되실때 부탁드려요!"</Quote>
            <Bullet level={1}>요청 후 하루가 지났는데 잔금을 보내지 않으시면 재요청.</Bullet>
            <Bullet level={1}>교수님 or 본인 확인 후 보내드린다고 하시는 경우 → 2~3일 정도 기다린 후 재요청.</Bullet>
            <Quote>"혹시 ~~로 넘어가면 잔금 스케쥴이 너무 밀려서 질문드려요..!"</Quote>
          </Section>
        </Section>

        <Section title="4. (AS) 시간만 잘 안내해도 고객 만족도 업!" defaultOpen>
          <Bullet>반복적인 AS 요청이 올 경우 AS 사항을 한 번에 정리해달라고 요청하시면 됩니다.</Bullet>
          <Bullet>다른 일을 하고 있어 바로 응대가 불가능한 경우:</Bullet>
          <Quote>"정리해서 카톡 남겨주시면 오늘 오후 6시 안으로 확인 도와드리겠습니다!"</Quote>
          <Callout icon={<Pin size={14} />} color="green">
            고객님의 만족도를 위해 꼭 바로바로 답장하지 않아도 됩니다. 답장 가능한 <strong>정확한 시간</strong>만 알려드리면 고객님의 만족도를 최상으로 유지시킬 수 있습니다.
          </Callout>
        </Section>

        <Section title="5. (AS) 고객이 요청하는 방법이 통계적으로 가능한지 헷갈릴때">
          <Bullet>고객님께서 통계가 생소하시다보니 간혹 불가능한 통계 방식으로 AS 요청을 하시는 경우가 있습니다.</Bullet>
          <Bullet>이 경우 동일한 방법을 사용한 레퍼런스(선행논문)이 있는지 질문을 드리면 됩니다.</Bullet>
          <Bullet>가능한지 여부가 헷갈린다면 은호 or 현호에게 질문주세요 :)</Bullet>
        </Section>

        <Section title="6. 유료 AS 사례 + 멘트">
          <Section title="기본 유료 AS 기준표" level={2} defaultOpen>
            <Bullet level={1}>응답자 삭제 — 표만 수정: <strong>+3만</strong></Bullet>
            <Bullet level={1}>응답자 삭제 — 표 해석 수정: <strong>+5만</strong></Bullet>
            <Bullet level={1}>응답자 삭제 — 가설 채택 만드는 작업: <strong>+5만</strong></Bullet>
            <Bullet level={1}>회귀분석 등 단순 분석 추가 / 재범주화: 무료 (작업량 많으면 3~5만)</Bullet>
            <Bullet level={1}>새로운 데이터 파일로 데이터 가공부터: 작업량에 따라 <strong>5~20만원</strong></Bullet>
          </Section>
          <Section title="가설 채택을 위한 응답자 삭제 요청" level={2}>
            <Warn>응답자 삭제로 유의하게 만드는 건 윤리적으로 옳은 일은 아님! 따라서 최후의 방법으로만 사용. 고객님께 윤리적으로 문제가 된다는 걸 반드시 고지해야 함.</Warn>
          </Section>
          <Section title="AS 소요시간보다 빠르게 자료 요청 시 — 익일 AS 서비스" level={2}>
            <Bullet level={1}>추가 비용: 기존 AS 비용 + 당일 5만원 / 익일 3만원 (변동 가능)</Bullet>
            <Quote>"저희가 비용을 받고 AS 순서를 당기는 것도 가능해서, 요청 주시면 n원 받고 내일까지 제출 드리겠습니다!"</Quote>
          </Section>
          <Section title="AS 기간 후 가설 유의할 때까지 반복 요청하는 경우" level={2}>
            <Bullet level={1}>표 제공은 비용을 받으니 분석결과 파일만 드려도 되는지 여쭤봅니다.</Bullet>
            <Bullet level={1}>결과만 보고 싶으시면 파일만 전달, 표가 필요하시면 비용 받고 만들어드림.</Bullet>
          </Section>
          <Section title="작업량이 많아서 추가 비용 받아야 할 때" level={2}>
            <Bullet level={1}>크몽 의뢰라면 정성 후기 받는 용도로 협의 가능.</Bullet>
          </Section>

          <Section title="(AS기간 내) 유료 AS 사례 기록" level={2}>
            <Bullet level={1}>(10.11) 박하나님 — 5만원: 일반적 특성 범주 변경으로 차이검정 표 8개 수정 + 4개 추가, 상관관계·회귀분석 하위요인 4개 추가</Bullet>
            <Bullet level={1}>(10.15) 김경진님 — 8만원: 가설 채택 위한 응답자 삭제(3만) + 빈도·기술통계·차이검정10·상관관계·회귀분석 수정(5만)</Bullet>
            <Bullet level={1}>(10.29) 오상훈님 — 8만원: 표 30개에 대한 해석 추가</Bullet>
            <Bullet level={1}>(11.5) 권순규님 — 5만원: 하위영역 재작업, 역문항 잘못 적용, 회귀분석 재작업 (고객님 착오)</Bullet>
            <Bullet level={1}>(11.8) 문수님 — 8만원: 표 형식 수정+응답자 삭제 작업(3만)+모든 표해석 수정(5만)</Bullet>
            <Bullet level={1}>(25.9.15) 홍채연님 — 무료: 6개월 전 의뢰, 첫 AS라 무료 처리</Bullet>
            <Bullet level={1}>(25.9.21) 함세리님 — 15만원: IPA 23회, 다중회귀분석 12회</Bullet>
            <Bullet level={1}>(25.9.21) 이성도님 — 10만원: 조절효과 30번 분석 후 유의한 10개만 표해석 (표해석 만들시 추가 견적 사전 고지 필요)</Bullet>
          </Section>
        </Section>
      </div>

      {/* ════ 응대 멘트 메뉴얼 ════ */}
      <H2><span>💬</span> 응대 멘트 메뉴얼</H2>
      <div className="space-y-0.5">
        <Section title="1. 첫 멘트" defaultOpen>
          <Quote>불만족시 백프로 환불 스포디입니다!</Quote>
          <Bullet>필요한 자료 요청: 연구계획서, 비슷한 통계형식의 모논문, 데이터나 설문지</Bullet>
          <Bullet>크몽의 경우 '자주 쓰는 문구'의 '기본 인사' 사용</Bullet>
          <Bullet>서비스소개서 보내기</Bullet>
        </Section>

        <Section title="2. 파일 확인 후 견적" defaultOpen>
          <Bullet>파일 확인 후 바로 견적 이야기하지 않기. 자료를 바탕으로 질문 or 소통을 통해 <strong>라포를 형성</strong>한 후 견적.</Bullet>
          <Bullet>논문 형식의 표해석뿐 아니라 한 달 A/S와 졸업까지 통계질문도 도와드린다고 언급.</Bullet>
          <Quote>"의뢰 주시면 논문형식의 표해석뿐 아니라 교수님 피드백 위한 한달 무료 A/S, 졸업까지 통계 이해 위한 질문도 도와드리고 있어요"</Quote>
          <Bullet>크몽의 경우 '자주 쓰는 문구'의 '가격 말할 때 이걸로 보내기' 이용.</Bullet>
          <Bullet>분석방법이나 모논문 등 자료가 준비되지 않았다고 하시는 경우, 고객님이 많이 사용하는 형식으로 도와드린다고 언급. (대신 결제 받기 전 어떤 분석을 진행할지는 제안드리고 확정 받아야함)</Bullet>
        </Section>

        <Section title="3. 분석 기한 + 후기 할인 안내" defaultOpen>
          <Bullet>분석 시작 후 일주일 내로 드리고 있으며, 중간에 표 먼저 드리는 것도 가능하다고 언급.</Bullet>
          <Bullet>앞에 예약이 찼을 경우 예약 가능 날짜 안내.</Bullet>
          <Bullet>마지막으로 정성 후기 가능하면 만 원 할인 언급.</Bullet>
        </Section>

        <Section title="4. 결제창 보내기 + '정성' 후기 할인 언급">
          <Bullet>결제창 전송 후 정성 후기 빌드업. 제출 때도 동일하게 후기 언급.</Bullet>
        </Section>

        <Section title="5. 결제 후">
          <Bullet>크몽의 경우 비즈니스로 연결하기.</Bullet>
          <Bullet>비즈니스 연결 후 이름 변경.</Bullet>
        </Section>
      </div>
    </>
  );
}

function ChecklistManual() {
  return (
    <>
      <Callout icon={<CheckSquare size={16} />} color="blue">
        <strong>응대 체크리스트</strong> — 분석 완료 전 모든 항목을 확인하세요.
      </Callout>

      <H2><span>🔄</span> 분석 중 체크리스트</H2>
      <div className="space-y-1 ml-4">
        <CheckItem>1] 역문항 여부 물어보았는가?<br /><span className="text-xs text-[#9b9a97]">모른다고 하실 경우 동일한 설문지 사용한 모논문 물어보기 → 없으면 설문지 보며 역문항 확인 후 고객님께 질문 → 신뢰도분석 0.6 이상 확인</span></CheckItem>
        <CheckItem>2] 하위요인 각각 몇 번 문항에 해당하는지 물어보았는가?</CheckItem>
        <CheckItem>3] 역문항이 몇 점 척도인지 인지하였는가? / 역코딩 진행하였는가?<br /><span className="text-xs text-[#9b9a97]">4점, 7점 척도이면 역코딩 다르게 해야함. (1→4, 2→3, 3→2, 4→1)</span></CheckItem>
        <CheckItem>4] 결측치 or 이상치 확인하였는가? (빈도분석, 기술통계분석)<br /><span className="text-xs text-[#9b9a97]">일반적 특성에는 결측치가 있으면 안 됨. 있다면 고객님께 임의로 채워도 되는지 물어보기.</span></CheckItem>
        <CheckItem>5] 변수 계산 꼼꼼히 진행하였는가? (주의!!!)<br /><span className="text-xs text-red-500 font-medium">변수 계산을 잘못하면 처음부터 다시 하거나 환불해줘야 하는 상황 생김..!!</span></CheckItem>
        <CheckItem>6] 문제상황 발생 시 임의로 처리하지 않고 고객님께 알려드렸는가?<br /><span className="text-xs text-[#9b9a97]">(예: 탐색적 요인분석이 잘 묶이지 않은 경우)</span></CheckItem>
        <CheckItem>7] 중간중간 고객님께 분석 진행 사항 전달했는가? (표 완성 후 중간 보고 했는가?)<br /><span className="text-xs text-[#9b9a97]">타당도, 신뢰도는 캡처 등 자유롭게 의뢰자분께 보고</span></CheckItem>
        <CheckItem>10] 분석 시 변수는 절대 삭제하지 않기!! (전화번호 등 개인정보는 무조건 삭제!!)<br /><span className="text-xs text-[#9b9a97]">나중에 AS 할 때 변수가 필요한 경우 있음. "같은 변수로 코딩하기" 말고 "다른 변수로 코딩하기"</span></CheckItem>
        <CheckItem>11] 분석마다 결과파일 저장하기<br /><span className="text-xs text-[#9b9a97]">학교 제출용으로 요구하는 경우 많고 AS시 필요</span></CheckItem>
      </div>

      <H2><span>📋</span> 표, 해석, 메모 체크리스트</H2>
      <div className="space-y-1 ml-4">
        <CheckItem>8] 표해석 양식은 모논문의 구조를 최대한 참고하기. 모논문 없다면 분석시 메뉴얼의 양식을 참고하기.</CheckItem>
        <CheckItem>9] 챗지피티 복붙한 후 티 안나게 다듬기 (챗지피티 그대로 복붙은 절대 지양!!)<br /><span className="text-xs text-[#9b9a97]">** 안 오게 / "~" 누락 안 되게 / 오타나 오류 없는지 확인</span></CheckItem>
        <CheckItem>11] 통계결과를 임의로 수정하지 않습니다 (분석파일 요구하면 결국 걸림)<br /><span className="text-xs text-[#9b9a97]">통계결과가 원하는대로 나오지 않는 경우 알려주시면 해결해드리겠습니다.</span></CheckItem>
        <CheckItem>13] 메모를 작성할 때는 아카이브에 있는 메모를 임의로 빠트리지 않습니다.<br /><span className="text-xs text-[#9b9a97]">메모를 복붙하고 특정 값들을 해당 표에 맞게 수정해주세요 (ex. R2 값 등)</span></CheckItem>
      </div>

      <H2><span>📦</span> 결과물 전달 시 체크리스트</H2>
      <div className="space-y-1 ml-4">
        <CheckItem>1] 제출 전 검토 하였는가?</CheckItem>
        <CheckItem>2] (크몽) 정성 후기 안내 전달하였는가?<br /><span className="text-xs text-[#9b9a97]">크몽: 평점 5.0 후기 남겨주시면 한 달 간 A/S 무료로 도와드린다고 언급 / 비즈니스 고객은 후기 상관없이 한 달 무료</span></CheckItem>
        <CheckItem>3] (크몽) 제출 전 카톡으로 먼저 제출했는가?<br /><span className="text-xs text-[#9b9a97]">카톡 제출 후 → "선생님, 크몽으로도 제출하겠습니다!"</span></CheckItem>
        <CheckItem>4] 결과물 제공 후 잔금 받고 AS 진행한다고 전달하였는가?<br /><span className="text-xs text-[#9b9a97]">"선생님~ 저희가 결과물 드린 후에 잔금받고 as 도와드리고 있어서..! 시간되실 때 잔금 부탁드릴게요^^"</span></CheckItem>
        <CheckItem>5] AS 정책 소개서 전달하였는가?</CheckItem>
        <CheckItem>6] 현금영수증 발급 안내하였는가?<br /><span className="text-xs text-[#9b9a97]">"번호 보내주시면 현금영수증 발급도 도와드리겠습니다!"</span></CheckItem>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */

const TABS = [
  { id: "analysis", label: "📊 분석 메뉴얼", icon: <BookOpen size={14} /> },
  { id: "response", label: "💬 응대·크레도", icon: <MessageSquare size={14} /> },
  { id: "checklist", label: "☑️ 체크리스트", icon: <CheckSquare size={14} /> },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ManualPage() {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#191919]">
      <div className="max-w-3xl mx-auto px-16 py-12">
        {/* 페이지 제목 */}
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={36} className="text-[#37352f] dark:text-[#e6e6e4]" />
          <h1 className="text-4xl font-bold text-[#37352f] dark:text-[#e6e6e4]">메뉴얼</h1>
        </div>
        <p className="text-sm text-[#9b9a97] dark:text-[#6b6b6b] mb-6">
          SPSS 분석 가이드 · 고객 응대 크레도 · 응대 체크리스트
        </p>

        {/* 탭 */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg bg-[#f7f7f5] dark:bg-[#2f2f2f] border border-[#e9e9e7] dark:border-[#3f3f3f]">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#e6e6e4] shadow-sm"
                  : "text-[#9b9a97] dark:text-[#6b6b6b] hover:text-[#37352f] dark:hover:text-[#e6e6e4]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "analysis" && <AnalysisManual />}
        {activeTab === "response" && <ResponseManual />}
        {activeTab === "checklist" && <ChecklistManual />}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#e9e9e7] dark:border-[#3f3f3f]">
          <p className="text-xs text-[#c4c3bf] dark:text-[#4f4f4f] text-center">
            Statfordegree Hub · 종합 메뉴얼 · 최종 업데이트 2026년 3월
          </p>
        </div>
      </div>
    </div>
  );
}
