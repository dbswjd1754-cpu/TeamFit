/**
 * TeamBalanceResult
 *
 * 팀 밸런스 분석 결과 화면
 *
 * 상태 격리 설계:
 *   - 팀원 선택 데이터는 location.state (Router)로만 수신
 *   - 전역 store 미사용 → 페이지 직접 접근/새로고침 시 데이터 없음 → 선택 화면으로 리다이렉트
 *   - 다른 사용자가 URL 직접 접근해도 이전 분석 결과 노출 없음
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import { TYPES }    from '../data/questions';
import { mockUsers } from '../data/mockUsers';
import TypeBadge    from '../components/ui/TypeBadge';
import {
  calcTeamDistribution,
  calcTeamBalanceScore,
  generateTeamAnalysis,
  getTeamScoreLabel,
} from '../utils/balanceScoring';

/* ── 원형 점수 게이지 ── */
function ScoreGauge({ score, color, grade }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t); }, []);

  const r = 48, circ = 2 * Math.PI * r;
  const offset = circ * (1 - (animated ? score / 100 : 0));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10"/>
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-3xl font-black leading-none" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-400 mt-0.5">/ 100점</p>
        <div className="mt-1 text-xs font-black px-1.5 py-0.5 rounded-full text-white inline-block"
          style={{ backgroundColor: color }}>{grade}</div>
      </div>
    </div>
  );
}

/* ── 성향 분포 바 ── */
function TypeBar({ typeKey, count, total }) {
  const [width, setWidth] = useState(0);
  const t = TYPES[typeKey];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 300);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
        style={{ backgroundColor: t.bg }}>
        {t.emoji}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-gray-600">{t.name}</span>
          <span className="text-xs font-black" style={{ color: count > 0 ? t.color : '#D1D5DB' }}>
            {count}명
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${width}%`, backgroundColor: t.color }}/>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ── */
export default function TeamBalanceResult() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const groupCode  = useGroupStore(s => s.groupCode);
  const isEntered  = useGroupStore(s => s.isEntered);

  // Router state에서 선택 데이터 수신
  const selectedIds = location.state?.selectedIds;

  useEffect(() => {
    if (!isEntered) { navigate('/', { replace: true }); return; }
    // 직접 접근 / 새로고침 / 다른 사용자 → 선택 데이터 없으므로 선택 화면으로
    if (!selectedIds || selectedIds.length < 2) {
      navigate('/team-balance/select', { replace: true });
    }
  }, [isEntered, selectedIds, navigate]);

  if (!selectedIds || selectedIds.length < 2) return null;

  const members      = mockUsers.filter(u => selectedIds.includes(u.id));
  const distribution = calcTeamDistribution(members);
  const balanceScore = calcTeamBalanceScore(members);
  const scoreLabel   = getTeamScoreLabel(balanceScore);
  const analysis     = generateTeamAnalysis(members, distribution, balanceScore);

  const handleSupplement = () => {
    // 팀원 보충 플로우로 이동
    // 보충 화면은 별도 로컬 state로 관리되므로 데이터 전달 불필요
    navigate('/supplement/team-select');
  };

  return (
    <div className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 55%, #F0FDF9 100%)' }}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase">
              팀 밸런스 분석
            </p>
            <p className="text-base font-black text-gray-900">AI 협업 분석 결과</p>
          </div>
          <div className="ml-auto">
            {/* 개인 분석 뱃지 */}
            <div className="flex items-center gap-1 bg-purple-50 border border-purple-100
              px-2.5 py-1 rounded-full">
              <span className="text-[10px]">🔒</span>
              <span className="text-[10px] font-bold text-purple-600">나만 보기</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 max-w-md mx-auto space-y-3">

        {/* ① 팀 협업 점수 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                팀 협업 점수
              </p>
              <p className="text-lg font-black" style={{ color: scoreLabel.color }}>
                {scoreLabel.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{analysis.summary}</p>
            </div>
            <ScoreGauge score={balanceScore} color={scoreLabel.color} grade={scoreLabel.grade} />
          </div>

          {/* 팀원 칩 */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-50">
            {members.map(m => {
              const t = TYPES[m.dominantType];
              return (
                <div key={m.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full
                  border border-gray-100 bg-gray-50">
                  <span style={{ color: t?.color }} className="text-xs">{t?.emoji}</span>
                  <span className="text-xs font-semibold text-gray-700">{m.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ② 성향 분포 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-4">📊 성향 분포</p>
          <div className="space-y-3">
            {['A','B','C','D'].map(key => (
              <TypeBar key={key} typeKey={key} count={distribution[key] || 0} total={members.length}/>
            ))}
          </div>
        </div>

        {/* ③ 팀 강점 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-3">✅ 팀 강점</p>
          <div className="space-y-2">
            {analysis.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"/>
                <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ④ 보완 필요 */}
        <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5">
          <p className="text-sm font-black text-amber-800 mb-3">⚠️ 보완이 필요한 부분</p>
          <div className="space-y-2">
            {analysis.weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"/>
                <p className="text-sm text-amber-700 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ⑤ AI 추천 */}
        <div className="rounded-3xl p-5 border border-purple-100"
          style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EFF6FF 100%)' }}>
          <p className="text-sm font-black text-purple-800 mb-2">💡 AI 추천</p>
          <p className="text-sm text-purple-700 leading-relaxed">{analysis.recommendation}</p>
        </div>

        {/* ⑥ CTA */}
        <div className="pt-1">
          <button
            onClick={handleSupplement}
            className="w-full py-4 rounded-2xl font-bold text-base text-white
              transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)' }}
          >
            부족한 팀원 추천받기 →
          </button>
          <button
            onClick={() => navigate('/mode-select')}
            className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            처음으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
