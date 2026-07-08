/**
 * TeamBalanceSelect
 *
 * 팀 밸런스 분석 — 팀원 선택 화면
 *
 * 상태 격리 설계:
 *   - 선택한 팀원 목록은 컴포넌트 로컬 useState로만 관리
 *   - 전역 store(Zustand) 미사용 → 사용자 간 공유 없음
 *   - 결과 화면으로는 React Router location.state로 전달
 *     (페이지 이동 시에만 유효 / 새로고침 시 자동 소멸)
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate }   from 'react-router-dom';
import useGroupStore     from '../store/useGroupStore';
import { TYPES }         from '../data/questions';
import TypeBadge         from '../components/ui/TypeBadge';

export default function TeamBalanceSelect() {
  const navigate  = useNavigate();
  const groupCode = useGroupStore(s => s.groupCode);
  const isEntered = useGroupStore(s => s.isEntered);

  // ── 로컬 state: 전역 store 완전 비사용 ──
  const [selected, setSelected] = useState([]);   // 선택된 userId 배열
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    if (!isEntered) navigate('/', { replace: true });
  }, [isEntered, navigate]);

  const groupUsers = useGroupStore(
    s => s.membersByGroup[s.groupCode] || []
  );
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groupUsers;
    return groupUsers.filter(u => {
      const name = (u.name || '').toLowerCase();
      const domains = (u.domains || []).join(' ').toLowerCase();
      const typeName = (u.dominantType || '').toLowerCase();
      return name.includes(q) || domains.includes(q) || typeName.includes(q);
    });
  }, [groupUsers, search]);

  const toggle = (userId) => {
    setSelected(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/group/join/${groupCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    alert(`링크가 복사되었어요!\n${link}`);
  };

  const handleAnalyze = () => {
    if (selected.length < 2) return;
    // 선택 데이터를 Router state로 전달 — 전역 공유 없음
    navigate('/team-balance/result', {
      state: { selectedIds: selected }
    });
  };

  const count = selected.length;

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto w-full px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="flex-1">
            <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase">
              팀 밸런스 분석
            </p>
            <p className="text-base font-black text-gray-900">현재 팀원을 선택해주세요</p>
          </div>

          <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100
            px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-[10px] font-black text-gray-700 tracking-widest">{groupCode}</span>
          </div>
        </div>

        {/* 설명 문구 */}
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          이미 함께하기로 한 팀원을 선택하면,<br />
          선택한 조합의 협업 밸런스를 분석해드립니다.
        </p>

        {/* 선택 상태 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">선택됨</span>
          <span className={`text-xs font-black ${count >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
            {count}명
          </span>
          {count < 2 && (
            <span className="text-xs text-gray-300">· 최소 2명 이상 선택해주세요</span>
          )}
        </div>
      </div>

      {/* 팀원 목록 */}
      <div className="px-5 pb-2 max-w-md mx-auto w-full">
        {/* 검색창 */}
        {groupUsers.length > 0 && (
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
              width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="이름, 도메인, 성향 검색"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white border border-gray-200
                text-sm text-gray-700 placeholder-gray-300 focus:outline-none
                focus:border-purple-300 transition-colors shadow-sm"/>
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto" style={{maxHeight:'calc(100vh - 340px)', minHeight:'120px'}}>
        {groupUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">😅</div>
            <p className="text-gray-700 font-semibold mb-1">아직 등록된 팀원이 없어요</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-5">
              아래 링크를 공유해 성향 등록을 요청해보세요.
            </p>
            <button onClick={handleCopyLink}
              className="flex items-center gap-2 bg-purple-500 text-white px-5 py-2.5
                rounded-2xl font-semibold text-sm hover:bg-purple-600 active:scale-[0.98] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
              </svg>
              등록 링크 복사하기
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 py-1">
            {filteredUsers.length === 0 && search ? (
            <p className="text-center text-xs text-gray-400 py-8">"{search}"와 일치하는 멤버가 없어요.</p>
          ) : filteredUsers.map(user => {
              const isSelected = selected.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggle(user.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2
                    text-left transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  {/* 체크 */}
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center
                    justify-center transition-all ${
                    isSelected ? 'border-purple-400 bg-purple-400' : 'border-gray-200'
                  }`}>
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* 아바타 */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center
                    flex-shrink-0 text-base font-black text-white"
                    style={{ backgroundColor: isSelected ? '#A855F7' : '#CBD5E1' }}>
                    {user.name[0]}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-bold text-sm ${isSelected ? 'text-purple-800' : 'text-gray-900'}`}>
                        {user.name}
                      </p>
                      <TypeBadge typeKey={user.dominantType} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.domains.slice(0, 2).map(d => (
                        <span key={d} className="text-[10px] text-gray-400 bg-gray-50
                          px-1.5 py-0.5 rounded-full">{d}</span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 고정 영역 */}
      {groupUsers.length > 0 && (
        <div className="px-5 pb-7 pt-3 max-w-md mx-auto w-full
          bg-gradient-to-t from-[#EFF6FF] to-transparent">

          {/* 개인 분석 안내 */}
          <div className="flex items-start gap-2 bg-purple-50 border border-purple-100
            rounded-2xl px-3.5 py-2.5 mb-3">
            <span className="text-purple-400 text-sm flex-shrink-0 mt-0.5">🔒</span>
            <p className="text-xs text-purple-700 leading-relaxed">
              이 분석 결과는 현재 화면에서만 확인할 수 있으며,
              다른 팀원에게 자동 공유되지 않습니다.
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={count < 2}
            className="w-full py-4 rounded-2xl font-bold text-base text-white
              transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
              active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed
              disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)' }}
          >
            {count >= 2 ? `팀 밸런스 분석하기 →` : '팀원을 2명 이상 선택해주세요'}
          </button>
        </div>
      )}
    </div>
  );
}
