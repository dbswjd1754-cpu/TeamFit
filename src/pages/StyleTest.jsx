import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import ProgressBar from '../components/ui/ProgressBar';
import useUserStore from '../store/useUserStore';
import { questions } from '../data/questions';

export default function StyleTest() {
  const navigate = useNavigate();
  const { addAnswer, answers, finalizeTest } = useUserStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(false);

  const q = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  // 기존 답변 복원 (뒤로가기 시)
  useEffect(() => {
    const prev = answers.find(a => a.questionId === q.id);
    setSelected(prev ? prev.selectedKey : null);
  }, [currentIdx]);

  const handleSelect = (option) => {
    if (animating) return;
    setSelected(option.key);

    // 답변 저장
    addAnswer({ questionId: q.id, selectedKey: option.key, type: option.type });

    // 짧은 딜레이 후 다음으로
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      if (isLast) {
        finalizeTest();
        navigate('/my-result');
      } else {
        setCurrentIdx(i => i + 1);
        setSelected(null);
      }
    }, 380);
  };

  const handleBack = () => {
    if (currentIdx === 0) {
      navigate(-1);
    } else {
      setCurrentIdx(i => i - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-5 pt-8 pb-4 max-w-md mx-auto w-full">
        <ProgressBar current={currentIdx + 1} total={questions.length} showBack onBack={handleBack} />
      </div>

      <div className="flex-1 flex flex-col px-5 pb-8 max-w-md mx-auto w-full">
        {/* 상황 카드 */}
        <div className="mt-6 mb-6">
          <div className="bg-gray-50 rounded-2xl px-5 py-4 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">상황</p>
            <p className="text-gray-700 text-sm leading-relaxed">{q.situation}</p>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{q.question}</h2>
        </div>

        {/* 선택지 */}
        <div className="space-y-3 flex-1">
          {q.options.map((option) => {
            const isSelected = selected === option.key;
            return (
              <button
                key={option.key}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50 scale-[0.99]'
                    : 'border-gray-100 bg-white hover:border-gray-200 active:scale-[0.98]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-200'
                  }`}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed font-medium ${isSelected ? 'text-brand-700' : 'text-gray-700'}`}>
                    {option.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
