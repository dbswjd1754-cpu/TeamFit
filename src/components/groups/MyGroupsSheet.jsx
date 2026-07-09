/**
 * MyGroupsSheet — "내 그룹 바로가기" 공용 Bottom Sheet
 *
 * 시작 화면 버튼과 "내 프로필 보기" 결과 화면 하단 버튼이
 * 동일 컴포넌트를 재사용한다 (UI/로직 중복 구현 금지).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../../store/useGroupStore';
import { getUserProfileFromDB, getMembersFromDB } from '../../store/groupDB';
import { routeAfterGroupEntry } from '../../utils/profileRouting';

export default function MyGroupsSheet({ onClose }) {
  const navigate      = useNavigate();
  const currentName   = useGroupStore(s => s.currentName);
  const setGroupCode  = useGroupStore(s => s.setGroupCode);

  const [loading, setLoading] = useState(true);
  const [groups,  setGroups]  = useState([]);
  const [movingTo, setMovingTo] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!currentName) { setLoading(false); return; }
      const profile = await getUserProfileFromDB(currentName);
      const myGroups = Array.isArray(profile?.myGroups) ? profile.myGroups : [];
      const withCounts = await Promise.all(myGroups.map(async (g) => {
        const members = await getMembersFromDB(g.groupCode);
        return { ...g, memberCount: members.length };
      }));
      withCounts.sort((a, b) => (b.lastAccessAt || b.joinedAt || 0) - (a.lastAccessAt || a.joinedAt || 0));
      if (alive) { setGroups(withCounts); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [currentName]);

  const formatDate = (ts) => ts
    ? new Date(ts).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' })
    : '-';

  const handleSelect = async (g) => {
    setMovingTo(g.groupCode);
    await setGroupCode(g.groupCode, g.groupName);
    // ★ 이미 성향 분석이 완료된 사용자 — 다시 성향검사로 보내지 않음
    await routeAfterGroupEntry(navigate);
    onClose?.();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
        style={{ animation:'sheetUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="bg-white rounded-t-3xl pt-3 pb-8 px-5 shadow-2xl"
          style={{ maxHeight:'80vh', overflowY:'auto' }}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
          <p className="text-base font-black text-gray-900 mb-4">내 그룹</p>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : groups.length === 0 ? (
            <div className="py-6">
              <p className="text-sm text-gray-500 leading-relaxed">
                현재 생성된 그룹이 없습니다.<br/>
                기존 그룹에 참여하고 싶다면 코드를 입력하여 참여하거나,<br/>
                새 그룹을 직접 만들 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map(g => (
                <button key={g.groupCode} onClick={() => handleSelect(g)}
                  disabled={!!movingTo}
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl
                    border-2 border-gray-100 bg-white text-left
                    hover:border-emerald-300 hover:shadow-sm active:scale-[0.99]
                    transition-all disabled:opacity-60">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-black text-sm text-gray-900 truncate">
                        {g.groupName || `그룹 ${g.groupCode}`}
                      </p>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {g.groupCode}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      멤버 {g.memberCount}명 · 최근 접속 {formatDate(g.lastAccessAt || g.joinedAt)}
                    </p>
                  </div>
                  {movingTo === g.groupCode ? (
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0"/>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-300 flex-shrink-0">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}

          <button onClick={onClose}
            className="w-full mt-5 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">
            닫기
          </button>
        </div>
      </div>
    </>
  );
}
