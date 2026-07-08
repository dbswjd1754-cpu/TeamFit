import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import TypeBadge from '../components/ui/TypeBadge';
import useTeamStore  from '../store/useTeamStore';
import useGroupStore  from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';

export default function TeamSelect() {
  const navigate     = useNavigate();
  const groupCode    = useGroupStore(s => s.groupCode);
  const currentTeam  = useTeamStore(s => s.currentTeam);
  const toggleMember = useTeamStore(s => s.toggleMember);
  const setTeam      = useTeamStore(s => s.setTeam);

  // 현재 로그인 사용자 이름
  const currentName = useGroupStore(s => s.currentName);

  // 그룹코드 없으면 첫 화면으로
  useEffect(() => {
    if (!groupCode) navigate('/mode-select', { replace: true });
  }, [groupCode, navigate]);

  // membersByGroup 직접 구독 → 새 멤버 저장 즉시 리렌더
  const groupUsers = useGroupStore(
    s => s.membersByGroup[s.groupCode] || []
  );
  const isEmpty    = groupUsers.length === 0;

  // ★ 현재 사용자 찾기 (이름 기준)
  const myUser = groupUsers.find(u => u.name === currentName);

  // ★ 마운트 시 현재 사용자를 기본 선택 상태로 세팅
  useEffect(() => {
    if (myUser && !currentTeam.includes(myUser.id)) {
      setTeam([myUser.id, ...currentTeam.filter(id => id !== myUser.id)]);
    }
  }, [myUser?.id]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/group/join/${groupCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    alert(`링크가 복사되었어요!\n${link}`);
  };

  // ★ 현재 사용자 제외 선택 인원 수 (본인은 항상 포함이므로 실제 총 인원 = currentTeam.length)
  // 최소 조건: 본인 포함 2명 이상 → currentTeam.length >= 2
  const canNext = currentTeam.length >= 2;

  const handleNext = () => {
    if (!canNext) return;
    navigate('/supplement/balance');
  };

  // ★ 현재 사용자의 toggle — 해제 불가
  const handleToggle = (userId) => {
    if (myUser && userId === myUser.id) return; // 본인은 해제 불가
    toggleMember(userId);
  };

  return (
    <PageLayout>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-2/3 transition-all duration-500" />
          </div>
        </div>
        <span className="text-xs text-gray-400 font-medium">2 / 3</span>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full mb-4">
          <span className="text-emerald-600 text-xs font-semibold">🧩 팀원 보충 · {groupCode}</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">현재 팀원을 선택해주세요</h2>
        <p className="text-gray-400 text-sm mb-1">
          나를 포함한 팀원을 모두 선택해주세요
          {currentTeam.length > 0 && (
            <span className="ml-2 font-semibold text-emerald-600">{currentTeam.length}명 선택됨</span>
          )}
        </p>
        {/* ★ 최소 인원 안내 */}
        {!canNext && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl mb-3 border border-amber-100">
            ⚠️ 팀원 2명 이상부터 AI 팀 보충 추천을 사용할 수 있습니다.
          </p>
        )}

        {/* 빈 상태 */}
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">😅</span>
            </div>
            <p className="text-gray-700 font-semibold mb-1">아직 등록된 팀원이 없어요</p>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              아직 등록되지 않은 팀원이 있어요.<br />
              아래 링크를 공유해 성향 등록을 요청해보세요.
            </p>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-2xl font-semibold text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              등록 링크 복사하기
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2.5 pb-2">
            {groupUsers.map(user => {
              const isMe       = myUser && user.id === myUser.id;
              const isSelected = currentTeam.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => handleToggle(user.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  } ${isMe ? 'cursor-default' : ''}`}
                >
                  {/* 체크 */}
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-200'
                  }`}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* 아바타 */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
                    style={{ backgroundColor: isSelected ? '#10B981' : '#CBD5E1' }}
                  >
                    {user.name[0]}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-bold text-sm ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                        {user.name}
                      </p>
                      {/* ★ 본인 표시 */}
                      {isMe && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">나</span>
                      )}
                      <TypeBadge typeKey={user.dominantType} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.domains.map(d => (
                        <span key={d} className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{d}</span>
                      ))}
                    </div>
                  </div>

                  {/* ★ 본인이면 잠금 표시 */}
                  {isMe && (
                    <span className="text-[10px] text-emerald-500 font-semibold flex-shrink-0">고정</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 링크 복사 버튼 (유저 있을 때도 표시) */}
        {!isEmpty && (
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 py-3 mt-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            팀원 등록 링크 공유하기
          </button>
        )}
      </div>

      <Button
        onClick={handleNext}
        disabled={!canNext}
        color="emerald"
        className="mt-4"
      >
        {canNext ? `${currentTeam.length}명으로 팀 밸런스 분석하기` : '팀원을 1명 이상 더 선택해주세요'}
      </Button>
    </PageLayout>
  );
}
