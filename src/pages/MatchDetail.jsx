import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useUserStore from '../store/useUserStore';
import { TYPES } from '../data/questions';
import { getScoreLabel } from '../utils/scoring';
import TypeBadge from '../components/ui/TypeBadge';

/* ── 원형 점수 게이지 ─────────────────────────────── */
function ScoreGauge({ score, color }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 120); return () => clearTimeout(t); }, []);

  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (animated ? score / 100 : 0));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F3F4F6" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className="text-4xl font-bold leading-none" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-400 mt-1">/ 100점</p>
      </div>
    </div>
  );
}

/* ── 항목 점수 바 ─────────────────────────────────── */
function MatchScoreBar({ label, score, maxScore, weight, color, delay = 0 }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay + 200);
    return () => clearTimeout(t);
  }, [score, delay]);

  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100
            px-1.5 py-0.5 rounded-full">{weight}%</span>
        </div>
        <span className="text-sm font-black" style={{ color }}>
          {score}<span className="text-xs text-gray-400 font-normal">/{maxScore}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(width / maxScore) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
export default function MatchDetail() {
  const { userId } = useParams();
  const navigate   = useNavigate();

  const recommendations = useUserStore(s => s.recommendations);
  const myName         = useUserStore(s => s.name);
  const myDominantType = useUserStore(s => s.dominantType);
  const myDomains      = useUserStore(s => s.domains) || [];
  const myPriority     = useUserStore(s => s.priority);

  const rec = recommendations.find(r => r.user.id === userId);

  if (!rec) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">추천 정보를 찾을 수 없어요</p>
          <button onClick={() => navigate('/recommend')}
            className="text-brand-500 font-semibold text-sm">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { user, scores, scoreLabel, reasons, strengths, tip } = rec;
  const commonDomains = myDomains.filter(d => user.domains.includes(d));

  /* ── 매칭 기준별 설명 ── */
  const CRITERIA = [
    {
      label: '성향 궁합',
      weight: 40,
      score: scores.style,
      maxScore: 40,
      color: '#4F6EF7',
      desc: scores.style >= 32
        ? '성향이 매우 유사합니다.'
        : scores.style >= 24
        ? '협업 방식이 잘 맞습니다.'
        : scores.style >= 16
        ? '큰 방향에서 맞추기 수월합니다.'
        : '서로 다른 시각으로 다양성을 확보합니다.',
    },
    {
      label: '관심 도메인',
      weight: 30,
      score: scores.domain,
      maxScore: 30,
      color: '#10B981',
      desc: commonDomains.length >= 3
        ? `관심 도메인이 ${commonDomains.length}개 일치합니다.`
        : commonDomains.length >= 1
        ? `관심 도메인 ${commonDomains.join(', ')}이 일치합니다.`
        : '공통 관심 도메인이 없어요.',
    },
    {
      label: '협업 스타일',
      weight: 20,
      score: Math.round(scores.priority * (20 / 20)),
      maxScore: 20,
      color: '#8B5CF6',
      desc: scores.priority >= 18
        ? '프로젝트 진행 방식이 비슷합니다.'
        : scores.priority >= 12
        ? '협업 접근 방식이 어느 정도 맞습니다.'
        : `나: "${myPriority}" · ${user.name}: "${user.priority}"`,
    },
    {
      label: '프로젝트 경험',
      weight: 10,
      score: Math.round(scores.style * 0.2),
      maxScore: 10,
      color: '#F59E0B',
      desc: '성향 분석 기반 프로젝트 적합도입니다.',
    },
  ];

  /* ── AI 매칭 포인트 (자연어) ── */
  const matchPoints = [
    scores.style >= 24 && '성향이 매우 유사합니다.',
    commonDomains.length > 0 && `관심 도메인이 ${commonDomains.length}개 일치합니다.`,
    scores.priority >= 16 && '협업 스타일이 잘 맞습니다.',
    scores.priority >= 12 && '프로젝트 진행 방식이 비슷합니다.',
    scores.style < 16 && '서로 다른 시각으로 아이디어를 보완합니다.',
  ].filter(Boolean).slice(0, 4);

  return (
    <div className="min-h-screen bg-surface">

      {/* 상단 네비 */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4
        max-w-md mx-auto flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          aria-label="뒤로가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="font-bold text-gray-900">매칭 상세 분석</h1>
      </div>

      <div className="px-5 py-5 max-w-md mx-auto space-y-4 pb-12">

        {/* ① 매칭 적합도 — 강조 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col items-center mb-5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              매칭 적합도
            </p>
            <ScoreGauge score={scores.total} color={scoreLabel.color} />
            <p className="text-base font-bold mt-3" style={{ color: scoreLabel.color }}>
              {scoreLabel.label}
            </p>
            <p className="text-xs text-gray-400 mt-1">{myName} × {user.name}</p>
          </div>

          {/* 유형 비교 */}
          <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-50">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1.5">나</p>
              <TypeBadge typeKey={myDominantType} size="md" />
            </div>
            <div className="text-gray-300 text-xl font-light">×</div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1.5">{user.name}</p>
              <TypeBadge typeKey={user.dominantType} size="md" />
            </div>
          </div>
        </div>

        {/* ② AI 매칭 포인트 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-5
          border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center
              justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-black text-blue-900">AI 매칭 포인트</p>
          </div>
          <div className="space-y-2">
            {matchPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-blue-400 font-black text-xs flex-shrink-0">•</span>
                <span className="text-sm text-blue-800">{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ③ 점수 계산 기준 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-1">📊 매칭 적합도 계산 기준</p>
          <p className="text-xs text-gray-400 mb-4">
            아래 4가지 항목을 종합하여 {scores.total}점이 산출됩니다
          </p>
          <div className="space-y-4">
            {CRITERIA.map((c, i) => (
              <div key={i}>
                <MatchScoreBar
                  label={c.label}
                  score={c.score}
                  maxScore={c.maxScore}
                  weight={c.weight}
                  color={c.color}
                  delay={i * 80}
                />
                <p className="text-xs text-gray-400 mt-1.5 pl-0.5">{c.desc}</p>
              </div>
            ))}
            {/* 합계 */}
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <span className="text-sm font-black text-gray-600">최종 매칭 적합도</span>
              <span className="text-base font-black" style={{ color: scoreLabel.color }}>
                {scores.total}점
              </span>
            </div>
          </div>
        </div>

        {/* ④ 추천 이유 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-3">💬 왜 잘 맞는 팀원인가요?</p>
          <div className="space-y-2.5">
            {reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center
                  justify-center flex-shrink-0 mt-0.5">
                  <span className="text-brand-500 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ⑤ 함께할 때 강점 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-3">✅ 함께할 때 강점</p>
          <div className="space-y-2.5">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ⑥ 협업 팁 */}
        <div className="rounded-3xl p-5 border border-amber-100 bg-amber-50">
          <p className="text-sm font-bold text-amber-800 mb-2">⚠️ 협업 팁</p>
          <p className="text-sm text-amber-700 leading-relaxed">{tip}</p>
        </div>

        {/* ⑦ 상대방 프로필 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-3">👤 {user.name} 프로필</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0 mt-1">관심 도메인</span>
              <div className="flex flex-wrap gap-1.5">
                {user.domains.map(d => {
                  const isMatch = commonDomains.includes(d);
                  return (
                    <span key={d}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        isMatch
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                      {isMatch ? '✓ ' : ''}{d}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-20 flex-shrink-0">협업 스타일</span>
              <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
                {user.priority}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
