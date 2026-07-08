import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import useTeamStore from '../store/useTeamStore';
import { GROUP_CODES } from '../data/mockUsers';

export default function SupplementGroupCode() {
  const navigate    = useNavigate();
  const setGroupCode = useTeamStore(s => s.setGroupCode);
  const [selected, setSelected] = useState('');
  const [custom, setCustom]     = useState('');
  const [mode, setMode]         = useState('select');

  const finalCode = mode === 'custom' ? custom.trim().toUpperCase() : selected;

  const handleNext = () => {
    if (!finalCode) return;
    setGroupCode(finalCode);
    navigate('/supplement/team-select');
  };

  return (
    <PageLayout>
      {/* 뒤로가기 */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-1/3 transition-all duration-500" />
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium">1 / 3</span>
      </div>

      <div className="flex-1">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full mb-4">
          <span className="text-emerald-600 text-xs font-semibold">🧩 팀원 보충</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">어느 그룹인가요?</h2>
        <p className="text-gray-400 text-sm mb-8">같은 그룹 안에서만 팀원을 찾아드려요</p>

        {mode === 'select' ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {GROUP_CODES.map(code => (
                <button
                  key={code}
                  onClick={() => setSelected(code)}
                  className={`py-4 rounded-2xl border-2 font-bold text-lg transition-all ${
                    selected === code
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            <button onClick={() => setMode('custom')} className="w-full text-sm text-gray-400 underline underline-offset-2 py-2">
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
              autoFocus
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-4 text-lg font-bold text-gray-800 placeholder-gray-300 focus:outline-none focus:border-emerald-500 transition-colors bg-white uppercase"
            />
            <button onClick={() => { setMode('select'); setCustom(''); }} className="w-full text-sm text-gray-400 underline underline-offset-2 py-2 mt-3">
              목록에서 선택할게요
            </button>
          </>
        )}
      </div>

      <Button
        onClick={handleNext}
        disabled={!finalCode}
        className="!bg-emerald-500 hover:!bg-emerald-600 disabled:!bg-emerald-200"
      >
        다음
      </Button>
    </PageLayout>
  );
}
