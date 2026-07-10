/**
 * ProfileResult — "내 프로필 보기"
 *
 * 시작 화면에서 진입 — 그룹에 속하지 않은 상태에서도 접근 가능.
 * 성향검사 완료 직후 화면(OnboardingResult)과 동일한 PersonaResultView를
 * 재사용하되, 데이터는 전역 Persona 프로필(profiles/{name})에서 가져온다.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';
import { getUserProfileFromDB } from '../store/groupDB';
import PersonaResultView from '../components/persona/PersonaResultView';
import MyGroupsSheet from '../components/groups/MyGroupsSheet';

export default function ProfileResult() {
  const navigate     = useNavigate();
  const currentName  = useGroupStore(s => s.currentName);
  const isEntered    = useGroupStore(s => s.isEntered);

  const [profile, setProfile] = useState(null); // null = 로딩 중 또는 없음
  const [loading, setLoading] = useState(true);
  const [showMyGroups, setShowMyGroups] = useState(false);

  useEffect(() => {
    if (!isEntered || !currentName) { navigate('/', { replace: true }); return; }
    (async () => {
      const p = await getUserProfileFromDB(currentName);
      if (!p?.dominantType) { navigate('/', { replace: true }); return; }
      setProfile(p);
      setLoading(false);
    })();
  }, []);

  const handleRetake = () => {
    const { setName, setDomains, setPriority } = useUserStore.getState();
    setName(currentName);
    setDomains(profile.domains || []);
    setPriority(profile.priority || '');
    navigate('/onboarding/domain');
  };

  if (loading || !profile) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs text-gray-400">내 프로필을 불러오는 중...</p>
      </div>
    </div>
  );

  return (
    <>
      <PersonaResultView
        name={currentName}
        typeRatio={profile.typeRatio}
        dominantType={profile.dominantType}
        domains={profile.domains}
        priority={profile.priority}
        rawAnswerVector={profile.rawAnswerVector}
        header={
          <div className="mb-4">
            <button onClick={() => navigate('/')}
              className="text-gray-400 hover:text-gray-700 transition-colors mb-2 -ml-1 p-1">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="text-center">
              <p className="text-xs font-bold tracking-widest uppercase mb-1 text-emerald-500">
                내 프로필
              </p>
              <p className="text-sm text-gray-400">{currentName}님의 TeamFit Persona</p>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleRetake}
              className="w-full py-4 rounded-2xl font-bold text-base text-white
                hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}>
              성향 분석 다시하기
            </button>
            <button
              onClick={() => setShowMyGroups(true)}
              className="w-full py-4 rounded-2xl font-bold text-base text-gray-700
                bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-sm
                active:scale-[0.98] transition-all duration-150">
              내 그룹 바로가기
            </button>
          </div>
        }
      />
      {showMyGroups && <MyGroupsSheet onClose={() => setShowMyGroups(false)}/>}
    </>
  );
}
