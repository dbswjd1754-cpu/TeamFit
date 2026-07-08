import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import useUserStore from '../store/useUserStore';
import { GROUP_CODES } from '../data/mockUsers';

export default function GroupCode() {
  const navigate = useNavigate();
  const setGroupCode = useUserStore(s => s.setGroupCode);
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState('select'); // 'select' | 'custom'

  const finalCode = mode === 'custom' ? custom.trim().toUpperCase() : selected;

  const handleNext = () => {
    if (!finalCode) return;
    setGroupCode(finalCode);
    navigate('/basic-info');
  };

  return (
    <PageLayout>
      <ProgressBar current={1} total={5} showBack onBack={() => navigate(-1)} />

      <div className="mt-8 flex-1">
        <p className="text-sm font-semibold text-brand-500 mb-2">Step 1</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">어느 그룹인가요?</h2>
        <p className="text-gray-400 text-sm mb-8">같은 그룹 안에서만 팀원을 추천해드려요</p>

        {mode === 'select' ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {GROUP_CODES.map(code => (
                <button
                  key={code}
                  onClick={() => setSelected(code)}
                  className={`py-4 rounded-2xl border-2 font-bold text-lg transition-all ${
                    selected === code
                      ? 'border-brand-500 bg-brand-50 text-brand-600'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMode('custom')}
              className="w-full text-sm text-gray-400 underline underline-offset-2 py-2"
            >
              목록에 없어요, 직접 입력할게요
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="그룹 코드 입력 (예: PM8)"
              maxLength={10}
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-4 text-lg font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-brand-500 transition-colors bg-white uppercase"
            />
            <button
              onClick={() => { setMode('select'); setCustom(''); }}
              className="w-full text-sm text-gray-400 underline underline-offset-2 py-2 mt-3"
            >
              목록에서 선택할게요
            </button>
          </>
        )}
      </div>

      <Button onClick={handleNext} disabled={!finalCode}>
        다음
      </Button>
    </PageLayout>
  );
}
