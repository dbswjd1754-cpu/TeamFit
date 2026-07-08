import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useTeamStore from '../store/useTeamStore';
import useGroupStore from '../store/useGroupStore';
import TypeBadge from '../components/ui/TypeBadge';
import { TYPES } from '../data/questions';
import {
  calcTeamDistribution,
  calcTeamBalanceScore,
  calcLackingTypes,
  calcIdealRatio,
  analyzeTeamGap,
  buildSupplementRecommendations,
  getSupplementLabel,
} from '../utils/balanceScoring';

/* ── 미니 도넛 차트 ─────────────────────────────── */
function TypeDonut({ distribution, total, actualRatio }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const typeOrder = ['A', 'B', 'C', 'D'];
  const colors = { A: '#EF4444', B: '#10B981', C: '#8B5CF6', D: '#F59E0B' };
  const r = 38, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;

  let cumulative = 0;
  const slices = typeOrder.map(type => {
    const count = distribution[type] || 0;
    // ★ actualRatio(typeRatio 기반) 우선 — distribution(dominantType 기반) fallback
    const pct   = actualRatio ? (actualRatio[type]||0) : (total > 0 ? count / total : 0);
    const dash  = animated ? pct * circ : 0;
    const gap   = circ - dash;
    const offset = circ * (1 - cumulative);
    cumulative += pct;
    return { type, count, dash, gap, offset, color: colors[type] };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth="14" />
          ) : (
            slices.map((s, i) => s.count > 0 && (
              <circle key={s.type}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={s.offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-lg font-bold text-gray-700">{total}<span className="text-xs font-normal text-gray-400">명</span></p>
        </div>
      </div>

      {/* 범례 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 flex-1">
        {typeOrder.map(type => {
          const t = TYPES[type];
          const count = distribution[type] || 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-xs text-gray-500">{t.emoji} {t.name}</span>
              <span className="text-xs font-bold ml-auto" style={{ color: count > 0 ? t.color : '#D1D5DB' }}>
                {count}명
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 보충 추천 카드 ──────────────────────────────── */
function SupplementCard({ rec, rank }) {
  const { user, scores, reasons, complement } = rec;
  const label = getSupplementLabel(scores.total);
  const type  = TYPES[user.dominantType];
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      {/* 상단 */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              rank === 0 ? 'bg-yellow-100 text-yellow-600' :
              rank === 1 ? 'bg-gray-100 text-gray-500' :
              rank === 2 ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'
            }`}>{rank + 1}</div>
            <div>
              <p className="font-bold text-gray-900">{user.name}</p>
              <TypeBadge typeKey={user.dominantType} size="sm" />
            </div>
          </div>
          {/* 점수 */}
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: label.color }}>{scores.total}</p>
            <p className="text-xs text-gray-400">/ 100점</p>
          </div>
        </div>

        {/* 점수 바 3개 */}
        <div className="space-y-2 mb-3">
          {[
            { label: '팀 밸런스 보완', score: scores.balance,  max: 50, color: '#10B981' },
            { label: '관심 도메인',    score: scores.domain,   max: 30, color: '#4F6EF7' },
            { label: '팀 선호 스타일', score: scores.priority, max: 20, color: '#F59E0B' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">{item.label}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((item.score / item.max) * 100)}%`, backgroundColor: item.color }}
                />
              </div>
              <span className="text-xs font-semibold w-8 text-right" style={{ color: item.color }}>
                {item.score}
              </span>
            </div>
          ))}
        </div>

        {/* 도메인 + 우선순위 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {user.domains.map(d => (
            <span key={d} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border border-gray-100">{d}</span>
          ))}
          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{user.priority}</span>
        </div>

        {/* 레이블 + 펼치기 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className="text-xs font-semibold" style={{ color: label.color }}>{label.label}</span>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {open ? '접기' : '추천 이유 보기'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 펼쳐지는 상세 */}
      {open && (
        <div className="border-t border-gray-50 px-5 pb-5 pt-4 space-y-3 bg-gray-50/50">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">💬 추천 이유</p>
            {reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-xs font-bold">{i+1}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
          <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700 mb-1">🧩 우리 팀에 보완해줄 점</p>
            <p className="text-xs text-emerald-700 leading-relaxed">{complement}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Balance Score 게이지 + ⓘ 버튼 + Bottom Sheet ── */
function BalanceGauge({ score }) {
  const [animated, setAnimated] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, []);

  const color = score >= 75 ? '#10B981' : score >= 50 ? '#4F6EF7' : score >= 25 ? '#F59E0B' : '#EF4444';
  const label = score >= 75 ? '균형 잡힌 팀이에요!' : score >= 50 ? '조금 더 다양해질 수 있어요' : score >= 25 ? '팀 밸런스 보완이 필요해요' : '특정 유형이 많이 집중되어 있어요';

  const r = 40, circ = 2 * Math.PI * r;
  const offset = circ * (1 - (animated ? score / 100 : 0));

  const CRITERIA = [
    { label: '성향 균형도',       pct: 40, color: '#10B981' },
    { label: '부족 역할 보완도',   pct: 30, color: '#4F6EF7' },
    { label: '협업 스타일 적합도', pct: 20, color: '#8B5CF6' },
    { label: '관심 도메인 일치도', pct: 10, color: '#F59E0B' },
  ];

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
            <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xl font-bold" style={{ color }}>{score}</p>
          </div>
        </div>
        <div className="flex-1">
          {/* ★ 라벨 줄에 ⓘ 버튼 추가 */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-xs text-gray-400">Team Balance Score</p>
            <button
              onClick={() => setSheetOpen(true)}
              className="w-4 h-4 rounded-full border border-gray-300 flex items-center
                justify-center text-[9px] text-gray-400 hover:border-gray-500
                hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label="점수 계산 방법 보기"
            >ⓘ</button>
          </div>
          <p className="font-bold text-gray-800 text-sm leading-snug">{label}</p>
        </div>
      </div>

      {/* ── Bottom Sheet ── */}
      {sheetOpen && (
        <>
          {/* 딤 */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setSheetOpen(false)}
          />
          {/* 시트 */}
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto
            bg-white rounded-t-3xl shadow-2xl px-6 pt-5 pb-10">
            {/* 핸들 */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            {/* 제목 */}
            <p className="text-sm font-black text-gray-900 mb-4">
              ⓘ Team Balance Score는 어떻게 계산되나요?
            </p>

            {/* 설명 */}
            <p className="text-xs text-gray-500 leading-relaxed mb-5">
              Team Balance Score는 현재 팀의 협업 균형도를 100점 만점으로 계산합니다.
              현재 팀의 <span className="font-bold text-gray-700">성향 균형 · 역할 보완 · 협업 스타일 · 관심 도메인</span>을 종합적으로 분석합니다.
            </p>

            {/* 평가 기준 */}
            <p className="text-xs font-bold text-gray-700 mb-3">평가 기준</p>
            <div className="space-y-2.5 mb-5">
              {CRITERIA.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-600">{c.label}</span>
                      <span className="text-xs font-black" style={{ color: c.color }}>{c.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">※ 관심 도메인</span>은 프로젝트를 함께 수행하기 위한
                공통 관심사를 의미합니다.
              </p>
            </div>

            <button
              onClick={() => setSheetOpen(false)}
              className="w-full mt-5 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600
                hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────── */
export default function TeamBalance() {
  const navigate    = useNavigate();
  const groupCode   = useGroupStore(s => s.groupCode);
  const currentTeam = useTeamStore(s => s.currentTeam);

  useEffect(() => {
    if (!groupCode || currentTeam.length === 0) navigate('/supplement/team-select', { replace: true });
  }, [groupCode, currentTeam.length, navigate]);

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
  const teamMembers = allMembers.filter(u => currentTeam.includes(u.id));

  // ① dominantType 기반 분포 (도넛 차트·멤버 칩 전용)
  const distribution = calcTeamDistribution(teamMembers);

  // ② typeRatio 기반 계산 (Balance Score·AI 분석·추천 성향 — 모두 동일 소스)
  const balanceScore = calcTeamBalanceScore(teamMembers);
  const gap          = analyzeTeamGap(teamMembers);

  // ③ typeRatio 기반 실제 비율 (협업 유형 분포 상세 표시용)
  const ratioSum = { A: 0, B: 0, C: 0, D: 0 };
  teamMembers.forEach(m => {
    const r = m.typeRatio || {};
    ratioSum.A += (r.A || 0); ratioSum.B += (r.B || 0);
    ratioSum.C += (r.C || 0); ratioSum.D += (r.D || 0);
  });
  const ratioTotal = ratioSum.A + ratioSum.B + ratioSum.C + ratioSum.D;
  const actualRatio = ratioTotal > 0
    ? { A: ratioSum.A/ratioTotal, B: ratioSum.B/ratioTotal, C: ratioSum.C/ratioTotal, D: ratioSum.D/ratioTotal }
    : { A: 0.25, B: 0.25, C: 0.25, D: 0.25 };

  // ④ 부족/초과 성향 (typeRatio 기반 — gap.lacking과 동일 소스)
  const lackingOrder = calcLackingTypes(teamMembers);  // 부족도 내림차순
  const idealRatio   = calcIdealRatio(teamMembers.length);

  const supplements = buildSupplementRecommendations(teamMembers, allMembers, groupCode);

  if (!teamMembers.length) return null;

  return (
    <div className="min-h-screen bg-surface">
      {/* 네비 */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4 max-w-md mx-auto flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <h1 className="font-bold text-gray-900">팀 밸런스 분석</h1>
          <p className="text-xs text-gray-400">{groupCode} · {teamMembers.length}명 팀</p>
        </div>
        <div className="ml-auto">
          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-semibold">🧩 팀원 보충</span>
        </div>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto space-y-4 pb-12">

        {/* ① 현재 팀 구성 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-4">👥 현재 팀 구성 <span className="text-xs font-normal text-gray-400">· 성향 분포</span></p>

          {/* 멤버 칩 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {teamMembers.map(m => {
              const t = TYPES[m.dominantType];
              return (
                <div key={m.id} className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                  <span style={{ color: t?.color }}>{t?.emoji}</span>
                  <span className="text-sm font-semibold text-gray-700">{m.name}</span>
                </div>
              );
            })}
          </div>

          {/* 도넛 차트 */}
          <TypeDonut distribution={distribution} total={teamMembers.length} actualRatio={actualRatio} />
        </div>

        {/* ② 협업 유형 분포 상세 — typeRatio 기반 (Balance Score·AI 분석과 동일 소스) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">📊 협업 성향 분포</p>
            <span className="text-[10px] text-gray-400">성향 비율 기반</span>
          </div>
          <div className="space-y-3">
            {['A','B','C','D'].map(typeKey => {
              const t      = TYPES[typeKey];
              const count  = distribution[typeKey] || 0;         // 도넛 차트용 인원수
              const pct    = Math.round((actualRatio[typeKey] || 0) * 100); // ★ typeRatio 기반 비율
              const ideal  = Math.round((idealRatio[typeKey]  || 0) * 100);
              // ★ typeRatio 기반 부족/초과 판단 (Balance Score와 동일 기준)
              const isLeast   = lackingOrder[0] === typeKey;           // 가장 부족
              const isLacking = lackingOrder.indexOf(typeKey) <= 1 && pct < ideal; // 부족
              const isZero    = pct < 1;
              return (
                <div key={typeKey} className={`flex items-center gap-3 p-3 rounded-2xl ${
                  isZero    ? 'bg-red-50 border border-red-100'
                : isLacking ? 'bg-amber-50 border border-amber-100'
                : 'bg-gray-50'}`}>
                  <span className="text-xl">{t.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${isZero ? 'text-red-700' : isLacking ? 'text-amber-700' : 'text-gray-700'}`}>
                        {t.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* ★ 명수 제거 — 비율만 표시 */}
                        <span className={`text-sm font-bold ${isZero ? 'text-red-500' : isLacking ? 'text-amber-500' : 'text-gray-600'}`}>
                          {pct}%
                        </span>
                        <span className="text-[10px] text-gray-300">/ 이상 {ideal}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden relative">
                      {/* 이상 기준선 */}
                      <div className="absolute top-0 bottom-0 w-px bg-gray-300 opacity-60"
                        style={{ left: `${ideal}%` }} />
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: t.color }}
                      />
                    </div>
                  </div>
                  {isZero    && <span className="text-xs text-red-500 font-semibold flex-shrink-0">없음</span>}
                  {isLacking && !isZero && isLeast && <span className="text-xs text-amber-500 font-semibold flex-shrink-0">부족</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ③ Team Balance Score */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <BalanceGauge score={balanceScore} />
        </div>

        {/* ④ 팀 밸런스 분석 */}
        <div className={`rounded-3xl p-5 ${balanceScore >= 75 ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
          <p className={`text-sm font-bold mb-2 ${balanceScore >= 75 ? 'text-emerald-800' : 'text-amber-800'}`}>
            {balanceScore >= 75 ? '✅ 팀 밸런스 분석' : '⚠️ 팀 밸런스 분석'}
          </p>
          <p className={`text-sm leading-relaxed mb-2 whitespace-pre-line ${balanceScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {gap.analysis}
          </p>
          {gap.suggestion && (
            <p className={`text-xs leading-relaxed ${balanceScore >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
              💡 {gap.suggestion}
            </p>
          )}
        </div>

        {/* ⑤ 보충 추천 */}
        {supplements.length > 0 ? (
          <>
            {/* ★ AI 추천 성향 카드 — 부족 성향 + 이유 */}
            {(() => {
              const leastKey  = lackingOrder[0];
              const leastType = TYPES[leastKey];
              const leastPct  = Math.round((actualRatio[leastKey] || 0) * 100);
              if (!leastType) return null;
              const REASON = {
                A: '프로젝트 방향 설정과 빠른 의사결정을 주도할 역할이 필요합니다.',
                B: '팀원 간 의견을 조율하고 협업 분위기를 만들 역할이 필요합니다.',
                C: '데이터와 근거를 바탕으로 깊이 분석할 역할이 필요합니다.',
                D: '아이디어를 빠르게 실물로 만들고 검증할 역할이 필요합니다.',
              };
              return (
                <div className="bg-white rounded-3xl p-5 shadow-sm border-l-4"
                  style={{ borderLeftColor: leastType.color }}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    🤖 AI 추천 성향
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{leastType.emoji}</span>
                    <div>
                      <p className="font-black text-gray-900 text-lg">{leastType.name}</p>
                      <p className="text-xs font-semibold" style={{ color: leastType.color }}>
                        현재 비율 {leastPct}% · 보완 필요
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-3">
                    현재 팀의 {leastType.name} 비율이 낮아 {REASON[leastKey]}
                  </p>
                </div>
              );
            })()}

            <div className="pt-2">
              <p className="text-base font-bold text-gray-900 mb-1">🎯 보충 추천 팀원</p>
              <p className="text-xs text-gray-400 mb-4">
                팀에 부족한 유형을 우선으로 추천해드려요
              </p>
              <div className="space-y-3">
                {supplements.map((rec, i) => (
                  <SupplementCard key={rec.user.id} rec={rec} rank={i} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-gray-800 mb-1">추천할 추가 팀원이 없어요</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              같은 그룹의 모든 멤버가 이미 팀에 있거나<br />아직 등록된 멤버가 없어요.
            </p>
          </div>
        )}

        {/* 처음으로 */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}
