import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import { buildPersona } from '../utils/persona';
import { TeamFitLogo } from '../components/ui/PuzzleCharacters';

export default function AlreadyCompleted() {
  const navigate   = useNavigate();
  const groupCode  = useGroupStore(s => s.groupCode);
  const isEntered  = useGroupStore(s => s.isEntered);
  const currentName = useGroupStore(s => s.currentName);
  const getCurrentMember = useGroupStore(s => s.getCurrentMember);

  useEffect(() => {
    if (!isEntered) { navigate('/'); return; }
    if (!currentName) { navigate('/onboarding/name'); return; }
  }, []);

  const member  = getCurrentMember();
  // ★ Persona 생성 (typeRatio 기반 — buildPersona와 동일 로직)
  const _scores = member?.profile?.scores || {};
  const _ratio  = { A:_scores.추진||0, B:_scores.소통||0, C:_scores.탐구||0, D:_scores.실행||0 };
  const persona = member ? buildPersona(_ratio) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style={{ background:'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-5">

        {/* 로고 */}
        <TeamFitLogo size={80} />

        {/* 환영 카드 */}
        <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-50 text-center">
          <div className="text-3xl mb-3">👋</div>
          <h2 className="text-xl font-black text-gray-900 mb-1">
            안녕하세요, {currentName}님
          </h2>
          {persona && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-3 bg-gray-100">
              <span className="text-base">{persona.emoji}</span>
              <div>
                <p className="text-sm font-black text-gray-800 leading-tight">{persona.name}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{persona.en}</p>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500 leading-relaxed">
            이미 성향 분석이 완료되었습니다.<br />
            언제든 내 성향 프로필을 확인하거나<br />
            그룹 분석 기능을 이용할 수 있습니다.
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
            <span className="font-bold text-gray-600">{groupCode}</span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="w-full flex flex-col gap-3">
          <button onClick={() => navigate('/group-home', { state: { tab: 'profile' } })}
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
              hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            style={{ background:'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}>
            Persona 결과 보기
          </button>
          <button onClick={() => navigate('/group-home')}
            className="w-full py-4 rounded-2xl font-bold text-base text-gray-700
              bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-sm
              active:scale-[0.98] transition-all duration-150">
            그룹 홈으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
