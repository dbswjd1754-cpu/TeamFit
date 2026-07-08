/**
 * OnboardingResult — 성향 분석 결과 + Persona 시스템
 *
 * [절대 변경 금지]
 *   - handleGoToRecommend 로직
 *   - navigate 경로
 *   - useUserStore / useGroupStore 구독
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore   from '../store/useUserStore';
import useGroupStore  from '../store/useGroupStore';
import { TYPES }      from '../data/questions';
import { buildTabRecommendations } from '../utils/balanceScoring';
import { buildPersona, getAllPersonas, getPersonaRatio } from '../utils/persona';

/* ══ ⓘ Bottom Sheet: Persona 생성 기준 ══════════════════ */
function PersonaInfoSheet({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
        style={{ animation:'sheetUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl"
          style={{ maxHeight:'80vh', overflowY:'auto' }}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
          <p className="text-base font-black text-gray-900 mb-4">
            Persona는 어떻게 결정되나요?
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            TeamFit Persona는 성향검사 10문항의 응답 결과를 기반으로 생성됩니다.
            각 문항은 아래 네 가지 성향 중 하나의 점수로 반영됩니다.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { emoji:'🚀', name:'추진형', color:'#EF4444', bg:'#FEF2F2' },
              { emoji:'🤝', name:'소통형', color:'#10B981', bg:'#ECFDF5' },
              { emoji:'🔍', name:'탐구형', color:'#8B5CF6', bg:'#F5F3FF' },
              { emoji:'⚡', name:'실행형', color:'#F59E0B', bg:'#FFFBEB' },
            ].map(t => (
              <div key={t.name} className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: t.bg }}>
                <span className="text-lg">{t.emoji}</span>
                <span className="text-sm font-bold" style={{ color: t.color }}>{t.name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            10문항 결과를 합산하여 각 성향의 비율을 계산한 뒤, 가장 높은 성향과
            두 번째 성향의 조합을 기반으로 TeamFit Persona가 생성됩니다.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-1">예시</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              <span className="font-black">🚀🤝 Balanced Leader</span>는 추진형과 소통형이 균형 있게 나타난
              사용자에게 부여되는 Persona입니다.
            </p>
          </div>
          <button onClick={onClose}
            className="w-full mt-5 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">
            닫기
          </button>
        </div>
      </div>
    </>
  );
}

/* ══ ⓘ Bottom Sheet: AI 궁합점수 계산 기준 ═══════════════ */
function CompatInfoSheet({ onClose }) {
  const ITEMS = [
    { label:'Persona 궁합',   score:38, max:40, color:'#4F6EF7' },
    { label:'협업 스타일',    score:26, max:30, color:'#10B981' },
    { label:'도메인 일치',    score:18, max:20, color:'#8B5CF6' },
    { label:'프로젝트 경험',  score:8,  max:10, color:'#F59E0B' },
  ];
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
        style={{ animation:'sheetUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl"
          style={{ maxHeight:'85vh', overflowY:'auto' }}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
          <p className="text-base font-black text-gray-900 mb-4">
            AI 궁합점수는 어떻게 계산되나요?
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            AI 궁합점수는 아래 요소를 종합하여 계산됩니다.
          </p>
          <div className="space-y-1.5 mb-4">
            {['Persona 궁합','협업 스타일 유사도','관심 도메인 일치도','프로젝트 경험 및 협업 경험'].map((item,i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-emerald-500 font-black text-xs">•</span>
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-4">
            각 항목을 종합하여 가장 함께 협업하기 좋은 Persona를 추천합니다.
          </p>

          {/* 예시 점수표 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">예시</p>
            <div className="space-y-2.5">
              {ITEMS.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                    <span className="text-xs font-black" style={{ color:item.color }}>
                      {item.score}
                      <span className="text-[10px] font-normal text-gray-400"> / {item.max}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width:`${(item.score/item.max)*100}%`, backgroundColor:item.color }}/>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-1">
                <span className="text-xs font-black text-gray-700">최종 궁합점수</span>
                <span className="text-sm font-black text-emerald-600">90점</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            점수가 높을수록 협업 방식과 관심 분야가 잘 맞으며,
            함께 프로젝트를 진행하기 좋은 조합으로 판단합니다.
          </p>
          <button onClick={onClose}
            className="w-full mt-5 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">
            닫기
          </button>
        </div>
      </div>
    </>
  );
}

/* ── 비율 바 ── */
function RatioBar({ typeKey, value, delay }) {
  const [width, setWidth] = useState(0);
  const t = TYPES[typeKey];
  useEffect(() => {
    const timer = setTimeout(() => setWidth(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm w-14 flex items-center gap-1 flex-shrink-0">
        <span>{t.emoji}</span>
        <span className="text-gray-500 font-medium text-xs">{t.name}</span>
      </span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width:`${width}%`, backgroundColor:t.color }}/>
      </div>
      <span className="text-xs font-bold w-8 text-right"
        style={{ color: value > 0 ? t.color : '#D1D5DB' }}>
        {value}%
      </span>
    </div>
  );
}

/* ── Persona 카드 ── */
function PersonaCard({ persona, size = 'lg' }) {
  const isLg = size === 'lg';
  return (
    <div className={`text-center ${isLg ? '' : 'text-left flex items-center gap-3'}`}>
      <div className={`${isLg ? 'text-4xl mb-2' : 'text-2xl flex-shrink-0'}`}>
        {persona.emoji}
      </div>
      <div>
        <p className={`font-black text-gray-900 ${isLg ? 'text-xl mb-0.5' : 'text-sm'}`}>
          {persona.name}
        </p>
        <p className={`text-gray-400 ${isLg ? 'text-xs' : 'text-[10px]'}`}>
          {persona.en}
        </p>
      </div>
    </div>
  );
}

/* ── "잘 맞는 Persona" 계산 — buildTabRecommendations 기반 ── */
function calcMatchedPersonas(me, myPersonaKey) {
  const allPersonas = getAllPersonas();
  // 현재 사용자 본인 Persona 제외
  const candidates = allPersonas
    .filter(p => p.key !== myPersonaKey)
    .map(p => ({
      id:              `persona_${p.key}`,
      name:            p.name,
      groupCode:       me.groupCode,
      projectCode:     me.projectCode,
      dominantType:    Object.entries(getPersonaRatio(p.key)).sort((a,b)=>b[1]-a[1])[0][0],
      typeRatio:       getPersonaRatio(p.key),
      rawAnswerVector: me.rawAnswerVector, // 벡터 없으면 자기 자신 — styleSim 0으로 처리
      domains:         me.domains,
      priority:        me.priority,
      _persona:        p,
    }));

  // buildTabRecommendations('ai', me, candidates) — 기존 AI 추천 로직 그대로 사용
  const recs = buildTabRecommendations('ai', me, candidates, []);
  // 상위 2개 반환
  return recs.slice(0, 2).map(r => ({
    persona:  r.user._persona,
    score:    r.score,
    breakdown: r.breakdown,
  }));
}

/* ── 추천 이유 생성 ── */
function genMatchReason(myPersona, matchedPersona, breakdown) {
  const myStrengths   = myPersona.strengths.slice(0, 2).join(', ');
  const theirStrengths = matchedPersona.strengths.slice(0, 2).join(', ');
  return `당신은 ${myStrengths}이 강합니다. ` +
    `반면 추천된 Persona는 ${theirStrengths}이 강하기 때문에 ` +
    `함께 협업하면 팀 밸런스가 좋아질 것으로 예상됩니다.`;
}

export default function OnboardingResult() {
  const navigate     = useNavigate();
  const isEntered    = useGroupStore(s => s.isEntered);
  const isLoading    = useGroupStore(s => s.isLoading);   // Firebase 로딩 대기
  const dominantType = useUserStore(s => s.dominantType);
  const typeRatio    = useUserStore(s => s.typeRatio);
  const name         = useUserStore(s => s.name);
  const groupCode    = useGroupStore(s => s.groupCode);

  // ★ 성향검사 완료 후 → 홈으로 이동 (Home 기반 추천 시스템 사용)
  const handleGoToHome = () => navigate('/group-home');

  useEffect(() => {
    // Firebase hydration 완료 전 isLoading=true 동안은 redirect 하지 않음
    if (isLoading) return;
    if (!isEntered) navigate('/', { replace: true });
    else if (!dominantType) navigate('/onboarding/name', { replace: true });
  }, [isEntered, dominantType, isLoading]); // navigate 제거 — 참조 변경으로 루프 방지

  // Firebase 로딩 중이면 대기 (빈 화면 대신 로딩 표시)
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs text-gray-400">데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  if (!dominantType) return null;

  const type        = TYPES[dominantType];
  const sortedRatio = Object.entries(typeRatio).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>0);

  // ── Persona 계산 ──────────────────────────────────────────
  const myPersona = useMemo(() => buildPersona(typeRatio), [typeRatio]);

  // ── 잘 맞는 Persona (AI 추천 로직 사용) ──────────────────
  // ── ⓘ Bottom Sheet 상태 ─
  const [showPersonaInfo, setShowPersonaInfo] = useState(false);
  const [showCompatInfo,  setShowCompatInfo]  = useState(false);

  const asUser = useUserStore(s => s.asUser);
  const me = asUser(groupCode);
  const matchedPersonas = useMemo(() => {
    if (!me) return [];
    return calcMatchedPersonas(me, myPersona.key);
  }, [myPersona.key]);

  return (
    <>
    <div className="min-h-screen flex flex-col"
      style={{ background:`linear-gradient(160deg, ${type.bg} 0%, #EFF6FF 60%, #F5F3FF 100%)` }}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-8 pb-6">

        {/* 완료 헤더 */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color:type.color }}>
            협업 스타일 분석 완료
          </p>
          <p className="text-sm text-gray-400">{name}님의 TeamFit Persona가 생성됐어요</p>
        </div>

        {/* ── 나의 Persona 카드 ── */}
        <div className="bg-white rounded-3xl p-5 shadow-sm mb-2.5 border border-gray-50">
          {/* 나의 Persona 레이블 + ⓘ */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              나의 Persona
            </p>
            <button
              onClick={() => setShowPersonaInfo(true)}
              className="w-4 h-4 rounded-full border border-gray-300 flex items-center
                justify-center text-[9px] text-gray-400 hover:border-gray-500
                hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="Persona 설명 보기">
              ⓘ
            </button>
          </div>
          <div className="text-center mb-3">
            <div className="text-5xl mb-2">{myPersona.emoji}</div>
            <h1 className="text-2xl font-black text-gray-900 mb-0.5">{myPersona.name}</h1>
            <p className="text-xs text-gray-400 mb-3">{myPersona.en}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{myPersona.desc}</p>
          </div>
        </div>

        {/* ── 나의 강점 ── */}
        <div className="bg-white rounded-3xl p-4 shadow-sm mb-2.5 border border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            💪 나의 강점
          </p>
          <div className="grid grid-cols-2 gap-2">
            {myPersona.strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-bold" style={{ color:type.color }}>✔</span>
                <span className="text-xs text-gray-700 font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 성향 비율 ── */}
        <div className="bg-white rounded-3xl p-4 shadow-sm mb-2.5 border border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">나의 성향 비율</p>
          <div className="space-y-2">
            {sortedRatio.map(([key, value], i) => (
              <RatioBar key={key} typeKey={key} value={value} delay={200 + i*100}/>
            ))}
          </div>
        </div>

        {/* ── 협업 팁 ── */}
        <div className="rounded-2xl p-3.5 mb-2.5"
          style={{ backgroundColor:type.color+'12', border:`1.5px solid ${type.color}20` }}>
          <p className="text-xs font-bold mb-1" style={{ color:type.color }}>💡 협업 팁</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            {myPersona.type === 'balanced'
              ? '다양한 역할을 소화할 수 있는 강점을 활용해 팀의 빈 역할을 채워주세요.'
              : myPersona.type === 'dual'
              ? '두 가지 강점을 상황에 맞게 활용하되, 약한 영역은 팀원에게 위임하는 것이 효과적이에요.'
              : '자신의 핵심 강점에 집중하면서 다른 성향의 팀원과 역할을 나누면 최고의 팀이 됩니다.'}
          </p>
        </div>

        {/* ── 잘 맞는 Persona ── */}
        {matchedPersonas.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm mb-2.5 border border-gray-50">
            {/* 잘 맞는 Persona 헤더 + ⓘ */}
            <div className="flex items-center gap-1.5 mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                🤝 잘 맞는 Persona
              </p>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[9px] text-gray-400">AI 궁합 산정 기준</span>
                <button
                  onClick={() => setShowCompatInfo(true)}
                  className="w-4 h-4 rounded-full border border-gray-300 flex items-center
                    justify-center text-[9px] text-gray-400 hover:border-gray-500
                    hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="AI 궁합 계산 기준 보기">
                  ⓘ
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {matchedPersonas.map(({ persona, score, breakdown }, i) => (
                <div key={i} className="rounded-2xl p-3 bg-gray-50 border border-gray-100">
                  {/* Persona + 점수 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{persona.emoji}</span>
                      <div>
                        <p className="text-sm font-black text-gray-900">{persona.name}</p>
                        <p className="text-[10px] text-gray-400">{persona.en}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black" style={{ color:'#10B981' }}>{score}%</p>
                      <p className="text-[9px] text-gray-400">궁합</p>
                    </div>
                  </div>
                  {/* 추천 이유 */}
                  <p className="text-[11px] text-gray-500 leading-relaxed bg-white rounded-xl px-2.5 py-2">
                    {genMatchReason(myPersona, persona, breakdown)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <p className="text-center text-xs text-gray-400 mb-3">
            홈에서 팀원 찾기, 팀원 보충, 팀 밸런스 분석을 이용할 수 있어요
          </p>
          <button
            onClick={handleGoToHome}
            className="w-full py-4 rounded-2xl font-bold text-base text-white
              hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            style={{ background:'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}>
            팀원 추천 받기 →
          </button>
        </div>

      </div>
    </div>

      {/* ⓘ Bottom Sheets */}
      {showPersonaInfo && <PersonaInfoSheet onClose={() => setShowPersonaInfo(false)}/>}
      {showCompatInfo  && <CompatInfoSheet  onClose={() => setShowCompatInfo(false)}/>}
    </>
  );
}
