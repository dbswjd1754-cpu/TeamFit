/**
 * SupplementResult — 팀원 보충 추천 결과
 * ① Team Balance Score Hero
 * ② 도넛 그래프 + 성향 분포
 * ③ AI 분석
 * ④ 부족한 성향 추천
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';
import { TYPES }     from '../data/questions';
import {
  calcTeamDistribution,
  calcTeamBalanceScore,
  calcTeamBalanceScoreBreakdown,
  calcLackingTypes,
  calcIdealRatio,
  sumRatios,
  buildTabRecommendations,
  makeTeamProfile,
  getTeamScoreLabel,
  getMatchLabel,
} from '../utils/balanceScoring';
import {
  TabIconAI, TabIconSimilar, TabIconDomain, TabIconBalance,
} from '../components/ui/PuzzleCharacters';
import { calcBreakdown, calcVectorSimilarity } from '../utils/scoring';

/* ══ 별점 컴포넌트 ════════════════════════════ */
function StarRating({ score }) {
  const stars = Math.round((score / 100) * 5);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="18" height="18" viewBox="0 0 24 24"
          fill={i <= stars ? '#F59E0B' : 'none'}
          stroke={i <= stars ? '#F59E0B' : '#D1D5DB'}
          strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

/* ══ 도넛 그래프 ══════════════════════════════ */
function DonutChart({ distribution, total, mostKey, actualRatio, animated: parentAnimated, leastKey }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if (!parentAnimated) return;
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, [parentAnimated]);

  const SIZE = 180, STROKE = 24, R = (SIZE - STROKE) / 2, CIRC = 2 * Math.PI * R;
  const COLORS = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  let offset = 0;
  // ★ actualRatio(typeRatio 기반)로 도넛 세그먼트 계산 — 퍼센트 표시와 동일 소스
  const segs = ['A','B','C','D'].map(k => {
    const pct = actualRatio ? (actualRatio[k]||0) : (total > 0 ? (distribution[k]||0)/total : 0);
    const len = animated && pct > 0 ? pct * CIRC : 0;
    const seg = { key:k, offset: CIRC - offset, len, color: COLORS[k] };
    offset += pct * CIRC;
    return seg;
  }).filter(s => s.len > 0);

  const isEmpty = segs.length === 0;
  // 주요 성향 표시용
  const mainType = mostKey ? TYPES[mostKey] : null;
  // ★ typeRatio 기반 비율 (actualRatio prop) — Balance Score와 동일 소스
  const mainPct = mostKey ? (actualRatio ? Math.round((actualRatio[mostKey]||0)*100) : total>0 ? Math.round(((distribution[mostKey]||0)/total)*100) : 0) : 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{width:SIZE, height:SIZE}}>
      <svg width={SIZE} height={SIZE} style={{transform:'rotate(-90deg)'}}>
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE}/>
        {isEmpty ? (
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#E5E7EB" strokeWidth={STROKE}/>
        ) : segs.map((s,i) => {
          return (
          <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.len} ${CIRC - s.len}`}
            strokeDashoffset={s.offset}
            style={{
              transition:'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1), stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
          );
        })}
      </svg>
      {/* 중앙: 주요 성향 (Team Balance Score 제거) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {mainType ? (
          <>
            <span className="text-2xl leading-none mb-0.5">{mainType.emoji}</span>
            <p className="text-[11px] font-black leading-tight text-center" style={{color: COLORS[mostKey]}}>
              {mainType.name}
            </p>
            {mainPct > 0 && (
              <p className="text-[10px] text-gray-400 mt-0.5">{mainPct}%</p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400">분석 중</p>
        )}
      </div>
    </div>
  );
}

/* ══ 점수 변화 바 ════════════════════════════ */
function ScoreBar({ label, score, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 300 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-black" style={{color}}>{score}점</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{width:`${width}%`, backgroundColor: color}}/>
      </div>
    </div>
  );
}

/* ══ 성향 타입 설명 ══════════════════════════ */
const TYPE_REASONS = {
  A: { why:'팀의 빠른 의사결정과 방향 설정을 이끌어줄 수 있어요.', benefit:'실행 속도 향상, 목표 명확화' },
  B: { why:'팀원 간 의견 조율과 갈등 완화로 협업을 부드럽게 해줘요.', benefit:'팀워크 향상, 소통 원활화' },
  C: { why:'데이터와 근거 기반 분석으로 의사결정 품질을 높여줄 수 있어요.', benefit:'리서치 강화, 검증 능력 향상' },
  D: { why:'아이디어를 빠르게 실물로 만들고 검증하는 사이클을 가속해줘요.', benefit:'구현 속도 향상, 빠른 검증' },
};

/* ══ calcLackingTypes, calcExpectedScore → balanceScoring.js 참조 ══ */


/* ══ 탭 정의 ══════════════════════════════════ */
const TABS = [
  { id: 'ai',      Icon: TabIconAI,      label: 'AI 추천',    desc: '성향 · 도메인 · 협업 스타일 · 팀 밸런스를 종합해 가장 적합한 팀원을 추천합니다.' },
  { id: 'similar', Icon: TabIconSimilar, label: '비슷한 성향', desc: '현재 팀과 협업 스타일이 가장 유사한 팀원을 추천합니다.' },
  { id: 'domain',  Icon: TabIconDomain,  label: '같은 도메인', desc: '관심 도메인이 가장 많이 일치하는 팀원을 추천합니다.' },
  { id: 'balance', Icon: TabIconBalance, label: '밸런스 우선', desc: '현재 팀에서 부족한 성향을 가장 잘 보완하는 팀원을 추천합니다.' },
];

/* ══ 팀 기여도 상세 바텀시트 ══════════════════════ */
function MatchDetailSheet({ rec, onClose, teamMembers }) {
  const { user, score: recScore, breakdown: bd } = rec;
  const TCOLS  = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  const KEYS   = ['A','B','C','D'];

  // ── 후보 성향 top2 ───────────────────────────
  const topTypes = Object.entries(user.typeRatio || {})
    .sort((a,b) => b[1]-a[1]).filter(([,v]) => v > 10).slice(0, 2);
  const dominantKey = topTypes[0]?.[0] || user.dominantType;
  const tColor = TCOLS[dominantKey] || '#CBD5E1';

  // ── 팀 성향 비율 (sumRatios와 동일 로직 — calcLackingTypes와 동일 소스) ─
  function getRatio(members) {
    const sum = { A:0, B:0, C:0, D:0 };
    members.forEach(m => KEYS.forEach(k => { sum[k] += (m.typeRatio?.[k] || 0); }));
    const tot = KEYS.reduce((s,k) => s+sum[k], 0) || 1;
    return Object.fromEntries(KEYS.map(k => [k, Math.round((sum[k]/tot)*100)]));
  }
  const ratioBefore = getRatio(teamMembers);
  const ratioAfter  = getRatio([...teamMembers, user]);

  // ── 부족 성향 (calcLackingTypes와 동일 기준 — 5% 임계값 적용) ──
  const lackingKeys = calcLackingTypes(teamMembers);
  const leastKey    = lackingKeys[0] || null;
  const leastType   = leastKey ? TYPES[leastKey] : null;

  // ── 팀 Balance Score 변화 ────────────────────
  const balanceBefore = calcTeamBalanceScore(teamMembers);
  const balanceAfter  = calcTeamBalanceScore([...teamMembers, user]);
  const balanceGain   = balanceAfter - balanceBefore;
  const beforeLabel   = getTeamScoreLabel(balanceBefore);
  const afterLabel    = getTeamScoreLabel(balanceAfter);

  // ── 항목별 breakdown (before / after) ────────
  const bdBefore = calcTeamBalanceScoreBreakdown(teamMembers);
  const bdAfter  = calcTeamBalanceScoreBreakdown([...teamMembers, user]);

  // ── 도메인 일치 ─────────────────────────────
  const teamDomains  = [...new Set(teamMembers.flatMap(m => m.domains || []))];
  const userDomains  = user.domains || [];
  const commonDomains = userDomains.filter(d => teamDomains.includes(d));

  // ── Team Contribution Score — 리스트와 항상 같은 숫자 ─────
  //    (탭마다 가중치가 다르므로 재계산하지 않고 리스트 점수를 그대로 사용)
  const balanceImp = bd?.balanceImp ?? 0;
  const domainPct  = bd?.domainPct  ?? 0;
  const styleSim   = bd?.styleSim   ?? 0;
  const prioPct_bd = bd?.prioPct ?? bd?.prioRate ?? 0;
  const weights    = bd?.weights ?? { style:0.40, domain:0.30, priority:0.20, balance:0.10 };
  const contributions = bd?.contributions ?? {
    style:    Math.round(styleSim   * weights.style),
    domain:   Math.round(domainPct  * weights.domain),
    priority: Math.round(prioPct_bd * weights.priority),
    balance:  Math.round(balanceImp * weights.balance),
  };
  const teamScore  = recScore ?? Math.round(
    styleSim   * weights.style +
    domainPct  * weights.domain +
    prioPct_bd * weights.priority +
    balanceImp * weights.balance
  );
  // 표시 전용 — 리스트와 동일한 소수점 한 자리 점수 (동점처럼 보이는 상황을 구분하기 위함, 정렬엔 영향 없음)
  const teamScoreExact = styleSim*weights.style + domainPct*weights.domain + prioPct_bd*weights.priority + balanceImp*weights.balance;
  const teamLabel  = getMatchLabel(teamScore);

  // ── 후보 부족 성향 보유율 ──────────────────
  const candidateLeastPct = leastKey ? Math.round(user.typeRatio?.[leastKey] || 0) : 0;
  const teamLeastPct      = leastKey ? (ratioBefore[leastKey] || 0) : 0;

  // ── AI 추천 이유 — 리스트 카드와 동일한 후보 개인별 근거를 그대로 사용 ──
  const reasons = (rec.aiSummary || '').split(' + ').filter(Boolean).slice(0, 4);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40"
        style={{ backdropFilter:'blur(2px)' }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-sm mx-auto"
        style={{ animation:'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0.6; }
            to   { transform: translateY(0);    opacity: 1;   }
          }
        `}</style>
        <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl"
          style={{ maxHeight:'90vh', overflowY:'auto' }}>

          {/* 핸들 */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

          {/* 헤더 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
              style={{ backgroundColor: tColor }}>
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                <p className="font-black text-base text-gray-900">{user.name}</p>
                {topTypes.map(([k]) => {
                  const t2=TYPES[k];
                  return t2 ? (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ color: TCOLS[k], backgroundColor: t2.bg }}>
                      {t2.emoji} {t2.name}
                    </span>
                  ) : null;
                })}
              </div>
              <p className="text-[10px] text-gray-400">{userDomains.join(' · ') || '도메인 정보 없음'}</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ① Team Contribution Score */}
          <div className="rounded-2xl p-4 mb-4 text-center"
            style={{ background:`linear-gradient(135deg,${teamLabel.color}18 0%,${teamLabel.color}08 100%)`,
              border:`1.5px solid ${teamLabel.color}30` }}>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              🏆 Team Contribution Score
            </p>
            <p className="text-5xl font-black leading-none mb-1" style={{ color: teamLabel.color }}>
              {teamScoreExact.toFixed(1)}
            </p>
            <p className="text-xs font-bold" style={{ color: teamLabel.color }}>{teamLabel.label}</p>
          </div>

          {/* ② 예상 Team Balance 변화 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
              예상 Team Balance 변화
            </p>
            <p className="text-[10px] text-gray-400 mb-3">AI가 계산하는 종합 점수 기준</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: beforeLabel.color }}>{balanceBefore}점</p>
                <p className="text-[10px] text-gray-400 mt-0.5">현재</p>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
                  <path d="M2 7H24M18 1L24 7L18 13"
                    stroke={balanceGain > 0 ? '#10B981' : '#CBD5E1'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {balanceGain !== 0 && (
                  <span className={`text-[10px] font-black ${balanceGain>0?'text-emerald-500':'text-gray-400'}`}>
                    {balanceGain>0?'+':''}{balanceGain}점
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-2xl font-black" style={{ color: afterLabel.color }}>{balanceAfter}점</p>
                <p className="text-[10px] text-gray-400 mt-0.5">합류 후</p>
              </div>
            </div>

            {/* 4항목 before→after */}
            <div className="space-y-1.5 pt-3 border-t border-gray-200">
              {[
                { label:'성향 균형도', before:bdBefore.typeBalance, after:bdAfter.typeBalance, max:40, color:'#10B981' },
                { label:'역할 다양성', before:bdBefore.roleDiversity, after:bdAfter.roleDiversity, max:30, color:'#4F6EF7' },
                { label:'협업 스타일', before:bdBefore.collabStyle, after:bdAfter.collabStyle, max:20, color:'#8B5CF6' },
                { label:'도메인 적합', before:bdBefore.domainFit, after:bdAfter.domainFit, max:10, color:'#F59E0B' },
              ].map(it => {
                const diff = it.after - it.before;
                return (
                  <div key={it.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-16 flex-shrink-0">{it.label}</span>
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${(it.after/it.max)*100}%`,backgroundColor:it.color}}/>
                    </div>
                    <span className="text-[10px] text-gray-500 w-6 text-right">{it.after}</span>
                    <span className="text-[9px] font-bold w-6 text-emerald-500">
                      {diff > 0 ? `+${diff}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ③ 점수 산출 근거 */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              기여 점수 산출 근거
            </p>
            <div className="space-y-2.5">

              {/* ① 성향 유사도 — 현재 탭 가중치 적용 */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-700">성향 유사도</span>
                  <span className="text-sm font-black" style={{color:'#4F6EF7'}}>
                    {contributions.style}점
                  </span>
                </div>
                <div className="space-y-1 text-[10px] text-gray-500">
                  <div className="flex justify-between">
                    <span>팀-후보 성향 유사도</span>
                    <span className="font-bold">{styleSim}%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span>가중치 적용 ({Math.round(weights.style*100)}%)</span>
                    <span className="font-black" style={{color:'#4F6EF7'}}>{contributions.style}점</span>
                  </div>
                </div>
              </div>

              {/* ② 관심 도메인 — 현재 탭 가중치 적용 */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-700">관심 도메인</span>
                  <span className="text-sm font-black" style={{color:'#10B981'}}>
                    {contributions.domain}점
                  </span>
                </div>
                <div className="space-y-1 text-[10px] text-gray-500">
                  <div className="flex justify-between">
                    <span>도메인 일치</span>
                    <span className="font-bold text-emerald-500">{commonDomains.length} / {teamDomains.length}개</span>
                  </div>
                  {commonDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {commonDomains.map(d => (
                        <span key={d} className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100">{d}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span>가중치 적용 ({Math.round(weights.domain*100)}%)</span>
                    <span className="font-black" style={{color:'#10B981'}}>{contributions.domain}점</span>
                  </div>
                </div>
              </div>

              {/* ③ 팀 선호 스타일 — 현재 탭 가중치 적용 */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-700">팀 선호 스타일</span>
                  <span className="text-sm font-black" style={{color:'#8B5CF6'}}>
                    {contributions.priority}점
                  </span>
                </div>
                <div className="space-y-1 text-[10px] text-gray-500">
                  <div className="flex justify-between">
                    <span>협업 우선순위 일치도</span>
                    <span className="font-bold">{prioPct_bd}%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span>가중치 적용 ({Math.round(weights.priority*100)}%)</span>
                    <span className="font-black" style={{color:'#8B5CF6'}}>{contributions.priority}점</span>
                  </div>
                </div>
              </div>

              {/* ④ 팀 밸런스 개선도 — 현재 탭 가중치 적용 */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-gray-700">팀 밸런스</span>
                  <span className="text-sm font-black" style={{color:'#F59E0B'}}>
                    {contributions.balance}점
                  </span>
                </div>
                <div className="space-y-1 text-[10px] text-gray-500">
                  {leastKey && (
                    <div className="flex justify-between">
                      <span>부족 성향({TYPES[leastKey]?.name}) 보완</span>
                      <span className="font-bold">{candidateLeastPct > 25 ? '가능' : '부분'}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                    <span>가중치 적용 ({Math.round(weights.balance*100)}%)</span>
                    <span className="font-black" style={{color:'#F59E0B'}}>{contributions.balance}점</span>
                  </div>
                </div>
              </div>

              {/* 합계 */}
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl"
                style={{background:`linear-gradient(135deg,${teamLabel.color}15 0%,${teamLabel.color}05 100%)`,
                  border:`1px solid ${teamLabel.color}30`}}>
                <span className="text-xs font-black text-gray-700">Team Contribution Score</span>
                <span className="text-base font-black" style={{color:teamLabel.color}}>{teamScoreExact.toFixed(1)}점</span>
              </div>
            </div>
          </div>

          {/* ④ 성향 분포 변화 (calcLackingTypes와 동일 소스) */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
              성향 분포 변화
            </p>
            <p className="text-[10px] text-gray-400 mb-2">실제 성향 비율 기준</p>
            <div className="bg-gray-50 rounded-2xl p-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {KEYS.map(k => {
                  const t   = TYPES[k];
                  const bef = ratioBefore[k] || 0;
                  const aft = ratioAfter[k]  || 0;
                  const diff = aft - bef;
                  const isLeast = k === leastKey;
                  return (
                    <div key={k} className="flex items-start gap-1.5">
                      <span className="text-sm flex-shrink-0 mt-0.5">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] font-semibold text-gray-600">{t.name}</p>
                          {isLeast && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1 rounded-full font-bold">추천</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {diff === 0 ? (
                            <>
                              <span className="text-[11px] font-black text-gray-400">{aft}%</span>
                              <span className="text-[9px] text-gray-300">· 변화 없음</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-gray-400">{bef}%</span>
                              <span className="text-[9px] text-gray-300">→</span>
                              <span className="text-[11px] font-black" style={{ color: TCOLS[k] }}>{aft}%</span>
                              {diff > 0 && (
                                <span className="text-[9px] font-bold text-emerald-500">+{diff}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {leastKey && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    <span className="font-bold" style={{color:TYPES[leastKey]?.color}}>
                      {TYPES[leastKey]?.emoji} {TYPES[leastKey]?.name}
                    </span>
                    {' '}비율: {ratioBefore[leastKey]}% → {ratioAfter[leastKey]}%
                    {ratioAfter[leastKey] > ratioBefore[leastKey] ? ' ↑ 보완됨' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ⑤ AI 추천 이유 */}
          <div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
              AI 추천 이유
            </p>
            <div className="space-y-1.5">
              {reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-emerald-50
                  rounded-xl px-3 py-2 border border-emerald-100">
                  <span className="text-emerald-500 font-black text-xs flex-shrink-0">✓</span>
                  <span className="text-xs font-semibold text-emerald-800">{r}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}


function srScoreBarColor(s) {
  if (s >= 80) return '#10B981';
  if (s >= 60) return '#4F6EF7';
  if (s >= 40) return '#F59E0B';
  return '#EF4444';
}
// 표시 전용 — 정렬에 쓰는 정수 점수(rec.score)는 그대로 두고, 이미 있는 breakdown 원점수로
// 소수점 한 자리까지 다시 계산해 보여준다 (동점처럼 보이는 79% vs 79%를 79.4% vs 78.6%처럼 구분).
// 가중치·정렬 로직은 전혀 건드리지 않음 — buildTabRecommendations의 최종 Math.round() 이전 값을 그대로 재현.
function preciseScore(bd, fallback) {
  if (!bd) return fallback;
  const styleSim   = bd.styleSim   ?? 0;
  const domainPct  = bd.domainPct  ?? 0;
  const balanceImp = bd.balanceImp ?? 0;
  const prioPct    = bd.prioPct ?? bd.prioRate ?? 0;
  const w = bd.weights || { style:0.40, domain:0.30, priority:0.20, balance:0.10 };
  return styleSim*w.style + domainPct*w.domain + prioPct*w.priority + balanceImp*w.balance;
}
// 항목 아이콘 상태: ✓초록(긍정) / ~파랑(중립) / ·회색(낮음)
// 긍정: 성향≥70% / 도메인≥1개 / 우선순위일치 / 밸런스+1점이상
// 중립: 성향40~69% / 우선순위유사(50%)
function srItemState(positive, neutral) {
  if (positive) return { icon:'✓', iconCls:'text-emerald-500', textCls:'text-gray-700' };
  if (neutral)  return { icon:'~', iconCls:'text-blue-400',    textCls:'text-gray-500' };
  return               { icon:'·', iconCls:'text-gray-300',    textCls:'text-gray-400' };
}

/* ══ 추천 카드 컴포넌트 ════════════════════════ */
function RecommendCard({ rec, rank, teamMembers, tab }) {
  const [showDetail, setShowDetail] = useState(false);
  const { user, scores } = rec;
  const type   = TYPES[user.dominantType];
  const score  = rec.score ?? scores?.total ?? 0;
  const TCOLS  = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  const tColor = TCOLS[user.dominantType] || '#CBD5E1';
  const bd     = rec.breakdown ?? null;
  const scoreExact = preciseScore(bd, score); // 소수점 한 자리 표시용 (순위·정렬은 rec.score 그대로 사용)

  // 항목별 상태
  const styleState   = bd ? srItemState(bd.styleSim  >= 70, bd.styleSim  >= 40) : null;
  const domainState  = bd ? srItemState(bd.domainCount >= 1, false)              : null;
  const prioState    = bd ? srItemState(bd.prioMatch,        bd.prioRate  >= 50) : null;
  const balanceState = bd ? srItemState(bd.balanceGain >= 1, false)              : null;

  return (
    <>
      <div
        className="bg-white rounded-2xl p-4 border-2 border-gray-50 shadow-sm
          active:scale-[0.99] transition-transform cursor-pointer"
        onClick={() => setShowDetail(true)}>
        <div className="flex items-start gap-3">
          {/* 순위 + 아바타 */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="text-[10px] font-black text-gray-400">{rank}</div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white"
              style={{ backgroundColor: tColor }}>
              {user.name[0]}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* 이름 + 상위 2개 성향 배지 + 상세 힌트 */}
            {(() => {
              // ★ 상위 2개 성향 계산 (typeRatio 기반)
              const TCOLS2 = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
              const topTypes = Object.entries(user.typeRatio||{})
                .sort((a,b)=>b[1]-a[1])
                .filter(([,v])=>v>15)
                .slice(0,2);
              return (
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-black text-sm text-gray-900">{user.name}</p>
                  {topTypes.map(([k],i)=>{
                    const t2=TYPES[k];
                    if(!t2) return null;
                    return (
                      <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ color:TCOLS2[k], backgroundColor:t2.bg }}>
                        {t2.emoji} {t2.name}{i===0&&topTypes.length>1?' 강점':''}
                      </span>
                    );
                  })}
                  <span className="ml-auto text-[10px] text-gray-300 flex items-center gap-0.5">
                    상세
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18L15 12L9 6" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                </div>
              );
            })()}

            {/* 도메인 태그 */}
            {(user.domains || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {user.domains.slice(0, 3).map(d => (
                  <span key={d} className="text-[10px] text-gray-400 bg-gray-50
                    px-1.5 py-0.5 rounded-full border border-gray-100">{d}</span>
                ))}
              </div>
            )}

            {/* 최종 매칭 적합도 — AI 추천 탭과 동일한 브랜드 그라데이션으로 아래 세부 지표(성향 유사도 등)와 색상 구분 */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold text-gray-600 flex-shrink-0">매칭 적합도</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${Math.min(100, scoreExact)}%`, background:'linear-gradient(90deg,#10B981,#3B82F6)' }}/>
              </div>
              <span className="text-xs font-black flex-shrink-0"
                style={{ background:'linear-gradient(135deg,#10B981,#3B82F6)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                {scoreExact.toFixed(1)}%
              </span>
            </div>

            {/* 추천 근거 리스트 */}
            <div className="space-y-1 mb-2">
              {/* 성향 유사도 */}
              {bd?.styleSim != null && styleState && (
                <div className="flex items-center gap-1.5">
                  <span className={`font-black text-[11px] flex-shrink-0 ${styleState.iconCls}`}>
                    {styleState.icon}
                  </span>
                  <span className={`text-[11px] flex-1 ${tab==='similar'?'font-bold':''} ${styleState.textCls}`}>
                    성향 유사도
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width:`${bd.styleSim}%`, backgroundColor: srScoreBarColor(bd.styleSim) }}/>
                    </div>
                    <span className="text-[11px] font-black w-8 text-right"
                      style={{ color: srScoreBarColor(bd.styleSim) }}>
                      {bd.styleSim}%
                    </span>
                  </div>
                </div>
              )}
              {/* 관심 도메인 */}
              {bd?.domainCount != null && domainState && (
                <div className="flex items-center gap-1.5">
                  <span className={`font-black text-[11px] flex-shrink-0 ${domainState.iconCls}`}>
                    {domainState.icon}
                  </span>
                  <span className={`text-[11px] flex-1 ${tab==='domain'?'font-bold':''} ${domainState.textCls}`}>
                    관심 도메인
                  </span>
                  <span className={`text-[11px] font-black ${domainState.textCls}`}>
                    {bd.domainCount > 0
                      ? `${bd.domainCount}개 일치${bd.commonDomains?.length ? ` (${bd.commonDomains.slice(0,2).join(', ')})` : ''}`
                      : '일치 없음'}
                  </span>
                </div>
              )}
              {/* 협업 우선순위 */}
              {bd?.prioOther != null && prioState && (
                <div className="flex items-center gap-1.5">
                  <span className={`font-black text-[11px] flex-shrink-0 ${prioState.iconCls}`}>
                    {prioState.icon}
                  </span>
                  <span className={`text-[11px] flex-1 ${prioState.textCls}`}>협업 우선순위</span>
                  <span className={`text-[11px] font-black ${prioState.textCls}`}>
                    {bd.prioMatch ? `"${bd.prioOther}" 일치` : bd.prioRate>=50 ? '방향성 유사' : '다름'}
                  </span>
                </div>
              )}
              {/* 팀 밸런스 개선 */}
              {bd?.balanceGain != null && balanceState && (
                <div className="flex items-center gap-1.5">
                  <span className={`font-black text-[11px] flex-shrink-0 ${balanceState.iconCls}`}>
                    {balanceState.icon}
                  </span>
                  <span className={`text-[11px] flex-1 ${tab==='balance'?'font-bold':''} ${balanceState.textCls}`}>
                    팀 밸런스 개선
                  </span>
                  <span className={`text-[11px] font-black ${balanceState.textCls}`}>
                    {bd.balanceGain > 0 ? `+${bd.balanceGain}점 예상` : '변화 없음'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDetail && (
        <MatchDetailSheet
          rec={rec}
          onClose={() => setShowDetail(false)}
          teamMembers={teamMembers}
        />
      )}
    </>
  );
}

/* ══ 추천 섹션 (탭 + 카드 리스트) ════════════ */
function RecommendSection({ teamMembers, groupCode, distribution }) {
  const [tab, setTab]         = useState('ai');
  const [visible, setVisible] = useState(true);

  // asUser 안정화 — 개별 값 구독
  const uName2  = useUserStore(s => s.name);
  const uDoms2  = useUserStore(s => s.domains);
  const uType2  = useUserStore(s => s.dominantType);
  const uRatio2 = useUserStore(s => s.typeRatio);
  const uVec2   = useUserStore(s => s.rawAnswerVector);
  const uPrio2  = useUserStore(s => s.priority);
  const me = { id:`${groupCode}_${uName2}`, name:uName2, groupCode, projectCode:groupCode,
    dominantType:uType2, typeRatio:uRatio2, rawAnswerVector:uVec2, domains:uDoms2, priority:uPrio2 };

  // ① store.members 직접 구독 → 탭 변경/Firebase 갱신 시 즉시 반영
  const rawMembers = useGroupStore(s => s.members);
  const allForSection = rawMembers.map(m => {
    const p = m.profile || {}, sc = p.scores || {};
    return {
      id: m.id, name: m.name,
      groupCode, projectCode: groupCode,
      dominantType: p.typeKey || 'A',
      typeRatio: { A: sc.추진||0, B: sc.소통||0, C: sc.탐구||0, D: sc.실행||0 },
      rawAnswerVector: p.rawAnswerVector || [],
      domains: p.domains || [],
      priority: p.priority || '',
    };
  });

  // ② selected 팀원 제외 (id 기반)
  const selectedIds = new Set(teamMembers.map(m => m.id));
  // ③ 같은 groupCode 멤버만, 팀원 제외
  const candidates  = allForSection.filter(m => !selectedIds.has(m.id));

  const teamProfile = makeTeamProfile(teamMembers, groupCode) || me;

  // ★ AI 탭: 종합 점수(styleSim×0.40 + domainPct×0.30 + prioPct×0.20 + balanceImp×0.10) 순으로 정렬
  //   — 리스트 순위와 점수가 항상 일치하도록, 부족 성향 보유 여부로 순위를 뒤집지 않음
  function buildTeamSuppRecs(cands) {
    // ★ AI 추천 전용 계산식 (설계 의도):
    //   styleSim×0.40 + domainPct×0.30 + prioPct×0.20 + balanceImp×0.10
    //   teamProfile을 me로 전달해 styleSim·domainPct·prioPct 정상 계산
    const base = buildTabRecommendations('ai', teamProfile, cands, teamMembers);

    // 점수 재계산: ai탭 가중치 그대로 사용 (buildTabRecommendations 내부와 동일)
    // balanceImp도 teamMembers 기준으로 계산됨 (me=null이 아님)
    const results = base.map(r => {
      const bd = r.breakdown || {};
      const s  = Math.round(
        (bd.styleSim  || 0) * 0.40 +
        (bd.domainPct || 0) * 0.30 +
        (bd.prioPct   ?? bd.prioRate ?? 0) * 0.20 +
        (bd.balanceImp|| 0) * 0.10
      );
      return { ...r, score: s };
    });

    // ★ 리스트에 보이는 순위 = 점수 순위 (항상 일치)
    //   aiSummary는 buildTabRecommendations 내부에서 breakdown 기여도 기반으로
    //   이미 동적으로 생성되어 있음 (buildSupplementAISummary) — 별도 재계산 없이 그대로 사용
    results.sort((a,b) => b.score - a.score);
    return results;
  }

  // 탭별 후보군 선정
  const sorted = tab === 'ai'
    ? buildTeamSuppRecs(candidates)
    : buildTabRecommendations(tab, teamProfile, candidates, teamMembers);

  const handleTabChange = (id) => {
    if (id === tab) return;
    setVisible(false);
    setTimeout(() => { setTab(id); setVisible(true); }, 180);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
      <p className="text-sm font-black text-gray-900 mb-1">👥 추천 멤버</p>
      <p className="text-xs text-gray-400 mb-4">
        현재 팀원을 제외한 그룹 내 추천 결과예요.
      </p>

      {/* 탭 스크롤 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => handleTabChange(tb.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl
              text-xs font-semibold transition-all duration-200 ${
              tab === tb.id
                ? 'text-white shadow-sm scale-[1.02]'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
            style={tab === tb.id ? { background:'linear-gradient(135deg,#10B981,#3B82F6)' } : {}}>
            <tb.Icon size={18} />
            <span>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 설명 */}
      <p className="text-xs text-gray-400 mb-3">
        {TABS.find(t => t.id === tab)?.desc}
      </p>

      {/* 카드 리스트 — fade 전환 */}
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
                navigator.clipboard?.writeText(`${window.location.origin}/group/join/${groupCode}`).catch(()=>{});
                alert('초대 링크가 복사됐어요!');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-emerald-50 text-emerald-700 border border-emerald-200
                text-sm font-semibold hover:bg-emerald-100 active:scale-[0.98] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              초대 링크 복사하기
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.slice(0, 5).map((rec, i) => (
              <RecommendCard key={rec.user.id || i} rec={rec} rank={`${i + 1}위`} teamMembers={teamMembers} tab={tab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ 메인 컴포넌트 ═══════════════════════════ */
export default function SupplementResult() {
  const navigate    = useNavigate();
  const { state }   = useLocation();
  const groupCode   = useGroupStore(s => s.groupCode);
  // members를 직접 구독 → Firebase 실시간 업데이트 즉시 반영
  const rawMembers  = useGroupStore(s => s.members);
  const allMembers  = rawMembers.map(m => {
    const p = m.profile || {}, sc = p.scores || {};
    return {
      id: m.id, name: m.name,
      groupCode, projectCode: groupCode,
      dominantType: p.typeKey || 'A',
      typeRatio: { A: sc.추진||0, B: sc.소통||0, C: sc.탐구||0, D: sc.실행||0 },
      rawAnswerVector: p.rawAnswerVector || [],
      domains: p.domains || [],
      priority: p.priority || '',
    };
  });
  // asUser 안정화
  const uNameM  = useUserStore(s => s.name);
  const uDomsM  = useUserStore(s => s.domains);
  const uTypeM  = useUserStore(s => s.dominantType);
  const uRatioM = useUserStore(s => s.typeRatio);
  const uVecM   = useUserStore(s => s.rawAnswerVector);
  const uPrioM  = useUserStore(s => s.priority);
  const me = { id:`${groupCode}_${uNameM}`, name:uNameM, groupCode, projectCode:groupCode,
    dominantType:uTypeM, typeRatio:uRatioM, rawAnswerVector:uVecM, domains:uDomsM, priority:uPrioM };
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!state?.selected) { navigate('/supplement/count'); return null; }
  const { selected, want } = state;

  const teamMembers  = allMembers.filter(m => selected.includes(m.id));
  const distribution = calcTeamDistribution(teamMembers);  // 도넛 세그먼트 비율 전용
  const balanceScore = calcTeamBalanceScore(teamMembers);  // typeRatio 기반
  // ★ actualRatio: typeRatio 기반 실제 성향 비율 (Balance Score와 동일 소스)
  //    도넛 중앙·분포 리스트 % 표시에 사용
  // ★ balanceScoring.sumRatios 활용 — calcTeamBalanceScore와 동일 소스
  const _rsum     = sumRatios(teamMembers);
  const _rtotal   = ['A','B','C','D'].reduce((s,k)=>s+(_rsum[k]||0),0);
  const actualRatio = _rtotal > 0
    ? { A:_rsum.A/_rtotal, B:_rsum.B/_rtotal, C:_rsum.C/_rtotal, D:_rsum.D/_rtotal }
    : { A:0.25, B:0.25, C:0.25, D:0.25 };
  const scoreLabel   = getTeamScoreLabel(balanceScore);

  const KEYS = ['A','B','C','D'];

  // ★ finalN = 현재 팀원 + 보충 인원 (최종 팀 기준 — 추천 성향·AI 분석 모두 이 기준)
  const finalN = teamMembers.length + want;

  // ★ mostKey: actualRatio 직접 비교 (typeRatio 기반 실제 비율이 가장 높은 성향)
  //    → 도넛 중앙·AI 분석 "현재 팀에서 가장 높은 성향" 표시에 사용
  const mostKey = KEYS.reduce((a,b) => (actualRatio[a]||0) >= (actualRatio[b]||0) ? a : b);

  // ★ lackedSorted / leastKey: finalN 기준 Ideal 대비 부족도 계산
  //    → 추천 성향, AI 분석 leastKey, 예상 점수 모두 동일 기준
  const lackedSorted = calcLackingTypes(teamMembers, finalN);
  const leastKey     = lackedSorted[0];
  const lackingFinal = lackedSorted.slice(0, want);


  // 등급 라벨
  const GRADE_LABEL = { S:'완벽한 밸런스', A:'균형 잡힌 팀', B:'보완이 필요한 팀', C:'성향 불균형 주의' };

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase">팀원 보충 · 결과</p>
            <p className="text-base font-black text-gray-900">AI 팀 분석 결과</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-white/80 border border-gray-100 px-2.5 py-1 rounded-full">
            <span className="text-[10px] font-black text-gray-700">{groupCode}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-10 max-w-md mx-auto space-y-3">

        {/* ① Team Balance Score — Hero Card */}
        <div className="rounded-3xl p-6 text-center shadow-sm overflow-hidden relative"
          style={{ background:`linear-gradient(135deg, ${scoreLabel.color}18 0%, ${scoreLabel.color}08 100%)`,
            border:`2px solid ${scoreLabel.color}25` }}>
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5"
            style={{background:scoreLabel.color, transform:'translate(30%,-30%)'}}/>

          <p className="text-[10px] font-bold tracking-widest uppercase mb-3"
            style={{color:scoreLabel.color}}>Team Balance Score</p>

          <div className="flex items-end justify-center gap-2 mb-2">
            <span className="text-7xl font-black leading-none" style={{color:scoreLabel.color}}>
              {balanceScore}
            </span>
            <span className="text-2xl text-gray-400 font-bold mb-2">점</span>
          </div>

          <div className="flex justify-center mb-3">
            <StarRating score={balanceScore}/>
          </div>

          <div className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white"
            style={{backgroundColor:scoreLabel.color}}>
            {GRADE_LABEL[scoreLabel.grade] || scoreLabel.label}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            현재 {teamMembers.length}명 팀 기준
          </p>

          {/* ★ 점수 계산 기준 — 실제 계산된 점수 표시 */}
          {(() => {
            const bd2 = calcTeamBalanceScoreBreakdown(teamMembers);
            const ITEMS = [
              { label:'성향 균형도', score:bd2.typeBalance, max:40, color:'#10B981' },
              { label:'역할 다양성', score:bd2.roleDiversity, max:30, color:'#4F6EF7' },
              { label:'협업 스타일', score:bd2.collabStyle, max:20, color:'#8B5CF6' },
              { label:'도메인 적합도', score:bd2.domainFit, max:10, color:'#F59E0B' },
            ];
            return (
              <div className="mt-4 grid grid-cols-2 gap-1.5 text-left">
                {ITEMS.map(c => (
                  <div key={c.label} className="bg-white/60 rounded-xl px-2.5 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">{c.label}</span>
                      <span className="text-[10px] font-black" style={{color:c.color}}>
                        {c.score}<span className="text-[9px] font-normal text-gray-400">/{c.max}</span>
                      </span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{width:`${(c.score/c.max)*100}%`,backgroundColor:c.color}}/>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* ② 도넛 그래프 + 성향 분포 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-4">📊 현재 팀 성향 분포</p>

          <div className="flex flex-col items-center gap-5">
            <DonutChart
              distribution={distribution}
              total={teamMembers.length}
              mostKey={mostKey}
              actualRatio={actualRatio}
              animated={animated}
              leastKey={leastKey}
            />

            {/* 성향 분포 리스트 */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              {KEYS.map(k => {
                const cnt = distribution[k] || 0;
                // ★ pct: typeRatio 기반 actualRatio (Balance Score와 동일 소스)
                const pct = Math.round((actualRatio[k] || 0) * 100);
                const t   = TYPES[k];
                const COLS = {A:'#EF4444',B:'#10B981',C:'#8B5CF6',D:'#F59E0B'};
                return (
                  <div key={k} className="flex items-center gap-2.5 bg-gray-50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{backgroundColor:t.bg}}>
                      {t.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700">{t.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {/* ★ 명수 제거 — 비율만 표시 (Balance Score와 동일 기준) */}
                        <p className="text-xs font-black" style={{color:pct>0?COLS[k]:'#D1D5DB'}}>
                          {pct > 0 ? `${pct}%` : '0%'}
                        </p>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ③ AI 분석 — 3단계 구조 */}
        {(() => {
          // 현재 팀 강점: 상위 2개 성향
          const sorted = [...KEYS].sort((a,b)=>(actualRatio[b]||0)-(actualRatio[a]||0));
          const strong1 = sorted[0]; const strong2 = sorted[1];
          const s1pct = Math.round((actualRatio[strong1]||0)*100);
          const s2pct = Math.round((actualRatio[strong2]||0)*100);
          const leastPct = Math.round((actualRatio[leastKey]||0)*100);
          const COLS = {A:'#EF4444',B:'#10B981',C:'#8B5CF6',D:'#F59E0B'};
          const STRENGTH_DESC = {
            A:'추진력과 방향 설정',B:'소통과 협업',C:'분석과 탐구',D:'실행과 완성도'
          };
          const LACK_DESC = {
            A:'프로젝트 초반 방향 설정과 빠른 의사결정이 부족할 수 있습니다.',
            B:'팀원 간 소통과 갈등 조율이 어려울 수 있습니다.',
            C:'데이터 기반 분석과 깊이 있는 검토가 부족할 수 있습니다.',
            D:'아이디어를 빠르게 실물로 만드는 실행력이 부족할 수 있습니다.',
          };
          return (
            <div className="rounded-3xl overflow-hidden border border-emerald-100"
              style={{background:'linear-gradient(135deg,#ECFDF5 0%,#EFF6FF 100%)'}}>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-black text-emerald-800">AI 팀 분석</p>
              </div>

              {/* 강점 */}
              <div className="px-5 pb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">현재 강점</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{color:COLS[strong1],backgroundColor:TYPES[strong1].bg}}>
                    {TYPES[strong1].emoji} {TYPES[strong1].name} {s1pct}%
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{color:COLS[strong2],backgroundColor:TYPES[strong2].bg}}>
                    {TYPES[strong2].emoji} {TYPES[strong2].name} {s2pct}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  현재 팀은 {STRENGTH_DESC[strong1]}({s1pct}%)와 {STRENGTH_DESC[strong2]}({s2pct}%)가 강점입니다.
                </p>
              </div>

              {/* 구분선 */}
              <div className="mx-5 border-t border-emerald-100 border-dashed mb-3"/>

              {/* 약점 — 부족 성향 전체 표시 (없으면 이미 균형 잡힌 팀) */}
              <div className="px-5 pb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">보완 필요</span>
                </div>
                {leastKey ? (
                  <>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {lackedSorted.filter(k=>(actualRatio[k]||0)<0.25).slice(0,3).map(k=>(
                        <span key={k} className="text-xs font-bold px-2.5 py-1 rounded-full border"
                          style={{ color:TYPES[k].color, backgroundColor:TYPES[k].bg, borderColor:`${TYPES[k].color}30` }}>
                          {TYPES[k].emoji} {TYPES[k].name} {Math.round((actualRatio[k]||0)*100)}%
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {lackedSorted.filter(k=>(actualRatio[k]||0)<0.25).length >= 2
                        ? `현재 팀은 ${lackedSorted.filter(k=>(actualRatio[k]||0)<0.25).slice(0,2).map(k=>TYPES[k].name).join('과 ')} 비율이 동일하게 부족합니다. 두 성향을 함께 보완할 수 있는 팀원을 우선 추천합니다.`
                        : LACK_DESC[leastKey]}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    현재 팀은 네 가지 성향이 균형 있게 분포되어 있어 특별히 부족한 성향이 없습니다.
                  </p>
                )}
              </div>

              {/* 구분선 */}
              <div className="mx-5 border-t border-emerald-100 border-dashed mb-3"/>

              {/* 팀 진단 — 탭과 무관한 현재 팀 상태 요약. "우선 추천합니다" 같은 특정 탭의 추천 결과를
                  약속하는 문구는 넣지 않음 (AI 추천 탭 기본값과 모순되는 것을 방지) */}
              <div className="px-5 pb-5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">팀 진단</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {leastKey ? (
                    <>
                      AI는 팀 성향 균형도·역할 다양성·협업 스타일을 종합 분석한 결과,
                      현재 {leastPct}%에 불과한 <span className="font-bold" style={{color:COLS[leastKey]}}>{TYPES[leastKey].name}</span> 보완이
                      필요하다고 판단했습니다. 이 성향을 채워줄 팀원은{' '}
                      <span className="font-bold text-gray-800">'밸런스 우선' 탭</span>에서 확인할 수 있어요.
                    </>
                  ) : (
                    '이미 균형 잡힌 팀이에요. 아래 탭에서 성향·도메인·협업 스타일 등 원하는 기준으로 팀원을 찾아보세요.'
                  )}
                </p>
              </div>
            </div>
          );
        })()}

        {/* ④ 부족한 성향 추천 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm font-black text-gray-900">💡 추천 성향</p>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {want}명 보충 시 아래 성향을 추천드려요.
          </p>



          {lackingFinal.length === 0 && (
            <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-2xl p-4">
              현재 팀은 균형이 잘 잡혀 있어 특별히 보완이 필요한 성향이 없어요.
              협업 스타일이나 관심 도메인이 잘 맞는 팀원을 찾아보세요.
            </p>
          )}
          <div className="space-y-3">
            {lackingFinal.map((k, i) => {
              const t   = TYPES[k];
              const r   = TYPE_REASONS[k];
              const COLS = {A:'#EF4444',B:'#10B981',C:'#8B5CF6',D:'#F59E0B'};
              return (
                <div key={k} className="rounded-2xl p-4 border-2"
                  style={{borderColor:`${COLS[k]}30`, backgroundColor:`${COLS[k]}08`}}>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{backgroundColor:t.bg}}>
                      {t.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black" style={{color:COLS[k]}}>{t.name}</p>
                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded-full"
                          style={{color:COLS[k]}}>{i+1}순위</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">보완 효과: {r.benefit}</p>
                    </div>
                  </div>

                  {/* ★ 추천 기준 명시 */}
                  <div className="bg-white/70 rounded-xl px-3 py-2 mb-2.5 border border-white">
                    <p className="text-[10px] font-black text-gray-500 mb-1">추천 기준</p>
                    <p className="text-xs font-semibold" style={{color:COLS[k]}}>
                      {t.name} 비율이 상대적으로 높은 팀원
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      현재 팀 {t.name} 비율 {Math.round((actualRatio[k]||0)*100)}% → 팀 균형 목표 25%
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{backgroundColor:COLS[k]}}/>
                    <p className="text-xs text-gray-600 leading-relaxed">{r.why}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* ⑥ 추천 멤버 탭 + 카드 */}
        <RecommendSection
          teamMembers={teamMembers}
          groupCode={groupCode}
          distribution={distribution}
        />

        {/* CTA */}
        <button onClick={() => navigate('/group-home')}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{background:'linear-gradient(135deg,#10B981 0%,#3B82F6 100%)'}}>
          그룹 홈으로 →
        </button>
      </div>
    </div>
  );
}
