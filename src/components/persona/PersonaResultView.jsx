/**
 * PersonaResultView — Persona 분석 결과 화면 (공용 컴포넌트)
 *
 * OnboardingResult(성향검사 완료 직후)와 ProfileResult(내 프로필 보기)가
 * 동일한 컴포넌트/동일한 데이터 구조를 공유하기 위해 분리됨.
 * header/footer만 페이지별로 다르게 주입한다.
 */
import { useState, useEffect, useMemo } from 'react';
import { TYPES } from '../../data/questions';
import { buildTabRecommendations, withI } from '../../utils/balanceScoring';
import { buildPersona, getAllPersonas, getPersonaRatio } from '../../utils/persona';

/* ── Persona 목록 표시용 카테고리 정의 (buildPersona()의 판정 기준과 동일) ── */
const PERSONA_CATEGORIES = [
  { type:'single',   label:'단일 성향형', rule:'1위 성향이 40% 이상이면서 2위와 10%p 이상 차이 날 때 부여됩니다.' },
  { type:'dual',     label:'조합형',      rule:'1위와 2위 성향의 차이가 5%p 이하일 때 부여됩니다.' },
  { type:'balanced', label:'균형형',      rule:'0%보다 큰 성향이 3개 이상이고, 최댓값과 최솟값의 차이가 15%p 미만일 때 부여됩니다.' },
];

/* ══ ⓘ Bottom Sheet: Persona 생성 기준 ══════════════════ */
function PersonaInfoSheet({ onClose, persona }) {
  const allPersonas = getAllPersonas();
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
        style={{ animation:'sheetUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl"
          style={{ maxHeight:'85vh', overflowY:'auto' }}>
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
            10문항 결과를 합산해 네 성향의 비율을 계산한 뒤, 아래 기준에 따라 총 11가지 Persona 중 하나가 결정됩니다.
          </p>
          <div className="space-y-4">
            {PERSONA_CATEGORIES.map(cat => (
              <div key={cat.type}>
                <p className="text-xs font-black text-gray-700 mb-1">{cat.label}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-2">{cat.rule}</p>
                <div className="space-y-1.5">
                  {allPersonas.filter(p => p.type === cat.type).map(p => {
                    const isMine = p.key === persona.key;
                    return (
                      <div key={p.key}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                          isMine ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-transparent'
                        }`}>
                        <span className="text-base flex-shrink-0">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold ${isMine ? 'text-emerald-700' : 'text-gray-700'}`}>
                            {p.name} <span className="text-[10px] font-normal text-gray-400">{p.en}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{p.strengths.slice(0,2).join(' · ')}</p>
                        </div>
                        {isMine && (
                          <span className="text-[9px] font-black text-emerald-500 flex-shrink-0">✔ 나의 Persona</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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

/* ══ ⓘ Bottom Sheet: 잘 맞는 Persona 선정 기준 ═══════════════ */
function MatchedPersonaInfoSheet({ onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
        style={{ animation:'sheetUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl"
          style={{ maxHeight:'85vh', overflowY:'auto' }}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
          <p className="text-base font-black text-gray-900 mb-4">
            잘 맞는 Persona는 어떻게 선정되나요?
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            잘 맞는 Persona는 내 성향 비율과 팀 선호 스타일을 기준으로,
            함께 협업했을 때 시너지가 날 가능성이 높은 Persona를 추천한 결과입니다.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            내가 강하게 가진 성향과 보완이 필요한 성향을 함께 고려하여
            협업 방식이 잘 맞거나 서로의 부족한 부분을 채워줄 수 있는 Persona를 우선 추천합니다.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            이 결과는 실제 팀원 추천 시 Persona 궁합을 판단하는 참고 기준으로 사용됩니다.
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
  return `당신은 ${withI(myStrengths)} 강합니다. ` +
    `반면 추천된 Persona는 ${withI(theirStrengths)} 강하기 때문에 ` +
    `함께 협업하면 팀 밸런스가 좋아질 것으로 예상됩니다.`;
}

export default function PersonaResultView({
  name, typeRatio, dominantType,
  domains = [], priority = '', rawAnswerVector = [],
  header, footer,
}) {
  const type        = TYPES[dominantType] || TYPES.A;
  const sortedRatio  = Object.entries(typeRatio).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>0);

  const myPersona = useMemo(() => buildPersona(typeRatio), [typeRatio]);

  const [showPersonaInfo, setShowPersonaInfo] = useState(false);
  const [showCompatInfo,  setShowCompatInfo]  = useState(false);

  const me = { name, groupCode:'', projectCode:'', dominantType, typeRatio, rawAnswerVector, domains, priority };
  const matchedPersonas = useMemo(() => {
    return calcMatchedPersonas(me, myPersona.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPersona.key]);

  return (
    <>
    <div className="min-h-screen flex flex-col"
      style={{ background:`linear-gradient(160deg, ${type.bg} 0%, #EFF6FF 60%, #F5F3FF 100%)` }}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-8 pb-6">

        {/* 헤더 */}
        {header !== undefined ? header : (
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color:type.color }}>
              협업 스타일 분석 완료
            </p>
            <p className="text-sm text-gray-400">{name}님의 TeamFit Persona가 생성됐어요</p>
          </div>
        )}

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
              <button
                onClick={() => setShowCompatInfo(true)}
                className="w-4 h-4 rounded-full border border-gray-300 flex items-center
                  justify-center text-[9px] text-gray-400 hover:border-gray-500
                  hover:text-gray-600 transition-colors flex-shrink-0 ml-auto"
                aria-label="Persona 선정 기준 보기">
                ⓘ
              </button>
            </div>
            <div className="space-y-3">
              {matchedPersonas.map(({ persona, score, breakdown }, i) => (
                <div key={i} className="rounded-2xl p-3 bg-gray-50 border border-gray-100">
                  {/* Persona */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{persona.emoji}</span>
                    <div>
                      <p className="text-sm font-black text-gray-900">{persona.name}</p>
                      <p className="text-[10px] text-gray-400">{persona.en}</p>
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

        {/* CTA — 페이지별 주입 */}
        <div className="mt-auto pt-2">
          {footer}
        </div>

      </div>
    </div>

      {/* ⓘ Bottom Sheets */}
      {showPersonaInfo && <PersonaInfoSheet onClose={() => setShowPersonaInfo(false)} persona={myPersona}/>}
      {showCompatInfo  && <MatchedPersonaInfoSheet onClose={() => setShowCompatInfo(false)}/>}
    </>
  );
}
