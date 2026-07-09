/**
 * FindTeammate — 나와 맞는 팀원 찾기 (개인 매칭 전용)
 *
 * 목적: "나와 가장 잘 맞는 사람"을 찾는 화면
 *   - 팀원 보충(팀 최적화)과 완전히 구분
 *   - Persona 중심 표시
 *   - 탭별 핵심 정보 차별화
 *   - 카드 클릭 시 Bottom Sheet 상세보기
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';
import { TYPES }     from '../data/questions';
import { buildTabRecommendations, getMatchLabel, calcLackingTypes } from '../utils/balanceScoring';
import { buildPersona, getAllPersonas, getPersonaRatio } from '../utils/persona';
import { TabIconAI, TabIconSimilar, TabIconDomain } from '../components/ui/PuzzleCharacters';

/* ── 탭 정의 ── */
const TABS = [
  { id:'ai',      Icon:TabIconAI,      label:'AI 추천',    accent:'#10B981' },
  { id:'similar', Icon:TabIconSimilar, label:'비슷한 성향', accent:'#4F6EF7' },
  { id:'domain',  Icon:TabIconDomain,  label:'같은 도메인', accent:'#8B5CF6' },
];

/* ── 탭별 강조 색상 ── */
const TAB_ACCENT = { ai:'#10B981', similar:'#4F6EF7', domain:'#8B5CF6' };

/* ── Persona 빌드 헬퍼 ── */
function getUserPersona(user) {
  return buildPersona(user.typeRatio || {});
}

/* ── AI 추천 이유 목록 ── */
function genAIReasons(rec, tab) {
  const { score, breakdown: bd } = rec;
  const reasons = [];
  if (tab === 'ai') {
    // Persona 궁합: 내 잘 맞는 Persona 목록 포함 여부 기준
    if (bd?.isPersonaMatch)         reasons.push('Persona 궁합 우수');
    // 성향 유사도: Persona 궁합이 아닌 순수 유사도 기준
    else if ((bd?.styleSim || 0) >= 60) reasons.push('성향 유사도 높음');
    if ((bd?.domainCount || 0) >= 1) reasons.push(`${bd.commonDomains?.[0] || ''} 도메인 일치`.trim());
    if (bd?.prioMatch)              reasons.push('팀 선호 스타일 일치');
  }
  if (tab === 'similar') {
    if ((bd?.styleSim || 0) >= 70) reasons.push('협업 스타일 매우 유사');
    if ((bd?.styleSim || 0) >= 50) reasons.push('의사결정 방식 비슷');
    if ((bd?.domainCount || 0) >= 1) reasons.push('관심 도메인 일치');
  }
  if (tab === 'domain') {
    if ((bd?.domainCount || 0) >= 3) reasons.push('공통 관심 도메인 다수');
    if ((bd?.domainCount || 0) >= 1) reasons.push('프로젝트 방향성 일치 가능');
    if ((bd?.styleSim || 0) >= 50)   reasons.push('협업 스타일도 잘 맞음');
  }
  return reasons.slice(0, 3);
}

/* ── 잘 맞는 이유 생성 ── */
function genWhyGood(me, user, bd) {
  const commonDomains = bd?.commonDomains || [];
  const lines = [];
  if ((bd?.styleSim || 0) >= 60) {
    lines.push(`두 사람 모두 비슷한 방식으로 협업하며 자연스럽게 호흡을 맞출 수 있습니다.`);
  } else {
    lines.push(`서로 다른 협업 스타일로 상호 보완적인 팀을 이룰 수 있습니다.`);
  }
  if (commonDomains.length > 0) {
    lines.push(`${commonDomains.slice(0,2).join(', ')} 분야에 공통 관심이 있어 프로젝트 방향을 함께 발전시키기 좋습니다.`);
  }
  if (bd?.prioMatch) {
    lines.push(`프로젝트 우선순위가 일치해 의사결정이 빠르게 이루어질 수 있습니다.`);
  }
  return lines.slice(0, 2).join(' ');
}

