/**
 * SupplementCount — 팀원 보충 1단계
 * BalanceCount와 동일한 스타일로 통일
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import ProgressBar   from '../components/ui/ProgressBar';

function NumField({ label, desc, value, onChange, min = 1, max = 20, color = '#10B981' }) {
  const num = parseInt(value) || 0;

  const handleChange = (e) => {
    const v = e.target.value.replace(/\D/g, '');
    onChange(v === '' ? '' : String(Math.min(max, Math.max(1, parseInt(v)))));
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
      <p className="text-sm font-black text-gray-900 mb-0.5">{label}</p>
      {desc && <p className="text-xs text-gray-400 mb-4">{desc}</p>}

      {/* BalanceCount와 동일한 레이아웃 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(String(Math.max(min, num - 1)))}
          className="w-12 h-12 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex-shrink-0"
        >−</button>

        <div className="text-center">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            className="text-5xl font-black text-gray-900 text-center w-24 border-b-2 border-gray-200 focus:outline-none transition-colors bg-transparent"
            style={{ borderColor: value ? color : undefined }}
          />
          <p className="text-sm text-gray-400 mt-1">명</p>
        </div>

        <button
          onClick={() => onChange(String(Math.min(max, num + 1)))}
          className="w-12 h-12 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex-shrink-0"
        >+</button>
      </div>
    </div>
  );
}

export default function SupplementCount() {
  const navigate  = useNavigate();
  const isEntered = useGroupStore(s => s.isEntered);
  const [current, setCurrent] = useState('');
  const [want,    setWant]    = useState('');

  if (!isEntered) { navigate('/'); return null; }

  const valid = parseInt(current) >= 2 && parseInt(want) >= 1;

  const handleNext = () => {
    if (!valid) return;
    navigate('/supplement/select', {
      state: { current: Number(current), want: Number(want) }
    });
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-6 pb-6">
        <ProgressBar current={1} total={3} showBack onBack={() => navigate('/group-home')} />

        <div className="mt-6 flex-1">
          <p className="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-2">팀원 보충 · Step 1</p>
          <h2 className="text-2xl font-black text-gray-900 mb-1">현재 팀 정보를 입력해주세요</h2>
          <p className="text-xs text-gray-400 mb-6">입력된 인원 수를 기준으로 분석해드립니다.</p>

          <div className="space-y-3">
            <NumField
              label="현재 편성된 팀원은 몇 명인가요?"
              desc="나 포함한 현재 확정 인원"
              value={current}
              onChange={setCurrent}
              min={1} max={20}
              color="#10B981"
            />
            <NumField
              label="몇 명을 더 보충하고 싶나요?"
              desc="추가로 필요한 인원 수"
              value={want}
              onChange={setWant}
              min={1} max={20}
              color="#3B82F6"
            />
          </div>
        </div>

        {/* ★ 현재 팀원 2명 미만 경고 */}
        {parseInt(current) === 1 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-3">
            <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              팀원 2명 이상부터 AI 팀 보충 추천을 사용할 수 있습니다.
            </p>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={!valid}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
