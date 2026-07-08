import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore  from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import ProgressBar   from '../components/ui/ProgressBar';

export default function OnboardingName() {
  const navigate  = useNavigate();
  const isEntered = useGroupStore(s => s.isEntered);
  const currentName = useGroupStore(s => s.currentName);
  const isCompleted = useGroupStore(s => s.isCurrentMemberCompleted);
  const { name: saved, setName } = useUserStore();
  const [value, setValue] = useState(saved || currentName || '');

  useEffect(() => {
    if (!isEntered) { navigate('/'); return; }
    // 세션에 이름이 있고 이미 완료한 경우 → AlreadyCompleted로
    if (currentName && isCompleted()) {
      navigate('/already-completed', { replace: true });
    }
  }, []);

  if (!isEntered) return null;

  const handleNext = () => {
    if (!value.trim()) return;
    setName(value.trim());
    navigate('/onboarding/domain');
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-6 pb-6">
        <ProgressBar current={1} total={4} showBack onBack={() => navigate('/')} />
        <div className="mt-8 flex-1">
          <p className="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-3">Step 1 · 기본 정보</p>
          <h2 className="text-2xl font-black text-gray-900 mb-2">이름이 어떻게 되세요?</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            추천 결과와 팀원 목록에 표시되니,<br />
            <span className="font-semibold text-gray-600">반드시 실명을 입력해주세요.</span>
          </p>
          <input type="text" value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleNext()}
            placeholder="" maxLength={10} autoFocus
            className="w-full border-b-2 border-gray-200 pb-3 text-2xl font-black text-gray-800
              focus:outline-none focus:border-emerald-400 transition-colors bg-transparent"/>
        </div>
        <button onClick={handleNext} disabled={!value.trim()}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ background:'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}>
          다음
        </button>
      </div>
    </div>
  );
}
