/**
 * BalanceCount — 팀 밸런스 1단계
 * 팀 인원 수 입력 (2~10명)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import ProgressBar   from '../components/ui/ProgressBar';

export default function BalanceCount() {
  const navigate  = useNavigate();
  const isEntered = useGroupStore(s => s.isEntered);
  const [count, setCount] = useState('');

  if (!isEntered) { navigate('/'); return null; }

  const num   = parseInt(count) || 0;
  const valid = num >= 2 && num <= 10;

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g,'');
    setCount(v === '' ? '' : String(Math.min(10, Math.max(1, parseInt(v)))));
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 55%, #F0FDF9 100%)' }}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-6 pb-6">
        <ProgressBar current={1} total={3} showBack onBack={() => navigate('/mode-select')} />
        <div className="mt-6 flex-1">
          <p className="text-xs font-bold text-purple-500 tracking-widest uppercase mb-2">팀 밸런스 분석 · Step 1</p>
          <h2 className="text-2xl font-black text-gray-900 mb-1">현재 팀은 총 몇 명인가요?</h2>
          <p className="text-xs text-gray-400 mb-8">2명 이상 10명 이하로 입력해주세요.</p>

          <div className="flex items-center justify-center gap-5">
            <button onClick={() => setCount(String(Math.max(2, num-1)))}
              className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">−</button>
            <div className="text-center">
              <input type="text" inputMode="numeric" value={count} onChange={handleChange}
                className="text-6xl font-black text-gray-900 text-center w-32 border-b-2 border-gray-200 focus:border-purple-400 focus:outline-none transition-colors bg-transparent"/>
              <p className="text-sm text-gray-400 mt-2">명</p>
            </div>
            <button onClick={() => setCount(String(Math.min(10, num+1)))}
              className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">+</button>
          </div>

          {count !== '' && !valid && num < 2 && <p className="text-xs text-red-400 text-center mt-4">최소 2명 이상이어야 합니다.</p>}
          {count !== '' && !valid && num > 10 && <p className="text-xs text-red-400 text-center mt-4">최대 10명까지 분석 가능합니다.</p>}
        </div>

        <button onClick={() => navigate('/balance/select', { state: { total: num } })}
          disabled={!valid}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)' }}>
          다음 →
        </button>
      </div>
    </div>
  );
}
