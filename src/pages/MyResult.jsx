import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import useUserStore    from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import { TYPES }       from '../data/questions';
import { buildRecommendations } from '../utils/scoring';
import { buildPersona } from '../utils/persona';
import { mockUsers }   from '../data/mockUsers';
import { BluePuzzleSmall } from '../components/ui/PuzzleCharacters';

const TYPE_DESCRIPTIONS = {
  A: {
    title: '빠르게 방향을 잡고 팀을 이끄는 타입',
    traits: ['모호한 상황에서도 먼저 방향을 제시해요', '의사결정이 빠르고 목표 중심으로 움직여요', '프로젝트의 큰 그림을 놓치지 않아요'],
    tip: '팀원의 의견을 수렴하는 시간을 충분히 갖는 것이 좋아요',
  },
  B: {
    title: '팀 합의를 중시하고 분위기를 조율하는 타입',
    traits: ['갈등 상황에서 중재자 역할을 잘 해요', '팀원 모두가 참여하는 의사결정을 선호해요', '프로젝트 분위기와 팀 관계를 세심하게 챙겨요'],
    tip: '때로는 빠른 결정이 필요한 순간도 있다는 걸 기억해요',
  },
  C: {
    title: '근거를 먼저 확인하고 깊이 파고드는 타입',
    traits: ['리서치와 분석을 통해 의사결정의 근거를 만들어요', '문제의 본질을 파악하는 데 강해요', '완성도 높은 결과물을 지향해요'],
    tip: '완벽한 분석보다 충분한 분석 후 실행이 더 효과적일 때가 많아요',
  },
  D: {
    title: '일단 만들어보고 빠르게 검증하는 타입',
    traits: ['아이디어를 빠르게 실물로 만들어내는 실행력이 강해요', '완벽함보다 진행을 우선시해요', '데드라인 안에 결과물을 만들어내는 능력이 탁월해요'],
    tip: '방향 점검 없이 달리다 보면 수정 비용이 커질 수 있어요',
  },
};

export default function MyResult() {
  const navigate       = useNavigate();
  const dominantType   = useUserStore(s => s.dominantType);
  const typeRatio      = useUserStore(s => s.typeRatio);
  const name           = useUserStore(s => s.name);
  const setRecs        = useUserStore(s => s.setRecommendations);
  const asUser         = useUserStore(s => s.asUser);
  const groupCode    = useGroupStore(s => s.groupCode);
  const isEntered      = useGroupStore(s => s.isEntered);

  useEffect(() => {
    if (!isEntered) navigate('/', { replace: true });
    else if (!dominantType) navigate('/landing', { replace: true });
  }, [isEntered, dominantType, navigate]);

  if (!dominantType) return null;

  const type = TYPES[dominantType];
  const desc = TYPE_DESCRIPTIONS[dominantType];

  // ★ MyResult도 Persona 표시 (OnboardingResult와 동일 기준)
  const persona = buildPersona(typeRatio || {});

  // ★ 홈으로 이동 (Home 기반 추천 시스템 사용)
  const handleViewRecommendations = () => navigate('/group-home');

  const sortedRatio = Object.entries(typeRatio)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: type.bg }}>
      <div className="flex-1 flex flex-col px-6 pt-16 pb-8 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-sm"
            style={{ backgroundColor: type.color + '20', border: `2px solid ${type.color}30` }}>
            {type.emoji}
          </div>
          <p className="text-sm font-semibold mb-2" style={{ color: type.color }}>{name}님의 협업 유형</p>
          {/* ★ Persona 이름 표시 */}
          <p className="text-xs text-gray-400 mb-0.5">{persona.name}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{persona.emoji} {persona.name}</h1>
          <p className="text-gray-600 text-sm font-medium leading-relaxed">{desc.title}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">주요 특성</p>
          <div className="space-y-2.5">
            {desc.traits.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: type.color }} />
                <p className="text-sm text-gray-700 leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 mb-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">나의 협업 성향 비율</p>
          <div className="space-y-2.5">
            {sortedRatio.map(([key, value]) => {
              const t = TYPES[key];
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm w-16 flex items-center gap-1 flex-shrink-0">
                    <span>{t.emoji}</span>
                    <span className="text-gray-600 font-medium">{t.name}</span>
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: t.color }}/>
                  </div>
                  <span className="text-sm font-bold w-9 text-right flex-shrink-0" style={{ color: t.color }}>{value}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl p-5 mb-6"
          style={{ backgroundColor: type.color + '15', border: `1.5px solid ${type.color}25` }}>
          <p className="text-xs font-semibold mb-2" style={{ color: type.color }}>💡 협업 팁</p>
          <p className="text-sm text-gray-700 leading-relaxed">{desc.tip}</p>
        </div>
      </div>

      <div className="px-6 pb-10 max-w-md mx-auto w-full">
        <Button onClick={handleViewRecommendations}>내 추천 팀원 보기 →</Button>
      </div>
    </div>
  );
}