/* ── 기대 효과 목록 ── */
function genExpectedEffects(bd) {
  const effects = [];
  if ((bd?.styleSim || 0) >= 60) effects.push('커뮤니케이션 비용 감소');
  if (bd?.prioMatch)              effects.push('의사결정 효율 향상');
  if ((bd?.domainCount || 0) >= 1) effects.push('프로젝트 방향성 일치');
  effects.push('아이디어 확장 가능');
  return effects.slice(0, 4);
}

/* ── Persona 궁합 점수 계산 ──────────────────────────────
 * me의 matchedPersonas 키 목록을 미리 계산하고,
 * 후보 Persona가 목록에 포함되면 100점, 아니면 0점 반환.
 * OnboardingResult.calcMatchedPersonas와 동일 로직 사용.
 */
function calcPersonaCompatScore(meObj, candidatePersonaKey, myPersonaKey) {
  if (!meObj || !candidatePersonaKey) return 0;
  const all = getAllPersonas().filter(p => p.key !== myPersonaKey);
  const cands = all.map(p => ({
    id:          `persona_${p.key}`,
    name:        p.name,
    groupCode:   meObj.groupCode,
    projectCode: meObj.projectCode,
    dominantType: Object.entries(getPersonaRatio(p.key)).sort((a,b)=>b[1]-a[1])[0][0],
    typeRatio:   getPersonaRatio(p.key),
    rawAnswerVector: meObj.rawAnswerVector || [],
    domains:     meObj.domains || [],
    priority:    meObj.priority || '',
    _personaKey: p.key,
  }));
  // buildTabRecommendations import 필요 (이미 있음)
  const recs = buildTabRecommendations('ai', meObj, cands, []);
  const top2Keys = new Set(recs.slice(0, 2).map(r => r.user._personaKey));
  return top2Keys.has(candidatePersonaKey) ? 100 : 0;
}

/* ══════════════════════════════════════════════
   추천 카드 (탭별 핵심 정보 차별화)
══════════════════════════════════════════════ */
function RecommendCard({ rec, rank, tab, onOpen }) {
  const { user, score, breakdown: bd } = rec;
  const persona       = getUserPersona(user);
  const accent        = TAB_ACCENT[tab];
  const commonDomains = bd?.commonDomains || [];
  const reasons       = genAIReasons(rec, tab);
  const TCOLS         = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  const tColor        = TCOLS[persona.key?.[0]] || TCOLS[user.dominantType] || '#CBD5E1';

  return (
    <button
      className="w-full bg-white rounded-2xl p-4 border-2 border-gray-50 shadow-sm
        text-left active:scale-[0.99] transition-transform cursor-pointer"
      onClick={() => onOpen(rec)}>
      <div className="flex items-center gap-3">
        {/* 순위 + 아바타 */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-[10px] font-black text-gray-400">{rank}</span>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center
            text-lg font-black text-white" style={{ backgroundColor: tColor }}>
            {user.name[0]}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* 이름 + Persona */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-black text-sm text-gray-900">{user.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">
              {persona.emoji} {persona.name}
            </span>
            <span className="ml-auto text-[10px] text-gray-300 flex items-center gap-0.5">
              상세
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </span>
          </div>

          {/* ── 탭 공통 핵심 지표: 매칭 적합도 (3개 탭 모두 동일 지표·동일 레이아웃) ── */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gray-500 flex-shrink-0">매칭 적합도</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width:`${score}%`, backgroundColor: accent }}/>
            </div>
            <span className="text-xs font-black flex-shrink-0" style={{ color: accent }}>
              {score}%
            </span>
          </div>

          {/* 같은 도메인 탭 전용 보조 배지 — 매칭 적합도를 보완하는 근거 정보 */}
          {tab === 'domain' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }}/>
              <span className="text-[10px] text-gray-500 flex-shrink-0">공통 도메인</span>
              {commonDomains.slice(0,3).map(d => (
                <span key={d} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{ color: accent, borderColor: accent+'40', backgroundColor: accent+'0D' }}>
                  {d}
                </span>
              ))}
              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: accent }}>
                {commonDomains.length}개 일치
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════
   Bottom Sheet 상세보기
