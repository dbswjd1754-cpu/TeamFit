import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import useUserStore from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import { BluePuzzleSmall } from '../components/ui/PuzzleCharacters';

export default function BasicInfo() {
  const navigate     = useNavigate();
  const isEntered    = useGroupStore(s => s.isEntered);
  const { name: savedName, setName } = useUserStore();
  const [value, setValue] = useState(savedName);

  if (!isEntered) { navigate('/'); return null; }

  const handleNext = () => {
    if (!value.trim()) return;
    setName(value.trim());
    navigate('/domain');
  };

  return (
    <PageLayout>
      <ProgressBar current={1} total={4} showBack onBack={() => navigate(-1)} />
      <div className="mt-8 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <BluePuzzleSmall size={28} />
          <p className="text-sm font-semibold text-brand-500">Step 1 · 이름</p>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">이름이 어떻게 되세요?</h2>
        <p className="text-gray-400 text-sm mb-8">추천 결과에 표시될 이름을 입력해주세요</p>
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleNext()}
          placeholder="이름 또는 닉네임"
          maxLength={10}
          autoFocus
          className="w-full border-b-2 border-gray-200 pb-3 text-2xl font-bold text-gray-800
            placeholder-gray-200 focus:outline-none focus:border-brand-500 transition-colors bg-transparent"
        />
      </div>
      <Button onClick={handleNext} disabled={!value.trim()}>다음</Button>
    </PageLayout>
  );
}
