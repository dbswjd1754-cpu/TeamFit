import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import useUserStore from '../store/useUserStore';

const DOMAINS = [
  { id: '핀테크', emoji: '💳' },
  { id: '헬스케어', emoji: '🏥' },
  { id: '이커머스', emoji: '🛍️' },
  { id: '에듀테크', emoji: '📚' },
  { id: 'SaaS', emoji: '🖥️' },
  { id: '소셜', emoji: '💬' },
  { id: '푸드테크', emoji: '🍽️' },
  { id: '여행/숙박', emoji: '✈️' },
  { id: '부동산', emoji: '🏠' },
  { id: '엔터테인먼트', emoji: '🎮' },
];

export default function Domain() {
  const navigate = useNavigate();
  const { domains: savedDomains, setDomains } = useUserStore();
  const [selected, setSelected] = useState(savedDomains || []);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(d => d !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const handleNext = () => {
    if (!selected.length) return;
    setDomains(selected);
    navigate('/priority');
  };

  return (
    <PageLayout>
      <ProgressBar current={2} total={4} showBack onBack={() => navigate(-1)} />

      <div className="mt-8 flex-1">
        <p className="text-sm font-semibold text-brand-500 mb-2">Step 3</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">관심 도메인을 선택해주세요</h2>
        <p className="text-gray-400 text-sm mb-6">최대 3개까지 선택할 수 있어요
          <span className="ml-2 font-semibold text-brand-500">{selected.length}/3</span>
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {DOMAINS.map(d => {
            const isSelected = selected.includes(d.id);
            const isDisabled = !isSelected && selected.length >= 3;
            return (
              <button
                key={d.id}
                onClick={() => toggle(d.id)}
                disabled={isDisabled}
                className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all text-left ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : isDisabled
                    ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                }`}
              >
                <span className="text-lg">{d.emoji}</span>
                <span>{d.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={handleNext} disabled={!selected.length}>
          다음
        </Button>
      </div>
    </PageLayout>
  );
}
