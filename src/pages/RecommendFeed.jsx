import { useNavigate } from 'react-router-dom';
import useUserStore from '../store/useUserStore';
import { TYPES } from '../data/questions';
import { getScoreLabel } from '../utils/scoring';
import TypeBadge from '../components/ui/TypeBadge';

export default function RecommendFeed() {
  const navigate = useNavigate();
  const { recommendations, name, dominantType } = useUserStore();
  const myType = TYPES[dominantType];

  if (!recommendations.length) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-2xl mb-2">😢</p>
          <p className="text-gray-500 text-sm">같은 그룹에 다른 멤버가 없어요</p>
          <button onClick={() => navigate('/')} className="mt-4 text-brand-500 text-sm font-semibold">
            처음으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-gray-400 mb-1">안녕하세요, {name}님 👋</p>
            <h1 className="text-xl font-bold text-gray-900">추천 팀원</h1>
          </div>
          {myType && (
            <div className="flex flex-col items-end">
              <p className="text-xs text-gray-400 mb-1">나의 유형</p>
              <TypeBadge typeKey={dominantType} size="sm" />
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">Match Score 높은 순 · {recommendations.length}명</p>
      </div>

      {/* 카드 리스트 */}
      <div className="px-4 py-4 max-w-md mx-auto space-y-3">
        {recommendations.map((rec, idx) => {
          const { user, scores, scoreLabel } = rec;
          const otherType = TYPES[user.dominantType];
          return (
            <button
              key={user.id}
              onClick={() => navigate(`/match/${user.id}`)}
              className="w-full bg-white rounded-3xl p-5 shadow-sm text-left transition-all hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* 순위 */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-600' :
                    idx === 1 ? 'bg-gray-100 text-gray-500' :
                    idx === 2 ? 'bg-orange-50 text-orange-500' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <TypeBadge typeKey={user.dominantType} size="sm" />
                  </div>
                </div>

                {/* Match Score */}
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: scoreLabel.color }}>{scores.total}</p>
                  <p className="text-xs text-gray-400">/ 100점</p>
                </div>
              </div>

              {/* 점수 미니 바 */}
              <div className="space-y-1.5 mb-3">
                {[
                  { label: '협업 스타일', score: scores.style, max: 50, color: '#4F6EF7' },
                  { label: '관심 도메인', score: scores.domain, max: 30, color: '#10B981' },
                  { label: '우선순위', score: scores.priority, max: 20, color: '#F59E0B' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0">{item.label}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round((item.score / item.max) * 100)}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-8 text-right" style={{ color: item.color }}>
                      {item.score}
                    </span>
                  </div>
                ))}
              </div>

              {/* 도메인 태그 */}
              <div className="flex flex-wrap gap-1.5">
                {user.domains.map(d => (
                  <span key={d} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{d}</span>
                ))}
                <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{user.priority}</span>
              </div>

              {/* 레이블 */}
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: scoreLabel.color }}>{scoreLabel.label}</span>
                <span className="text-xs text-gray-300">상세 분석 보기 →</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-8" />
    </div>
  );
}
