/**
 * BalanceResult — 팀 협업 밸런스 리포트
 * '팀 밸런스가 궁금해요' 전용 화면
 *
 * [절대 변경 금지]
 *   - navigate('/balance/count') fallback
 *   - state?.selected 검증
 *   - navigate('/supplement/count') CTA
 *   - navigate('/mode-select') CTA
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import { TYPES } from '../data/questions';
import {
  calcTeamBalanceScore,
  calcTeamBalanceScoreBreakdown,
  calcTeamDistribution,
  calcLackingTypes,
  getTeamScoreLabel,
  sumRatios,
} from '../utils/balanceScoring';

const KEYS  = ['A','B','C','D'];
const TCOLS = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };

/* ── 도넛 차트 — actualRatio(typeRatio) 기반 ── */
function DonutChart({ actualRatio, score, color }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t); }, []);
  const SIZE = 160, STROKE = 22, R = (SIZE-STROKE)/2, CIRC = 2*Math.PI*R;
  let offset = 0;
  const segs = KEYS.map(k => {
    const pct = actualRatio[k] || 0;
    const len = animated && pct > 0 ? pct * CIRC : 0;
    const seg = { k, offset: CIRC - offset, len, color: TCOLS[k] };
    offset += pct * CIRC;
    return seg;
  }).filter(s => s.len > 0);

  return (
    <div className="flex items-center justify-center">
      <div className="relative" style={{ width:SIZE, height:SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE}/>
          {segs.map((s,i) => (
            <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
              stroke={s.color} strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${CIRC-s.len}`}
              strokeDashoffset={s.offset}
              style={{ transition:'stroke-dasharray 0.8s ease-out, stroke-dashoffset 0.8s ease-out' }}/>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-black leading-none" style={{ color }}>{score}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">Team<br/>Balance</p>
        </div>
      </div>
    </div>
  );
}

/* ── 도메인 분포 막대 — 선택 인원 수 / 전체 팀원 수 기준 ── */
function DomainBar({ domain, count, total }) {
  const ratio = total > 0 ? (count/total)*100 : 0;
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(ratio), 300); return () => clearTimeout(t); }, [ratio]);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-600 w-24 flex-shrink-0 truncate">{domain}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${w}%`, backgroundColor:'#8B5CF6' }}/>
      </div>
      <span className="text-[10px] font-bold text-gray-500 w-14 text-right flex-shrink-0">{count}명 / {total}명</span>
    </div>
  );
}

export default function BalanceResult() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const rawBal    = useGroupStore(s => s.members);
  const gcBal     = useGroupStore(s => s.groupCode);

  if (!state?.selected) { navigate('/balance/count'); return null; }

  const { selected } = state;
  const teamMembers = rawBal
    .map(m => {
      const p = m.profile||{}, sc = p.scores||{};
      return {
        id: m.id, name: m.name, groupCode: gcBal,
        dominantType: p.typeKey || 'A',
        typeRatio: { A:sc.추진||0, B:sc.소통||0, C:sc.탐구||0, D:sc.실행||0 },
        rawAnswerVector: p.rawAnswerVector || [],
        domains: p.domains || [],
        priority: p.priority || '',
      };
    })
    .filter(m => selected.includes(m.id));

  /* ── 기본 계산 ── */
  const balanceScore = calcTeamBalanceScore(teamMembers);
  const bd           = calcTeamBalanceScoreBreakdown(teamMembers);
  const scoreLabel   = getTeamScoreLabel(balanceScore);
  const distribution = calcTeamDistribution(teamMembers); // 팀원 칩용
  const lackingKeys  = calcLackingTypes(teamMembers);     // 5% 임계값 적용

  /* ── actualRatio (typeRatio 기반 — 도넛·% 표시 동일 소스) ── */
  const _rsum  = sumRatios(teamMembers);
  const _rtot  = KEYS.reduce((s,k)=>s+(_rsum[k]||0), 0) || 1;
  const actualRatio = Object.fromEntries(KEYS.map(k => [k, _rsum[k]/_rtot]));
  const pctRatio    = Object.fromEntries(KEYS.map(k => [k, Math.round((actualRatio[k]||0)*100)]));

  /* ── 도메인 분포 — 전체 팀원 중 몇 명이 선택했는지 기준 (중복 선택 가능하므로 %가 아닌 명수) ── */
  const domainCount = {};
  teamMembers.forEach(m => (m.domains||[]).forEach(d => { domainCount[d] = (domainCount[d]||0)+1; }));
  const totalMembers = teamMembers.length || 1;
  const domainList = Object.entries(domainCount)
    .map(([d,cnt]) => ({ domain:d, count:cnt, total:totalMembers }))
    .sort((a,b) => b.count-a.count);
  const topDomain  = domainList[0];
  const isDomainDiverse = domainList.length >= 4 || (domainList.length>1 && topDomain && (topDomain.count/totalMembers) < 0.4);

  /* ── 부족 성향 근거 ── */
  const IDEAL_PCT = 25; // 항상 25% 기준
  const lackingWithReason = lackingKeys.map(k => {
    const currentPct = pctRatio[k] || 0;
    const gap        = IDEAL_PCT - currentPct;
    return { k, currentPct, gap };
  });

  /* ── AI 종합 분석 ── */
  const sorted      = [...KEYS].sort((a,b)=>(actualRatio[b]||0)-(actualRatio[a]||0));
  const mostKey     = sorted[0];
  const leastKey    = lackingKeys[0] || null;

  const STRENGTH_LABEL = { A:'추진력과 방향 설정', B:'소통과 협업 분위기', C:'분석과 검증', D:'빠른 실행력' };
  const WEAK_LABEL     = { A:'방향 설정과 의사결정', B:'팀 내 소통과 조율', C:'데이터 기반 분석', D:'실행과 검증' };

  const aiLines = [];

  // 성향 강점
  aiLines.push(
    `현재 팀은 ${TYPES[mostKey]?.name}(${pctRatio[mostKey]}%) 비중이 높아 ${STRENGTH_LABEL[mostKey]}이 강점입니다.`
  );

  // 역할 다양성
  if (bd.roleDiversity < 22) {
    aiLines.push(`역할 다양성(${bd.roleDiversity}/30)이 낮아 특정 성향에 편중된 구성입니다.`);
  } else {
    aiLines.push(`역할 다양성(${bd.roleDiversity}/30)은 양호하게 확보되어 있습니다.`);
  }

  // 부족 성향
  if (leastKey) {
    aiLines.push(`${TYPES[leastKey]?.name}(${pctRatio[leastKey]}%) 비율이 낮아 ${WEAK_LABEL[leastKey]} 역할이 부족합니다.`);
  }

  // 도메인
  if (isDomainDiverse) {
    aiLines.push(`관심 도메인이 다양하게 분포되어 있어 프로젝트 초기 주제 합의 과정이 필요할 수 있습니다.`);
  } else if (topDomain) {
    aiLines.push(`${topDomain.domain} 관심도(${topDomain.count}/${totalMembers}명)가 가장 높아 프로젝트 방향성이 비교적 명확합니다.`);
  }

  /* ── 협업 리스크 ── */
  const risks = [];
  if (lackingKeys.length > 0) {
    const names = lackingKeys.map(k=>TYPES[k]?.name).join(', ');
    risks.push(`${names} 비율이 낮아 관련 역할(${lackingKeys.map(k=>WEAK_LABEL[k]).join(', ')}) 과정이 약해질 수 있습니다.`);
  }
  if (bd.collabStyle < 12) {
    risks.push(`협업 스타일(${bd.collabStyle}/20)이 특정 성향에 집중되어 다양한 상황 대응이 어려울 수 있습니다.`);
  }
  if (isDomainDiverse) {
    risks.push(`도메인 관심사가 다양해 프로젝트 초기 주제 선정 시 합의 과정이 길어질 수 있습니다.`);
  }
  if (risks.length === 0) {
    risks.push('현재 팀 구성에서 큰 협업 리스크는 발견되지 않았습니다.');
  }

  return (
    <div className="min-h-screen"
      style={{ background:'linear-gradient(160deg,#F5F3FF 0%,#EFF6FF 55%,#F0FDF9 100%)' }}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/mode-select')}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase">팀 밸런스 분석 · 결과</p>
            <p className="text-base font-black text-gray-900">팀 협업 밸런스 리포트</p>
          </div>
          <div className="ml-auto flex items-center gap-1 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">
            <span className="text-[10px]">🔒</span>
            <span className="text-[10px] font-bold text-purple-600">나만 보기</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 max-w-md mx-auto space-y-3">

        {/* ① 도넛 + 성향 분포(%) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Team Balance Score</p>
          <div className="flex items-center gap-5 mb-4">
            {/* 도넛: actualRatio 기반 */}
            <DonutChart actualRatio={actualRatio} score={balanceScore} color={scoreLabel.color}/>
            {/* 성향 분포: % 표시 */}
            <div className="flex-1 space-y-2">
              {KEYS.map(k => (
                <div key={k} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                    style={{ backgroundColor: TYPES[k]?.bg }}>
                    {TYPES[k]?.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px] text-gray-500">{TYPES[k]?.name}</span>
                      <span className="text-[10px] font-black" style={{ color: TCOLS[k] }}>
                        {pctRatio[k]}%
                      </span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width:`${pctRatio[k]}%`, backgroundColor: TYPES[k]?.color }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-500">전체 밸런스</p>
            <span className="text-sm font-black px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: scoreLabel.color }}>{scoreLabel.label}</span>
          </div>
          {/* 팀원 칩 */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {teamMembers.map(m => {
              const t = TYPES[m.dominantType];
              return (
                <div key={m.id} className="flex items-center gap-1 px-2 py-1 rounded-full border border-gray-100 bg-gray-50">
                  <span style={{ color: t?.color }} className="text-xs">{t?.emoji}</span>
                  <span className="text-xs font-semibold text-gray-700">{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ② Team Balance Score 항목별 실제 점수 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-1">📊 점수 세부 내역</p>
          <p className="text-xs text-gray-400 mb-4">각 항목의 실제 달성 점수</p>
          <div className="space-y-3">
            {[
              { label:'성향 균형도', score:bd.typeBalance, max:40, color:'#10B981' },
              { label:'역할 다양성', score:bd.roleDiversity, max:30, color:'#4F6EF7' },
              { label:'협업 스타일', score:bd.collabStyle,  max:20, color:'#8B5CF6' },
              { label:'도메인 적합도', score:bd.domainFit,  max:10, color:'#F59E0B' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                  <span className="text-xs font-black" style={{ color: item.color }}>
                    {item.score}
                    <span className="text-[10px] font-normal text-gray-400"> / {item.max}</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${(item.score/item.max)*100}%`, backgroundColor: item.color }}/>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-xs font-black text-gray-600">최종 Team Balance Score</span>
              <span className="text-base font-black" style={{ color: scoreLabel.color }}>{balanceScore}점</span>
            </div>
          </div>
        </div>

        {/* ③ 부족한 성향 + 근거 */}
        {lackingWithReason.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5">
            <p className="text-sm font-black text-amber-800 mb-3">⚠️ 부족한 성향</p>
            <div className="space-y-3">
              {lackingWithReason.map(({ k, currentPct, gap }) => (
                <div key={k} className="bg-white/70 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{TYPES[k]?.emoji}</span>
                    <span className="text-sm font-black" style={{ color: TCOLS[k] }}>{TYPES[k]?.name}</span>
                  </div>
                  <div className="space-y-0.5 text-xs text-amber-700">
                    <div className="flex justify-between">
                      <span>현재 비율</span>
                      <span className="font-bold">{currentPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>권장 기준</span>
                      <span className="font-bold">{IDEAL_PCT}% 이상</span>
                    </div>
                    <div className="flex justify-between text-amber-800 font-bold border-t border-amber-100 pt-1 mt-1">
                      <span>부족분</span>
                      <span>약 {gap}% 부족 → 보완 필요</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ④ 도메인 분포 */}
        {domainList.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
            <p className="text-sm font-black text-gray-900 mb-1">🗂️ 도메인 분포</p>
            <p className="text-xs text-gray-400 mb-4">전체 팀원 중 선택한 인원 수 기준</p>
            <div className="space-y-2.5">
              {domainList.slice(0, 6).map(({ domain, count, total }) => (
                <DomainBar key={domain} domain={domain} count={count} total={total}/>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 leading-relaxed">
                {isDomainDiverse
                  ? '관심 도메인이 다양하게 분포되어 있어 프로젝트 주제 선정 시 의견 조율이 필요할 수 있습니다.'
                  : topDomain
                    ? `${topDomain.domain} 관심도(${topDomain.count}/${totalMembers}명)가 가장 높아 프로젝트 방향성이 비교적 명확합니다.`
                    : ''}
              </p>
            </div>
          </div>
        )}

        {/* ⑤ AI 종합 분석 */}
        <div className="rounded-2xl p-4 border border-purple-100"
          style={{ background:'linear-gradient(135deg,#F5F3FF 0%,#EFF6FF 100%)' }}>
          <p className="text-xs font-bold text-purple-700 mb-2">🤖 AI 팀 종합 분석</p>
          <div className="space-y-1.5">
            {aiLines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-purple-400 text-xs mt-0.5 flex-shrink-0">•</span>
                <p className="text-xs text-purple-800 leading-relaxed">{line}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ⑥ 협업 리스크 */}
        <div className="bg-red-50 border border-red-100 rounded-3xl p-4">
          <p className="text-sm font-black text-red-700 mb-2">🚨 협업 리스크</p>
          <div className="space-y-1.5">
            {risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">•</span>
                <p className="text-sm text-red-600 leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button onClick={() => navigate('/supplement/count')}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{ background:'linear-gradient(135deg,#8B5CF6 0%,#3B82F6 100%)' }}>
          부족한 팀원 추천받기 →
        </button>
        <button onClick={() => navigate('/mode-select')}
          className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors text-center">
          처음으로 돌아가기
        </button>

      </div>
    </div>
  );
}
