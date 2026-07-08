import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore  from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import { questions } from '../data/questions';

const AI_HINTS = [
  'AI가 팀워크 프로필을 분석하는 중입니다',
  '협업 스타일 데이터를 수집하는 중입니다',
  'AI가 의사결정 패턴을 학습하는 중입니다',
  '팀원 추천 알고리즘을 업데이트하는 중입니다',
  '팀원들의 선택 패턴을 비교하는 중입니다',
  '당신만의 협업 성향을 분석하는 중입니다',
  '프로젝트 운영 스타일을 파악하는 중입니다',
  '팀원 매칭 점수를 계산하는 중입니다',
  'AI 분석이 거의 완료되어 가고 있습니다',
  '곧 가장 잘 맞는 팀원을 추천해드릴게요',
];

/* ... 애니메이션 컴포넌트 */
function AnimatedDots() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const timer = setInterval(() => {
      setDots(d => d >= 3 ? 1 : d + 1);
    }, 500);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="inline-block w-4 text-left">{'.'.repeat(dots)}</span>
  );
}

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #D1FAE5 0%, #DBEAFE 100%)',
  'linear-gradient(135deg, #E0F2FE 0%, #EDE9FE 100%)',
  'linear-gradient(135deg, #DCFCE7 0%, #D1FAE5 100%)',
  'linear-gradient(135deg, #FEF3C7 0%, #D1FAE5 100%)',
  'linear-gradient(135deg, #FEE2E2 0%, #DBEAFE 100%)',
  'linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 100%)',
  'linear-gradient(135deg, #D1FAE5 0%, #FEF3C7 100%)',
  'linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 100%)',
  'linear-gradient(135deg, #E0F2FE 0%, #D1FAE5 100%)',
  'linear-gradient(135deg, #1E293B 0%, #1E3A5F 100%)',
];
const CARD_TEXT_DARK = [false,false,false,false,false,false,false,false,false,true];

export default function OnboardingTest() {
  const navigate  = useNavigate();
  const isEntered = useGroupStore(s => s.isEntered);
  const { addAnswer, answers, finalizeTest } = useUserStore();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected]     = useState(null);
  const [animating, setAnimating]   = useState(false);
  const [cardVisible, setCardVisible] = useState(true);

  if (!isEntered) { navigate('/'); return null; }

  const q      = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const prog   = Math.round((currentIdx / questions.length) * 100);
  const isDark = CARD_TEXT_DARK[currentIdx];
  const hint   = AI_HINTS[currentIdx];

  useEffect(() => {
    const prev = answers.find(a => a.questionId === q.id);
    setSelected(prev ? prev.selectedKey : null);
  }, [currentIdx]);

  const handleSelect = option => {
    if (animating) return;
    setSelected(option.key);
    addAnswer({ questionId: q.id, selectedKey: option.key, type: option.type });
    setAnimating(true);
    setTimeout(() => setCardVisible(false), 180);
    setTimeout(() => {
      setAnimating(false);
      setCardVisible(true);
      if (isLast) {
        finalizeTest().then(() => navigate('/onboarding/result'));
      } else {
        setCurrentIdx(i => i + 1);
        setSelected(null);
      }
    }, 360);
  };

  const handleBack = () => {
    if (currentIdx === 0) navigate(-1);
    else { setCurrentIdx(i => i - 1); setSelected(null); }
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto w-full px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={handleBack}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex-1 h-2 bg-white/70 rounded-full overflow-hidden shadow-inner">
            <div className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${prog}%`, background: 'linear-gradient(90deg, #10B981 0%, #3B82F6 100%)' }}/>
          </div>

          <div className="flex-shrink-0 text-right min-w-[36px]">
            <span className="text-xs font-black text-gray-600">{currentIdx + 1}</span>
            <span className="text-xs text-gray-400 font-normal"> / 10</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase">
            Step 4 · 협업 성향 검사
          </p>
          <p className="text-[10px] font-bold text-gray-400 tracking-wide">
            Question {currentIdx + 1} / 10
          </p>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div
        className="flex-1 flex flex-col px-4 pt-1 pb-4 max-w-md mx-auto w-full"
        style={{
          opacity: cardVisible ? 1 : 0,
          transform: cardVisible ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {/* 상황 카드: sceneTag 배너 제거, 아이콘 배경 투명 */}
        <div className="rounded-3xl px-4 py-4 mb-5 shadow-sm"
          style={{ background: CARD_GRADIENTS[currentIdx] }}>

          {/* 카드 상단: 제목 + 이모지 (배경 없이) */}
          <div className="flex items-start justify-between mb-2">
            <h3 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {q.title}
            </h3>
            {/* 아이콘 — 투명 배경 */}
            <span className="text-2xl ml-2 leading-none flex-shrink-0">{q.scene}</span>
          </div>

          <div className={`h-px mb-3 ${isDark ? 'bg-white/15' : 'bg-gray-900/8'}`} />

          <p className={`text-sm leading-relaxed ${isDark ? 'text-white/85' : 'text-gray-700'}`}>
            {q.situation}
          </p>
        </div>

        {/* 질문 */}
        <p className="text-sm font-bold text-gray-800 mb-3 px-0.5">
          {q.question.startsWith('👉') ? (
            <>
              <span className="mr-2">👉</span>
              <span>{q.question.slice(2).trimStart()}</span>
            </>
          ) : q.question}
        </p>

        {/* 선택지 */}
        <div className="space-y-2">
          {q.options.map((option, idx) => {
            const isSelected = selected === option.key;
            return (
              <button
                key={option.key}
                onClick={() => handleSelect(option)}
                style={{ transitionDelay: `${idx * 15}ms` }}
                className={`w-full text-left px-4 py-3 rounded-2xl border-2
                  transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50 shadow-md scale-[0.99]'
                    : 'border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                    flex items-center justify-center transition-all ${
                    isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-gray-200'
                  }`}>
                    {isSelected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed font-medium ${
                    isSelected ? 'text-emerald-700' : 'text-gray-700'
                  }`}>
                    {option.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* AI 분석 진행 안내 */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {/* AI 아이콘 — 분석 중 */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            className="text-emerald-400 flex-shrink-0">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-xs text-gray-500 font-medium">
            {hint}<AnimatedDots />
          </p>
        </div>
      </div>
    </div>
  );
}
