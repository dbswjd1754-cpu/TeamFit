/**
 * AnalysisLoading — 분석 로딩 화면
 * mode: 'supplement' | 'balance'
 *
 * 핵심 수정:
 *  - navigate에 replace 제거 → 결과 페이지에서 location.state 안전 수신
 *  - state 검증을 useEffect 내부에서 처리 (hooks 규칙 준수)
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* ── 퍼즐 애니메이션 ──
 * 0~40%   : 평소보다 약간 떨어진 상태에서 아주 약한 bounce로 흔들림
 * 40~80%  : easing과 함께 서서히 가까워짐
 * 80~100% : 퍼즐 홈(소켓)과 돌기가 정확히 맞물리는 위치까지 이동
 * done    : 완전히 맞물린 상태로 고정 + 짧은 scale pulse·반짝임
 *
 * SEP(0)  = 평소보다 떨어진 기준 위치 (각 조각 바깥쪽으로)
 * LOCK(1) = 실제로 소켓·돌기가 겹치는 맞물림 위치 (각 조각 안쪽으로 — 로고 캐릭터 아이콘 크기에 맞게 실측)
 */
const SEP  = 14;
const LOCK = 5.5;
const BOUNCE_AMPLITUDE = 3;

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// progress(0~100) → closeAmount(0~1): 0=떨어짐, 1=완전 맞물림
function closeAmountFor(progress) {
  if (progress <= 40) return 0;
  if (progress <= 80) {
    const t = (progress - 40) / 40;
    return easeInOutCubic(t) * 0.65;
  }
  const t = Math.min(1, (progress - 80) / 20);
  return 0.65 + easeInOutCubic(t) * 0.35;
}

function PuzzleAnimation({ progress, done }) {
  const leftRef  = useRef(null);
  const rightRef = useRef(null);
  const rafRef   = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (done) {
      // 완료 — 완전히 맞물린 위치로 고정 (더 이상 흔들리지 않음)
      if (leftRef.current)  leftRef.current.style.transform  = `translateX(${LOCK}px)`;
      if (rightRef.current) rightRef.current.style.transform = `translateX(${-LOCK}px)`;
      return;
    }

    const animate = (now) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;

      const c = closeAmountFor(progress);
      // 0~40% 구간에서만 살짝 남아있는 bounce — 40%부터는 자연스럽게 사라짐
      const bounceFade = Math.max(0, 1 - progress / 40);
      const sway = Math.sin(elapsed / 550) * BOUNCE_AMPLITUDE * bounceFade;

      const green = -SEP + c * (SEP + LOCK) - sway;
      const blue  = -green; // 항상 대칭으로 반대쪽에서 같은 만큼 이동

      if (leftRef.current)  leftRef.current.style.transform  = `translateX(${green}px)`;
      if (rightRef.current) rightRef.current.style.transform = `translateX(${blue}px)`;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [progress, done]);

  return (
    <div className="flex items-center justify-center" style={{ height: 90 }}>
      <div
        className={done ? 'puzzle-complete-pulse' : ''}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div ref={leftRef} style={{ transform: `translateX(${-SEP}px)` }}>
          <img src="/puzzle-icon-left-20260709.png" alt="" style={{ height: 72, width: 'auto', display: 'block' }} />
        </div>
        <div ref={rightRef} style={{ transform: `translateX(${SEP}px)` }}>
          <img src="/puzzle-icon-right-20260709.png" alt="" style={{ height: 68, width: 'auto', display: 'block' }} />
        </div>
        {done && (
          <>
            <span className="puzzle-sparkle" style={{ top: -6, left: 8 }}>✨</span>
            <span className="puzzle-sparkle" style={{ top: 4, right: 4, animationDelay: '0.15s' }}>✨</span>
            <span className="puzzle-sparkle" style={{ bottom: -4, left: '45%', animationDelay: '0.3s' }}>✨</span>
          </>
        )}
      </div>
      <style>{`
        .puzzle-complete-pulse {
          position: relative;
          animation: puzzlePulse 0.8s cubic-bezier(0.34,1.56,0.64,1) 1;
        }
        @keyframes puzzlePulse {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .puzzle-sparkle {
          position: absolute;
          font-size: 14px;
          opacity: 0;
          animation: puzzleSparkle 0.8s ease-out 1;
        }
        @keyframes puzzleSparkle {
          0%   { opacity: 0; transform: scale(0.4); }
          40%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(0.9) translateY(-6px); }
        }
      `}</style>
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

        <PuzzleAnimation progress={progress} done={done} />

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
