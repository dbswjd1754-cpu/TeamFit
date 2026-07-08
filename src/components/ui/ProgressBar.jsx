import useGroupStore from '../../store/useGroupStore';

/**
 * ProgressBar
 * props:
 *   current, total   — 진행 단계
 *   showBack         — 뒤로가기 버튼 표시 여부
 *   onBack           — 뒤로가기 핸들러
 *   showTeamCode     — 그룹 코드 뱃지 표시 여부 (기본 true)
 */
export default function ProgressBar({
  current, total,
  showBack = true, onBack,
  showTeamCode = true,
}) {
  const pct       = Math.round((current / total) * 100);
  const groupCode = useGroupStore(s => s.groupCode);

  return (
    <div className="w-full">
      <div className="flex items-center mb-2">
        {/* 뒤로가기 */}
        {showBack && onBack && (
          <button onClick={onBack} className="mr-2 text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* 그룹 코드 뱃지 */}
        {showTeamCode && groupCode && (
          <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100
            px-2.5 py-1 rounded-full shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-gray-400">그룹</span>
            <span className="text-[10px] font-black text-gray-700 tracking-wider">{groupCode}</span>
          </div>
        )}

        {/* 단계 표시 */}
        <span className="text-xs text-gray-400 font-medium ml-auto">
          {current} / {total}
        </span>
      </div>

      {/* 진행 바 */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #10B981 0%, #3B82F6 100%)',
          }}
        />
      </div>
    </div>
  );
}
