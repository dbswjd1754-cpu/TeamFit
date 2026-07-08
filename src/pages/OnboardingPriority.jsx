import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore  from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import ProgressBar   from '../components/ui/ProgressBar';

export const TEAM_STYLES = [
  { id: '빠른 실행력',        label: '빠른 실행력',        desc: '빠르게 MVP를 만들고 검증하는 팀',          emoji: '⚡', styleAffinity: ['A','D'] },
  { id: '체계적인 진행',      label: '체계적인 진행',      desc: '역할과 일정이 명확하게 관리되는 팀',        emoji: '📋', styleAffinity: ['A','C'] },
  { id: '다양한 아이디어',    label: '다양한 아이디어',    desc: '자유롭게 의견을 내고 실험하는 팀',          emoji: '💡', styleAffinity: ['B','C'] },
  { id: '원활한 소통',        label: '원활한 소통',        desc: '의견을 자주 공유하며 협업하는 팀',          emoji: '🤝', styleAffinity: ['B','D'] },
  { id: '높은 결과물 퀄리티', label: '높은 결과물 퀄리티', desc: '완성도 높은 결과물을 함께 만드는 팀',       emoji: '🏆', styleAffinity: ['C','B'] },
];

export default function OnboardingPriority() {
  const navigate  = useNavigate();
  const isEntered = useGroupStore(s => s.isEntered);
  const { priority: saved, setPriority } = useUserStore();
  const [selected, setSelected] = useState(saved || '');

  if (!isEntered) { navigate('/'); return null; }

  const handleNext = () => {
    if (!selected) return;
    setPriority(selected);
    navigate('/onboarding/test');
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-5 pt-4 pb-6">
        <ProgressBar current={3} total={4} showBack onBack={() => navigate(-1)} />

        <div className="mt-4 flex flex-col">
          {/* 스텝 라벨 */}
          <p className="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-2">
            Step 3 · 팀 선호 스타일
          </p>

          {/* 질문 (안내 문구 제거 — 질문만으로 충분) */}
          <h2 className="text-[21px] font-black text-gray-900 leading-snug mb-1">
            팀을 선택할 때 가장<br />중요하게 생각하는 것은?
          </h2>
          <p className="text-xs text-gray-400 mb-4">가장 중요하게 생각하는 한 가지를 선택해주세요.</p>

          {/* 선택지 카드 */}
          <div className="space-y-2">
            {TEAM_STYLES.map(style => {
              const isSelected = selected === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => setSelected(style.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2
                    text-left transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  {/* 이모지 */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                    text-lg transition-colors ${isSelected ? 'bg-emerald-100' : 'bg-gray-50'}`}>
                    {style.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm leading-tight ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>
                      {style.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {style.desc}
                    </p>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center
                    justify-center transition-all ${isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-gray-200'}`}>
                    {isSelected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 버튼 → AI 예고 문구 순서 (버튼이 먼저) */}
          <div className="mt-4">
            <button
              onClick={handleNext}
              disabled={!selected}
              className="w-full py-4 rounded-2xl font-bold text-base text-white
                transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
                active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed
                disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
            >
              성향 검사 시작하기 →
            </button>

            {/* AI 기대감 — 버튼 아래 */}
            <div className={`mt-2 text-center transition-all duration-300 ${
              selected ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              <p className="text-xs text-gray-400 leading-relaxed">
                다음 단계에서{' '}
                <span className="font-bold text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #10B981, #3B82F6)' }}>
                  AI가 가장 잘 맞는 팀원을 분석해드립니다.
                </span>{' '}✨
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
