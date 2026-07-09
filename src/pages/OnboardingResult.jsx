/**
 * OnboardingResult — 성향 분석 결과 + Persona 시스템
 *
 * [절대 변경 금지]
 *   - handleGoToRecommend 로직
 *   - navigate 경로
 *   - useUserStore / useGroupStore 구독
 *
 * 실제 화면 렌더링은 PersonaResultView(공용 컴포넌트)에 위임한다.
 * ("내 프로필 보기" 화면과 동일 컴포넌트/동일 데이터 공유)
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore   from '../store/useUserStore';
import useGroupStore  from '../store/useGroupStore';
import PersonaResultView from '../components/persona/PersonaResultView';

export default function OnboardingResult() {
  const navigate     = useNavigate();
  const isEntered    = useGroupStore(s => s.isEntered);
  const isLoading    = useGroupStore(s => s.isLoading);   // Firebase 로딩 대기
  const dominantType = useUserStore(s => s.dominantType);
  const typeRatio    = useUserStore(s => s.typeRatio);
  const name         = useUserStore(s => s.name);
  const domains      = useUserStore(s => s.domains);
  const priority     = useUserStore(s => s.priority);
  const rawAnswerVector = useUserStore(s => s.rawAnswerVector);

  // ★ 성향검사 완료 후 → 홈으로 이동 (Home 기반 추천 시스템 사용)
  const handleGoToHome = () => navigate('/group-home');

  useEffect(() => {
    // Firebase hydration 완료 전 isLoading=true 동안은 redirect 하지 않음
    if (isLoading) return;
    if (!isEntered) navigate('/', { replace: true });
    else if (!dominantType) navigate('/onboarding/name', { replace: true });
  }, [isEntered, dominantType, isLoading]); // navigate 제거 — 참조 변경으로 루프 방지

  // Firebase 로딩 중이면 대기 (빈 화면 대신 로딩 표시)
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs text-gray-400">데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  if (!dominantType) return null;

  return (
    <PersonaResultView
      name={name}
      typeRatio={typeRatio}
      dominantType={dominantType}
      domains={domains}
      priority={priority}
      rawAnswerVector={rawAnswerVector}
      footer={
        <>
          <p className="text-center text-xs text-gray-400 mb-3">
            홈에서 팀원 찾기, 팀원 보충, 팀 밸런스 분석을 이용할 수 있어요
          </p>
          <button
            onClick={handleGoToHome}
            className="w-full py-4 rounded-2xl font-bold text-base text-white
              hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            style={{ background:'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}>
            팀원 추천 받기 →
          </button>
        </>
      }
    />
  );
}
