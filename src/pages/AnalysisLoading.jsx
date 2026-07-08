/**
 * AnalysisLoading — 분석 로딩 화면
 * mode: 'supplement' | 'balance'
 *
 * 핵심 수정:
 *  - navigate에 replace 제거 → 결과 페이지에서 location.state 안전 수신
 *  - state 검증을 useEffect 내부에서 처리 (hooks 규칙 준수)
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ── 퍼즐 애니메이션 ── */
function PuzzleAnimation() {
  const [apart, setApart] = useState(false);

  useEffect(() => {
    const tick = () => {
      setApart(true);
      setTimeout(() => setApart(false), 800);
    };
    tick();
    const id = setInterval(tick, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center" style={{ height: 90 }}>
      <div style={{
        transform: apart ? 'translateX(-14px)' : 'translateX(0)',
        transition: 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <svg width="64" height="64" viewBox="0 0 66 66" fill="none">
          <rect x="4" y="14" width="44" height="44" rx="10" fill="#7DCFB6"/>
          <ellipse cx="26" cy="11" rx="8" ry="7" fill="#7DCFB6"/>
          <ellipse cx="48" cy="36" rx="7" ry="8" fill="#ECFDF5"/>
          <ellipse cx="26" cy="59" rx="8" ry="7" fill="#7DCFB6"/>
          <rect x="9" y="19" width="34" height="34" rx="8" fill="#8ED8C4" opacity="0.35"/>
          <ellipse cx="19" cy="34" rx="3.2" ry="3.6" fill="#2D6A5A"/>
          <ellipse cx="18" cy="33" rx="1" ry="1" fill="white" opacity="0.9"/>
          <ellipse cx="35" cy="34" rx="3.2" ry="3.6" fill="#2D6A5A"/>
          <ellipse cx="34" cy="33" rx="1" ry="1" fill="white" opacity="0.9"/>
          <path d="M21 42 Q27 48 33 42" stroke="#2D6A5A" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <ellipse cx="14" cy="40" rx="3" ry="2" fill="#F9A8D4" opacity="0.55"/>
          <ellipse cx="40" cy="40" rx="3" ry="2" fill="#F9A8D4" opacity="0.55"/>
        </svg>
      </div>
      <div style={{
        transform: apart ? 'translateX(14px)' : 'translateX(0)',
        transition: 'transform 0.55s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <svg width="64" height="64" viewBox="0 0 66 66" fill="none">
          <rect x="18" y="14" width="44" height="44" rx="10" fill="#93C5FD"/>
          <ellipse cx="18" cy="36" rx="7" ry="8" fill="#93C5FD"/>
          <ellipse cx="40" cy="11" rx="8" ry="7" fill="#EFF6FF"/>
          <ellipse cx="40" cy="59" rx="8" ry="7" fill="#93C5FD"/>
          <rect x="23" y="19" width="34" height="34" rx="8" fill="#BAD9FC" opacity="0.35"/>
          <ellipse cx="31" cy="34" rx="3.2" ry="3.6" fill="#1E3A8A"/>
          <ellipse cx="30" cy="33" rx="1" ry="1" fill="white" opacity="0.9"/>
          <ellipse cx="47" cy="34" rx="3.2" ry="3.6" fill="#1E3A8A"/>
          <ellipse cx="46" cy="33" rx="1" ry="1" fill="white" opacity="0.9"/>
          <path d="M33 42 Q39 48 45 42" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <ellipse cx="26" cy="40" rx="3" ry="2" fill="#F9A8D4" opacity="0.55"/>
          <ellipse cx="52" cy="40" rx="3" ry="2" fill="#F9A8D4" opacity="0.55"/>
        </svg>
      </div>
    </div>
  );
}

const STEPS = {
  supplement: [
    '현재 팀 성향 분석 중...',
    '부족한 협업 스타일 계산 중...',
    '가장 적합한 팀원을 찾는 중...',
    '추천 결과를 생성하는 중...',
  ],
  balance: [
    '팀원의 성향을 분석하는 중...',
    '팀 밸런스를 계산하는 중...',
    '협업 시너지를 분석하는 중...',
    '최적의 팀 구성을 도출하는 중...',
  ],
};

const TOTAL_DURATION = 3000;

export default function AnalysisLoading({ mode = 'supplement' }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const steps     = STEPS[mode];
  const stepDuration = TOTAL_DURATION / steps.length;

  const [step,     setStep]     = useState(0);
  const [progress, setProgress] = useState(0);
  const [done,     setDone]     = useState(false);
  // 전달받은 state를 로컬에 보관 — navigate 후에도 유지
  const [savedState, setSavedState] = useState(null);

  useEffect(() => {
    const incoming = location.state;

    // state 없으면 해당 플로우 시작으로 돌아감
    if (!incoming || (!Array.isArray(incoming.selected) && !Array.isArray(incoming.selectedIds))) {
      navigate(
        mode === 'supplement' ? '/supplement/count' : '/balance/count',
        { replace: true }
      );
      return;
    }

    // state 로컬 보관 (navigate 시 사라지지 않도록)
    setSavedState(incoming);

    const timers = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setStep(i);
        setProgress(Math.round(((i + 1) / steps.length) * 100));
      }, i * stepDuration));
    });

    timers.push(setTimeout(() => {
      setProgress(100);
      setDone(true);
    }, TOTAL_DURATION));

    return () => timers.forEach(clearTimeout);
  }, []);

  const dest = mode === 'supplement' ? '/supplement/result' : '/balance/result';

  const handleGo = () => {
    // ✅ replace 없이 push + 로컬에 보관한 state 전달
    navigate(dest, { state: savedState });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-7">

        <PuzzleAnimation />

        {!done ? (
          <>
            <div className="text-center">
              <p className="font-black text-lg text-gray-900 mb-1">
                {mode === 'supplement' ? 'AI 팀원 추천 분석' : 'AI 팀 밸런스 분석'}
              </p>
              <p className="text-sm text-gray-400">현재 팀원의 성향을 분석하고 있습니다...</p>
            </div>

            <div className="w-full">
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span className="leading-relaxed">{steps[step]}</span>
                <span className="font-bold text-emerald-600 flex-shrink-0 ml-2">{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width:`${progress}%`, background:'linear-gradient(90deg,#10B981 0%,#3B82F6 100%)' }}/>
              </div>
            </div>

            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= step ? 'bg-emerald-400' : 'bg-gray-200'
                } ${i === step ? 'w-6' : 'w-1.5'}`}/>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-5">
            <div className="w-full">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-emerald-600 font-semibold">분석 완료!</span>
                <span className="font-bold text-emerald-600">100%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width:'100%', background:'linear-gradient(90deg,#10B981 0%,#3B82F6 100%)' }}/>
              </div>
            </div>

            <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-gray-50 text-center">
              <div className="text-2xl mb-2">🎉</div>
              <p className="font-black text-gray-900 text-base mb-1">분석이 완료되었어요!</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                {mode === 'supplement'
                  ? '현재 팀의 성향을 바탕으로\n부족한 팀원을 추천해드릴게요.'
                  : '현재 팀의 협업 밸런스\n분석 결과를 확인해보세요.'}
              </p>
            </div>

            {/* ✅ savedState가 있을 때만 버튼 활성화 */}
            <button
              onClick={handleGo}
              disabled={!savedState}
              className="w-full py-4 rounded-2xl font-bold text-base text-white
                hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
            >
              {mode === 'supplement'
                ? '우리 팀에 맞는 추천 팀원 보러가기 →'
                : '팀 밸런스 리포트 확인하기 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
