import { useEffect } from 'react';
import { useNavigate }   from 'react-router-dom';
import useGroupStore     from '../store/useGroupStore';
import useTeamStore      from '../store/useTeamStore';
import useUserStore      from '../store/useUserStore';
import { TYPES }         from '../data/questions';
import { NewTeamPuzzle, FillTeamPuzzle, TeamBalancePuzzle } from '../components/ui/PuzzleCharacters';
import { buildRecommendations } from '../utils/scoring';

export default function ModeSelect() {
  const navigate       = useNavigate();
  const groupCode      = useGroupStore(s => s.groupCode);
  const isEntered      = useGroupStore(s => s.isEntered);
  const dominantType   = useUserStore(s => s.dominantType);
  const name           = useUserStore(s => s.name);
  const asUser         = useUserStore(s => s.asUser);
  const setRecs        = useUserStore(s => s.setRecommendations);
  const resetTeam      = useTeamStore(s => s.reset);

  useEffect(() => {
    if (!isEntered) navigate('/', { replace: true });
    else if (!dominantType) navigate('/onboarding/name', { replace: true });
  }, [isEntered, dominantType, navigate]);

  if (!dominantType) return null;

  const type = TYPES[dominantType];

  // ★ "나와 맞는 팀원 찾기" → Home의 FindTeammate 사용
  const handleNewTeam = () => navigate('/find-teammate');

  const handleSupplement = () => {
    resetTeam();
    navigate('/supplement/count');
  };

  const handleBalanceCheck = () => {
    navigate('/balance/count');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-5 pt-4 pb-3 min-h-0">

        {/* ── 성향 결과 + 헤드카피: 하나의 블록처럼 밀착 배치 ── */}
        <div className="mb-2">
          {/* 그룹 코드 뱃지 — 우상단 */}
          <div className="flex justify-end mb-3">
            <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100
              px-3 py-1 rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-gray-700 tracking-widest">{groupCode}</span>
            </div>
          </div>

          {/* 인사 + 성향 결과 */}
          <p className="text-sm text-gray-400 mb-0.5">
            안녕하세요, <span className="font-semibold text-gray-700">{name}</span>님 👋
          </p>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-lg">{type.emoji}</span>
            <span className="text-base font-black" style={{ color: type.color }}>{type.name}</span>
            <span className="text-sm text-gray-500 font-medium">으로 분석됐어요</span>
          </div>

          {/* 헤드카피 — 바로 이어서 */}
          <h1 className="text-xl font-black text-gray-900 leading-snug mb-1">
            나에게 맞는 팀을 찾아볼까요?
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            성향 분석 결과를 바탕으로 AI가 추천해드립니다.
          </p>
        </div>

        {/* ── 카드 ── */}
        <div className="flex flex-col gap-2.5 mt-6">

          {/* 카드 1: 팀 새로 만들기 */}
          <button
            onClick={handleNewTeam}
            className="group w-full text-left bg-white rounded-3xl px-5 py-4
              border-2 border-blue-50 shadow-sm
              hover:shadow-xl hover:-translate-y-1 hover:border-blue-200
              active:scale-[0.98] active:shadow-sm
              transition-all duration-200 ease-out cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 transition-transform duration-300
                group-hover:scale-105 group-hover:-rotate-2">
                <NewTeamPuzzle size={60} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold tracking-widest text-blue-400
                  bg-blue-50 px-2 py-0.5 rounded-full mb-1">NEW TEAM</span>
                <p className="font-black text-gray-900 text-[14px] leading-tight mb-1">
                  팀을 새로 만들고 싶어요
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  나와 잘 맞는 팀원을 추천받고<br />새로운 팀을 구성해보세요.
                </p>
              </div>
              <div className="flex-shrink-0 text-gray-200 group-hover:text-blue-400
                group-hover:translate-x-1 transition-all duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </button>

          {/* 카드 2: 팀원 보충 */}
          <button
            onClick={handleSupplement}
            className="group w-full text-left bg-white rounded-3xl px-5 py-4
              border-2 border-emerald-50 shadow-sm
              hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200
              active:scale-[0.98] active:shadow-sm
              transition-all duration-200 ease-out cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 transition-transform duration-300
                group-hover:scale-105 group-hover:rotate-2">
                <FillTeamPuzzle size={60} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold tracking-widest text-emerald-500
                  bg-emerald-50 px-2 py-0.5 rounded-full mb-1">FILL TEAM</span>
                <p className="font-black text-gray-900 text-[14px] leading-tight mb-1">
                  팀원을 보충하고 싶어요
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  현재 팀을 분석하고<br />부족한 역할을 AI가 추천합니다.
                </p>
              </div>
              <div className="flex-shrink-0 text-gray-200 group-hover:text-emerald-400
                group-hover:translate-x-1 transition-all duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </button>

          {/* 카드 3: 팀 밸런스 분석 */}
          <button
            onClick={handleBalanceCheck}
            className="group w-full text-left bg-white rounded-3xl px-5 py-4
              border-2 border-purple-50 shadow-sm
              hover:shadow-xl hover:-translate-y-1 hover:border-purple-200
              active:scale-[0.98] active:shadow-sm
              transition-all duration-200 ease-out cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                <TeamBalancePuzzle size={60} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block text-[10px] font-bold tracking-widest text-purple-500
                    bg-purple-50 px-2 py-0.5 rounded-full">TEAM ANALYSIS</span>
                  <span className="text-[10px] font-bold text-white bg-purple-400 px-1.5 py-0.5 rounded-full">NEW</span>
                </div>
                <p className="font-black text-gray-900 text-[14px] leading-tight mb-1">
                  기존 팀의 밸런스가 궁금해요
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  현재 팀원의 성향을 분석하여<br />협업 강점과 부족한 부분을 알려드립니다.
                </p>
              </div>
              <div className="flex-shrink-0 text-gray-200 group-hover:text-purple-400
                group-hover:translate-x-1 transition-all duration-200">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* 슬로건 — 색상 진하게 (text-gray-300 → text-gray-400) */}
      </div>
    </div>
  );
}
