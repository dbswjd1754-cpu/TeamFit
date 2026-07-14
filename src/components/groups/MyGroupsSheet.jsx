/**
 * MyGroupsSheet — "내 그룹 바로가기" 공용 Bottom Sheet
 *
 * 시작 화면 버튼과 "내 프로필 보기" 결과 화면 하단 버튼이
 * 동일 컴포넌트를 재사용한다 (UI/로직 중복 구현 금지).
 *
 * 그룹 나가기 — 2가지 제스처 지원:
 *   ① 왼쪽으로 스와이프 → "그룹 나가기" 버튼 노출 → 탭하면 즉시 나가기
 *   ② 2초 이상 꾹 누르기 → 확인 다이얼로그 → "그룹 나가기" 확정 시 나가기
 * 나가면 그 그룹의 내 멤버 데이터가 삭제되고, 내 그룹 목록에서도 제거된다.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../../store/useGroupStore';
import { getUserProfileFromDB, getMembersFromDB, leaveGroup } from '../../store/groupDB';
import { routeAfterGroupEntry } from '../../utils/profileRouting';

const REVEAL_WIDTH = 88;   // 스와이프 시 노출되는 "그룹 나가기" 버튼 너비
const LONG_PRESS_MS = 2000; // 꾹 누르기 판정 시간

export default function MyGroupsSheet({ onClose }) {
  const navigate       = useNavigate();
  const currentName    = useGroupStore(s => s.currentName);
  const activeGroupCode = useGroupStore(s => s.groupCode);
  const setGroupCode   = useGroupStore(s => s.setGroupCode);

  const [loading, setLoading]   = useState(true);
  const [groups,  setGroups]    = useState([]);
  const [movingTo, setMovingTo] = useState(null);
  const [leavingCode, setLeavingCode] = useState(null);
  const [confirmGroup, setConfirmGroup] = useState(null); // 꾹 누르기 → 확인 다이얼로그 대상
  const [swipe, setSwipe] = useState({ code: null, offset: 0, dragging: false });

  // 제스처 판정용 ref (렌더와 무관한 순간값)
  const gesture = useRef({ code: null, x: 0, y: 0, baseOffset: 0, moved: false, longPressFired: false, timer: null });

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

  const closeSwipe = () => setSwipe({ code: null, offset: 0, dragging: false });

  const handleLeave = async (g) => {
    setConfirmGroup(null);
    setLeavingCode(g.groupCode);
    await leaveGroup(currentName, g.groupCode);
    setGroups(prev => prev.filter(x => x.groupCode !== g.groupCode));
    closeSwipe();
    setLeavingCode(null);
    // 지금 실제로 접속해 있던 그룹을 나간 경우 — 세션도 함께 정리
    if (activeGroupCode === g.groupCode) {
      useGroupStore.getState().exit();
      onClose?.();
      navigate('/');
    }
  };

  /* ── 제스처: 스와이프(좌우 드래그) + 꾹 누르기 ── */
  const onPointerDown = (e, g) => {
    if (movingTo || leavingCode) return;
    const gs = gesture.current;
    gs.code = g.groupCode;
    gs.x = e.clientX; gs.y = e.clientY;
    gs.baseOffset = swipe.code === g.groupCode ? swipe.offset : 0;
    gs.moved = false;
    gs.longPressFired = false;
    setSwipe({ code: g.groupCode, offset: gs.baseOffset, dragging: true });
    clearTimeout(gs.timer);
    gs.timer = setTimeout(() => {
      if (gesture.current.code === g.groupCode && !gesture.current.moved) {
        gesture.current.longPressFired = true;
        setConfirmGroup(g);
        closeSwipe();
      }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e, g) => {
    const gs = gesture.current;
    if (gs.code !== g.groupCode) return;
    const dx = e.clientX - gs.x;
    const dy = e.clientY - gs.y;
    if (!gs.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      gs.moved = true;
      clearTimeout(gs.timer);
    }
    if (gs.moved && Math.abs(dx) > Math.abs(dy)) {
      const next = Math.max(-REVEAL_WIDTH, Math.min(0, gs.baseOffset + dx));
      setSwipe({ code: g.groupCode, offset: next, dragging: true });
    }
  };

  const endGesture = (g) => {
    const gs = gesture.current;
    if (gs.code !== g.groupCode) return;
    clearTimeout(gs.timer);
    if (gs.longPressFired) { gs.code = null; return; }

    if (!gs.moved) {
      // 짧은 탭 — 이미 열려 있던 스와이프면 닫기만, 아니면 그룹 선택
      const wasOpen = swipe.code === g.groupCode && swipe.offset < -REVEAL_WIDTH / 2;
      if (wasOpen) closeSwipe();
      else handleSelect(g);
    } else {
      // 드래그 종료 — 절반 이상 넘겼으면 완전히 열고, 아니면 닫기
      setSwipe(prev => {
        const shouldOpen = prev.offset < -REVEAL_WIDTH / 2;
        return shouldOpen
          ? { code: g.groupCode, offset: -REVEAL_WIDTH, dragging: false }
          : { code: null, offset: 0, dragging: false };
      });
    }
    gs.code = null;
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
          <p className="text-base font-black text-gray-900 mb-1">내 그룹</p>
          {groups.length > 0 && (
            <p className="text-[11px] text-gray-400 mb-4">왼쪽으로 밀거나 꾹 누르면 그룹을 나갈 수 있어요</p>
          )}

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
              {groups.map(g => {
                const offset = swipe.code === g.groupCode ? swipe.offset : 0;
                const dragging = swipe.code === g.groupCode && swipe.dragging;
                const isLeaving = leavingCode === g.groupCode;
                return (
                  <div key={g.groupCode} className="relative overflow-hidden rounded-2xl">
                    {/* 배경에 숨어있다가 스와이프 시 드러나는 나가기 버튼 */}
                    <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }}>
                      <button
                        onClick={() => handleLeave(g)}
                        disabled={isLeaving}
                        className="flex-1 bg-red-500 text-white text-xs font-bold
                          flex items-center justify-center px-2 text-center leading-tight
                          active:bg-red-600 disabled:opacity-60">
                        {isLeaving ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin"/>
                        ) : '그룹\n나가기'}
                      </button>
                    </div>

                    {/* 실제 그룹 카드 — 좌우 드래그로 밀림 */}
                    <div
                      onPointerDown={(e) => onPointerDown(e, g)}
                      onPointerMove={(e) => onPointerMove(e, g)}
                      onPointerUp={() => endGesture(g)}
                      onPointerCancel={() => endGesture(g)}
                      onPointerLeave={() => { if (gesture.current.code === g.groupCode && !gesture.current.moved) endGesture(g); }}
                      style={{
                        transform: `translateX(${offset}px)`,
                        transition: dragging ? 'none' : 'transform 0.2s ease',
                        touchAction: 'pan-y',
                      }}
                      className="relative z-10 w-full flex items-center justify-between gap-3 p-4 rounded-2xl
                        border-2 border-gray-100 bg-white text-left select-none cursor-pointer
                        hover:border-emerald-300 hover:shadow-sm
                        transition-[border-color,box-shadow] disabled:opacity-60">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onClose}
            className="w-full mt-5 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">
            닫기
          </button>
        </div>
      </div>

      {/* 꾹 누르기 → 확인 다이얼로그 */}
      {confirmGroup && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setConfirmGroup(null)}/>
          <div className="fixed inset-0 z-[61] flex items-center justify-center px-6">
            <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl text-center"
              style={{ animation:'sheetUp 0.2s ease' }}>
              <p className="text-base font-black text-gray-900 mb-1.5">
                {confirmGroup.groupName || `그룹 ${confirmGroup.groupCode}`} 그룹을<br/>나가시겠습니까?
              </p>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                나가면 이 그룹에 저장된 내 정보가 삭제되며,<br/>다시 참여하려면 그룹 코드가 필요합니다.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmGroup(null)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">
                  취소
                </button>
                <button onClick={() => handleLeave(confirmGroup)}
                  disabled={leavingCode === confirmGroup.groupCode}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-sm font-bold text-white
                    active:bg-red-600 disabled:opacity-60">
                  {leavingCode === confirmGroup.groupCode ? '나가는 중...' : '그룹 나가기'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