══════════════════════════════════════════════ */
function DetailSheet({ rec, me, tab, onClose }) {
  const { user, score, breakdown: bd } = rec;
  const persona       = getUserPersona(user);
  const myPersona     = getUserPersona(me);
  const label         = getMatchLabel(score);
  const accent        = TAB_ACCENT[tab];
  const TCOLS         = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  const tColor        = TCOLS[persona.key?.[0]] || TCOLS[user.dominantType] || '#CBD5E1';
  const commonDomains = bd?.commonDomains || [];
  const whyGood       = genWhyGood(me, user, bd);
  const effects       = genExpectedEffects(bd);

  // ── 탭별 산출 근거 제목 ──────────────────────────────────
  const SECTION_TITLE = {
    ai:      'AI 추천 산출 근거',
    similar: '비슷한 성향 산출 근거',
    domain:  '같은 도메인 산출 근거',
    balance: '팀 기여도 산출 근거',
  };
  const sectionTitle = SECTION_TITLE[tab] || 'AI 추천 산출 근거';

  // ── 탭별 실제 가중치 (buildTabRecommendations와 완전히 동일) ──
  // ai탭은 FindTeammate 전용 개인 매칭 가중치 사용 (balanceImp 제거)
  const TAB_WEIGHTS = {
    ai:      { style:0.40, domain:0.30, prio:0.20, balance:0.10 },  // ★ 개인 매칭 전용 (balance=Persona궁합)
    similar: { style:0.70, domain:0.20, prio:0.10, balance:0    },
    domain:  { style:0.20, domain:0.70, prio:0.10, balance:0    },
    balance: { style:0.20, domain:0.20, prio:0,    balance:0.60 },
  };
  const W = TAB_WEIGHTS[tab] || TAB_WEIGHTS.ai;

  // ── raw 원점수 (breakdown에서 직접 사용) ──────────────────
  const rawStyle   = bd?.styleSim    || 0;  // 0~100
  const rawDomain  = bd?.domainPct   || 0;  // 0~100
  const rawPrio    = bd?.prioPct ?? bd?.prioRate ?? 0;   // 0~100
  const rawBalance = bd?.balanceImp  || 0;  // 0~100

  // ── 탭별 항목 구성 (가중치 0인 항목 제외) ────────────────
  const ALL_ITEMS = [
    {
      label:  '성향 유사도',
      raw:    rawStyle,
      weight: W.style,
      color:  '#4F6EF7',
      detail: `성향 유사도 ${rawStyle}% × ${Math.round(W.style*100)}% 가중치`,
    },
    {
      label:  '관심 도메인',
      raw:    rawDomain,
      weight: W.domain,
      color:  '#8B5CF6',
      detail: `공통 도메인 ${commonDomains.length}개 일치`,
    },
    {
      label:  '팀 선호 스타일',
      raw:    rawPrio,
      weight: W.prio,
      color:  '#10B981',
      detail: `협업 우선순위 ${bd?.prioMatch ? '일치' : '유사'}`,
    },
    {
      label:  tab === 'ai' ? '잘 맞는 Persona' : '팀 밸런스 기여',
      raw:    tab === 'ai' ? (bd?.personaCompat || 0) : rawBalance,
      weight: W.balance,
      color:  '#F59E0B',
      detail: tab === 'ai'
        ? (bd?.isPersonaMatch
          ? `후보의 Persona(${buildPersona(user.typeRatio||{}).name})가 내 잘 맞는 Persona 목록에 포함됩니다.`
          : `후보의 Persona가 내 잘 맞는 Persona 목록에 포함되지 않습니다.`)
        : '팀 밸런스 개선 효과',
    },
  ].filter(item => item.weight > 0)
   .map(item => ({
     ...item,
     // 기여 점수 = raw × weight (buildTabRecommendations와 동일 공식)
     score: Math.round(item.raw * item.weight),
     max:   Math.round(item.weight * 100),
   }));

  // ── 합계 검증: SCORE_ITEMS 합산이 rec.score와 ±1 이내여야 함 ──
  const itemsTotal = ALL_ITEMS.reduce((s, it) => s + it.score, 0);
  // score는 rec.score를 그대로 사용 (재계산 없음)

  // AI 추천 이유 (✔ 체크리스트)
  const aiReasons = [];
  if (rawStyle >= 70)             aiReasons.push('성향 유사도가 매우 높습니다.');
  else if (rawStyle >= 50)        aiReasons.push('협업 스타일이 잘 맞습니다.');
  if (commonDomains.length >= 2)  aiReasons.push(`${commonDomains.slice(0,2).join(', ')} 도메인이 일치합니다.`);
  else if (commonDomains.length === 1) aiReasons.push(`${commonDomains[0]} 도메인이 일치합니다.`);
  if (bd?.prioMatch)              aiReasons.push('팀 선호 스타일이 일치합니다.');
  if (aiReasons.length < 2)       aiReasons.push('종합적인 매칭 점수가 높습니다.');

  return (
    <>
      {/* 딤 */}
      <div className="fixed inset-0 z-40 bg-black/40" style={{ backdropFilter:'blur(2px)' }}
        onClick={onClose}/>

      {/* 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-sm mx-auto"
        style={{ animation:'sheetUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`@keyframes sheetUp { from { transform:translateY(100%); opacity:0.6; } to { transform:translateY(0); opacity:1; } }`}</style>
        <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl"
          style={{ maxHeight:'90vh', overflowY:'auto' }}>

          {/* 핸들 */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"/>

          {/* ─ 헤더: 프로필 + 매칭 적합도 ─ */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center
              text-xl font-black text-white flex-shrink-0"
              style={{ backgroundColor: tColor }}>
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-gray-900">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">
                  {persona.emoji} {persona.name}
                </span>
                <span className="text-[10px] text-gray-400">{persona.en}</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {(user.domains||[]).join(' · ') || '도메인 없음'}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* 매칭 적합도 히어로 */}
          <div className="rounded-2xl p-4 mb-4 text-center"
            style={{ background:`linear-gradient(135deg,${label.color}18 0%,${label.color}08 100%)`,
              border:`1.5px solid ${label.color}30` }}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              매칭 적합도
            </p>
            <p className="text-5xl font-black leading-none mb-1" style={{ color:label.color }}>
              {score}%
            </p>
            <p className="text-xs font-bold" style={{ color:label.color }}>{label.label}</p>
          </div>

          {/* ─ AI 추천 이유 ─ */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              AI 추천 이유
            </p>
            <div className="space-y-1.5">
              {aiReasons.map((r,i) => (
                <div key={i} className="flex items-center gap-2 bg-emerald-50
                  rounded-xl px-3 py-2 border border-emerald-100">
                  <span className="text-emerald-500 font-black text-xs flex-shrink-0">✔</span>
                  <span className="text-xs font-semibold text-emerald-800">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─ 점수 산출 근거 ─ */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {sectionTitle}
            </p>
            <div className="bg-gray-50 rounded-2xl p-3 space-y-2.5">
              {ALL_ITEMS.map(item => (
                <div key={item.label}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-gray-600 w-20 flex-shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width:`${Math.min(100,(item.score/item.max)*100)}%`,
                          backgroundColor:item.color }}/>
                    </div>
                    <span className="text-xs font-black flex-shrink-0 w-10 text-right"
                      style={{ color:item.color }}>
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 pl-20">{item.detail}</p>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                <span className="text-xs font-black text-gray-600">최종 매칭 적합도</span>
                <span className="text-sm font-black" style={{ color:label.color }}>{score}%</span>
              </div>
            </div>
          </div>

          {/* ─ 공통 관심 도메인 ─ */}
          {commonDomains.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                공통 관심 도메인
              </p>
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex flex-wrap gap-2">
                  {commonDomains.map(d => (
                    <div key={d} className="flex items-center gap-1.5 bg-white
                      px-3 py-1.5 rounded-xl border border-gray-100">
                      <span className="text-emerald-500 text-xs font-black">✔</span>
                      <span className="text-xs font-semibold text-gray-700">{d}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {commonDomains.length}개 일치 · 전체 {(user.domains||[]).length}개 중
                </p>
              </div>
            </div>
          )}

          {/* ─ 잘 맞는 이유 ─ */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              잘 맞는 이유
            </p>
            <div className="rounded-2xl px-4 py-3 border border-blue-100 bg-blue-50">
              <p className="text-xs text-blue-800 leading-relaxed">{whyGood}</p>
            </div>
          </div>

          {/* ─ 함께하면 기대 효과 ─ */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              함께하면 기대 효과
            </p>
            <div className="grid grid-cols-2 gap-2">
              {effects.map((e,i) => (
                <div key={i} className="flex items-center gap-1.5 bg-gray-50
                  rounded-xl px-3 py-2 border border-gray-100">
                  <span className="text-emerald-400 font-black text-xs">✔</span>
                  <span className="text-xs font-medium text-gray-700">{e}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════════════ */
export default function FindTeammate() {
  const navigate    = useNavigate();
  const groupCode   = useGroupStore(s => s.groupCode);
  const isEntered   = useGroupStore(s => s.isEntered);
  const isLoading   = useGroupStore(s => s.isLoading);
  const rawMembers  = useGroupStore(s => s.members);
  const currentName = useGroupStore(s => s.currentName);

  const uName  = useUserStore(s => s.name);
  const uDoms  = useUserStore(s => s.domains);
  const uType  = useUserStore(s => s.dominantType);
  const uRatio = useUserStore(s => s.typeRatio);
  const uVec   = useUserStore(s => s.rawAnswerVector);
  const uPrio  = useUserStore(s => s.priority);

  // Firebase 데이터 우선 사용 (페이지 리로드 후에도 유지)
  const myMemberRaw = rawMembers.find(m => m.name === currentName);
  const myMemberProfile = myMemberRaw ? (() => {
    const p = myMemberRaw.profile || {}, sc = p.scores || {};
    return {
      typeRatio:       { A:sc.추진||0, B:sc.소통||0, C:sc.탐구||0, D:sc.실행||0 },
      rawAnswerVector: p.rawAnswerVector || [],
      domains:         p.domains || [],
      priority:        p.priority || '',
      dominantType:    p.typeKey || uType,
    };
  })() : null;

  const frTotal = Object.values(myMemberProfile?.typeRatio||{}).reduce((s,v)=>s+v,0);
  const meTypeRatio = frTotal > 0 ? myMemberProfile.typeRatio : uRatio;
  const meDomains   = myMemberProfile?.domains?.length ? myMemberProfile.domains : uDoms;
  const mePriority  = myMemberProfile?.priority || uPrio;
  const meVec       = myMemberProfile?.rawAnswerVector?.length ? myMemberProfile.rawAnswerVector : uVec;
  const meType      = myMemberProfile?.dominantType || uType;

  const me = {
    id:`${groupCode}_${uName}`, name:uName,
    groupCode, projectCode:groupCode,
    dominantType: meType,
    typeRatio:    meTypeRatio,
    rawAnswerVector: meVec,
    domains:  meDomains,
    priority: mePriority,
  };

  const [tab,     setTab]     = useState('ai');
  const [visible, setVisible] = useState(true);
  const [detail,  setDetail]  = useState(null); // Bottom Sheet 대상 rec

  useEffect(() => { if (!isLoading && !isEntered) navigate('/'); }, [isEntered, isLoading]);

  // 나 자신 제외한 전체 멤버 → scoring 포맷
  const allMembers = rawMembers
    .map(m => {
      const p = m.profile||{}, sc = p.scores||{};
      return {
        id:m.id, name:m.name,
        groupCode, projectCode:groupCode,
        dominantType: p.typeKey||'A',
        typeRatio: { A:sc.추진||0, B:sc.소통||0, C:sc.탐구||0, D:sc.실행||0 },
        rawAnswerVector: p.rawAnswerVector||[],
        domains: p.domains||[],
        priority: p.priority||'',
      };
    })
    .filter(m => m.name !== currentName);

  // ── 탭별 추천 계산 ───────────────────────────────────────
  // ai탭: 개인 매칭 전용 가중치 (balanceImp 제거)
  //   성향 유사도 40% + 관심 도메인 30% + 팀 선호 스타일 30%
  // similar/domain탭: buildTabRecommendations 그대로 사용
  let sorted;
  if (tab === 'ai') {
    // 개인 매칭 가중치: 성향40 + 도메인30 + 스타일20 + Persona궁합10
    const myPersonaKey = buildPersona(meTypeRatio || {}).key;
    const base = buildTabRecommendations('ai', me, allMembers, []);
    sorted = base
      .map(r => {
        const bd  = r.breakdown;
        const candidatePersona = buildPersona(r.user.typeRatio || {});
        const personaCompat = calcPersonaCompatScore(me, candidatePersona.key, myPersonaKey);
        const s = Math.round(
          (bd.styleSim || 0) * 0.40 +
          (bd.domainPct || 0) * 0.30 +
          (bd.prioPct ?? bd.prioRate ?? 0) * 0.20 +
          personaCompat * 0.10
        );
        return { ...r, score: s,
          breakdown: { ...bd, personaCompat, candidatePersonaKey: candidatePersona.key,
            isPersonaMatch: personaCompat >= 100 } };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } else {
    sorted = buildTabRecommendations(tab, me, allMembers, []);
  }

  const handleTabChange = (id) => {
    if (id === tab) return;
    setVisible(false);
    setTimeout(() => { setTab(id); setVisible(true); }, 180);
  };

  const TAB_DESC = {
    ai:     '성향 · 협업 스타일 · 관심 도메인을 종합하여 가장 적합한 팀원을 추천합니다.',
    similar:'협업 성향 유사도를 가장 높은 비중으로 반영하여 추천하며, 관심 도메인과 팀 선호 스타일도 함께 고려해 최종 매칭 적합도 순으로 제공합니다.',
    domain: '공통 관심 도메인을 가장 높은 비중으로 반영하여 함께 성장하기 좋은 팀원을 추천합니다.',
  };

  return (
    <>
      <div className="min-h-screen"
        style={{ background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)' }}>

        {/* 헤더 */}
        <div className="max-w-md mx-auto px-5 pt-6 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/group-home')}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">
                나와 맞는 팀원 찾기
              </p>
              <p className="text-base font-black text-gray-900">AI 팀원 추천</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100
              px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
              <span className="text-[10px] font-black text-gray-700">{groupCode}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 max-w-md mx-auto space-y-3">

          {/* 안내 카드 */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-blue-700 mb-0.5">개인 맞춤 추천</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              나와 가장 잘 맞는 팀원을 추천합니다.
            </p>
          </div>

          {/* 추천 카드 섹션 */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
            <p className="text-sm font-black text-gray-900 mb-1">추천 기준 선택</p>

            {/* 탭 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {TABS.map(tb => (
                <button key={tb.id} onClick={() => handleTabChange(tb.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl
                    text-xs font-semibold transition-all duration-200 ${
                    tab === tb.id
                      ? 'text-white shadow-sm'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                  style={tab === tb.id ? { background:`linear-gradient(135deg,#10B981,#3B82F6)` } : {}}>
                  <tb.Icon size={18}/>
                  <span>{tb.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-3">{TAB_DESC[tab]}</p>

            {/* 카드 목록 */}
            <div style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 0.18s ease, transform 0.18s ease',
            }}>
              {sorted.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <div className="text-3xl mb-3">🧩</div>
                  <p className="text-sm font-bold text-gray-700 mb-1">추천할 멤버가 없어요</p>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    아직 성향 검사를 완료한 그룹원이 부족해요.<br/>
                    초대 링크를 공유해 팀원을 초대해보세요.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `${window.location.origin}/group/join/${groupCode}`
                      ).catch(()=>{});
                      alert('초대 링크가 복사됐어요!');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                      bg-emerald-50 text-emerald-700 border border-emerald-200
                      text-sm font-semibold hover:bg-emerald-100 active:scale-[0.98] transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    초대 링크 복사하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sorted.map((rec, i) => (
                    <RecommendCard
                      key={rec.user.id || i}
                      rec={rec}
                      rank={`${i+1}위`}
                      tab={tab}
                      onOpen={setDetail}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={() => navigate('/group-home')}
            className="w-full py-3.5 text-sm text-gray-400 hover:text-gray-600
              transition-colors text-center">
            그룹 홈으로 돌아가기
          </button>
        </div>
      </div>

      {/* Bottom Sheet */}
      {detail && (
        <DetailSheet
          rec={detail}
          me={me}
          tab={tab}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
