import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import useUserStore from '../store/useUserStore';

const PRIORITIES = [
  { id: '취업용 포트폴리오', emoji: '💼', desc: '결과물이 포트폴리오에 담길 수 있는 퀄리티' },
  { id: '높은 완성도', emoji: '✨', desc: '완성도 높은 프로덕트를 만들고 싶다' },
  { id: '빠른 MVP 제작', emoji: '⚡', desc: '핵심 기능만 빠르게 만들어 검증하고 싶다' },
  { id: '새로운 아이디어 검증', emoji: '💡', desc: '새로운 아이디어나 가설을 프로젝트로 풀고 싶다' },
  { id: '협업 경험', emoji: '🤝', desc: '좋은 팀워크와 협업 프로세스를 경험하고 싶다' },
];

export default function Priority() {
  const navigate = useNavigate();
  const { priority: savedPriority, setPriority } = useUserStore();
  const [selected, setSelected] = useState(savedPriority || '');

  const handleNext = () => {
    if (!selected) return;
    setPriority(selected);
    navigate('/style-test');
  };

  return (
    <PageLayout>
      <ProgressBar current={3} total={4} showBack onBack={() => navigate(-1)} />

      <div className="mt-8 flex-1">
        <p className="text-sm font-semibold text-brand-500 mb-2">Step 4</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">이번 프로젝트에서 가장 중요한 것은?</h2>
        <p className="text-gray-400 text-sm mb-6">하나만 선택해주세요</p>

        <div className="space-y-2.5">
          {PRIORITIES.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full flex items-start gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                selected === p.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <span className="text-2xl mt-0.5">{p.emoji}</span>
              <div>
                <p className={`font-semibold text-sm ${selected === p.id ? 'text-brand-600' : 'text-gray-800'}`}>
                  {p.id}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
              <div className={`ml-auto mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                selected === p.id ? 'border-brand-500 bg-brand-500' : 'border-gray-200'
              }`}>
                {selected === p.id && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={handleNext} disabled={!selected}>
          다음
        </Button>
      </div>
    </PageLayout>
  );
}
