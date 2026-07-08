import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import { TYPES }     from '../data/questions';

export default function SupplementSelect() {
  const navigate       = useNavigate();
  const { state }      = useLocation();
  const isEntered      = useGroupStore(s => s.isEntered);
  const groupCode      = useGroupStore(s => s.groupCode);
  const members        = useGroupStore(s => s.members);
  const currentName    = useGroupStore(s => s.currentName);  // ★ 현재 사용자 이름
  const refreshMembers = useGroupStore(s => s.refreshMembers);

  const [selected, setSelected] = useState([]);
  const [copied,   setCopied]   = useState(false);
  const [ready,    setReady]    = useState(false);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    if (!isEntered) { navigate('/'); return; }
    if (!state?.current) { navigate('/supplement/count'); return; }
    refreshMembers();
    setReady(true);
  }, []);

  // ★ 현재 사용자를 members에서 찾기 (이름 기준)
  const myMember = useMemo(
    () => members.find(m => m.name === currentName),
    [members, currentName]
  );

  // ★ 마운트 후 현재 사용자 자동 선택
  useEffect(() => {
    if (!ready || !myMember) return;
    setSelected(prev =>
      prev.includes(myMember.id) ? prev : [myMember.id, ...prev]
    );
  }, [ready, myMember?.id]);

  if (!ready) return null;

  // 검색 필터
  const filteredMembers = members.filter(m => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name    = (m.name || '').toLowerCase();
    const p       = m.profile || {};
    const domains = (p.domains || []).join(' ').toLowerCase();
    const typeName= (TYPES[p.typeKey]?.name || '').toLowerCase();
    return name.includes(q) || domains.includes(q) || typeName.includes(q);
  });

  const { current, want } = state;
  const limit   = current;
  const count   = selected.length;
  const canNext = count === limit;

  const toggle = (id) => {
    // ★ 현재 사용자는 해제 불가
    if (myMember && id === myMember.id) return;
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < limit ? [...prev, id] : prev
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/group/join/${groupCode}`).catch(()=>{});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleNext = () => {
    if (!canNext) return;
    navigate('/supplement/loading', { state: { selected, want, current } });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto w-full px-5 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase">
              팀원 보충 · Step 2
            </p>
            <p className="text-base font-black text-gray-900">함께하기로 한 팀원을 선택해주세요</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100
            px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
            <span className="text-[10px] font-black text-gray-700 tracking-widest">{groupCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">선택</span>
          <span className={`text-xs font-black ${canNext ? 'text-emerald-600' : 'text-gray-500'}`}>
            {count} / {limit}
          </span>
          {canNext && <span className="text-[10px] text-emerald-500 font-medium">선택 완료</span>}
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="px-5 pb-2 max-w-md mx-auto w-full flex-shrink-0">
        {/* 검색창 */}
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
              focus:border-emerald-300 transition-colors shadow-sm"/>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="overflow-y-auto" style={{maxHeight:'calc(100vh - 360px)', minHeight:'120px'}}>
          {members.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-semibold text-gray-700 mb-1">등록된 그룹원이 없어요</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                그룹 초대 링크를 공유하여<br/>팀원에게 성향 검사를 요청해보세요.
              </p>
              <button onClick={handleCopyLink}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold
                  text-sm transition-all ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-emerald-300'
                }`}>
                {copied ? '✅ 복사됨!' : '🔗 초대 링크 복사'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 py-1">
              {filteredMembers.length === 0 && search ? (
                <p className="text-center text-xs text-gray-400 py-8">"{search}"와 일치하는 멤버가 없어요.</p>
              ) : filteredMembers.map(m => {
                const isMe   = myMember && m.id === myMember.id;  // ★ 현재 사용자 여부
                const isSel  = selected.includes(m.id);
                const isDis  = !isSel && !isMe && count >= limit;  // ★ 본인은 항상 선택 가능
                const type   = TYPES[m.profile?.typeKey];
                return (
                  <button key={m.id}
                    onClick={() => toggle(m.id)}
                    disabled={isDis}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2
                      text-left transition-all active:scale-[0.99] ${
                      isMe   ? 'border-emerald-400 bg-emerald-50 cursor-default'  // ★ 본인: 고정
                      : isSel  ? 'border-emerald-400 bg-emerald-50'
                      : isDis ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                    }`}>

                    {/* 체크 */}
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0
                      flex items-center justify-center transition-all ${
                      isSel ? 'border-emerald-400 bg-emerald-400' : 'border-gray-200'
                    }`}>
                      {isSel && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* 아바타 */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center
                      text-base font-black text-white flex-shrink-0"
                      style={{ backgroundColor: isSel ? '#10B981' : '#CBD5E1' }}>
                      {m.name[0]}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className={`font-bold text-sm ${isSel ? 'text-emerald-800' : 'text-gray-900'}`}>
                          {m.name}
                        </p>
                        {/* ★ 나 배지 */}
                        {isMe && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-600
                            px-1.5 py-0.5 rounded-full font-bold">나</span>
                        )}
                        {type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ color: type.color, backgroundColor: type.bg }}>
                            {type.emoji} {type.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(m.profile?.domains||[]).map(d => (
                          <span key={d} className="text-[10px] text-gray-400 bg-gray-50
                            px-1.5 py-0.5 rounded-full">{d}</span>
                        ))}
                      </div>
                    </div>

                    {/* ★ 고정 텍스트 */}
                    {isMe && (
                      <span className="text-[10px] text-emerald-500 font-semibold flex-shrink-0">
                        고정
                      </span>
                    )}
                  </button>
                );
              })}

              {/* 하단 초대 링크 */}
              <div className="pt-2 pb-1">
                <p className="text-[10px] text-gray-400 text-center mb-2">찾는 팀원이 없나요?</p>
                <button onClick={handleCopyLink}
                  className={`w-full flex items-center justify-center gap-2 py-2.5
                    rounded-2xl border-2 border-dashed text-sm font-semibold transition-all ${
                    copied
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-300'
                  }`}>
                  {copied ? '✅ 링크가 복사됐어요!' : '🔗 초대 링크 복사하기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex-shrink-0 px-5 pb-7 pt-3 max-w-md mx-auto w-full"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(239,246,255,1) 30%)' }}>
        <button onClick={handleNext} disabled={!canNext}
          className="w-full py-4 rounded-2xl font-bold text-base text-white
            transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
            active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed
            disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}>
          {canNext ? '팀 분석하기 →' : `${limit - count}명 더 선택해주세요`}
        </button>
      </div>
    </div>
  );
}
