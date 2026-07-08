/**
 * BalanceSelect — 팀 밸런스 2단계
 * total명 선택 필요
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import { TYPES }     from '../data/questions';

export default function BalanceSelect() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const isEntered = useGroupStore(s => s.isEntered);
  const groupCode = useGroupStore(s => s.groupCode);
  const members        = useGroupStore(s => s.members);
  const refreshMembers = useGroupStore(s => s.refreshMembers);
  const [selected, setSelected] = useState([]);
  const [copied,   setCopied]   = useState(false);
  const [ready,    setReady]    = useState(false);

  // ✅ 모든 guard를 useEffect 안으로 이동 (hooks 규칙 준수)
  useEffect(() => {
    if (!isEntered) { navigate('/'); return; }
    if (!state?.total) { navigate('/balance/count'); return; }
    refreshMembers();
    setReady(true);
  }, []);

  if (!ready) return null;

  const { total } = state;
  const count = selected.length;
  const canNext = count === total;

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
        : prev.length < total ? [...prev, id] : prev
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/group/join/${groupCode}`).catch(()=>{});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #F5F3FF 0%, #EFF6FF 55%, #F0FDF9 100%)' }}>
      {/* 헤더 */}
      <div className="max-w-md mx-auto w-full px-5 pt-6 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase">팀 밸런스 분석 · Step 2</p>
            <p className="text-base font-black text-gray-900">팀원을 선택해주세요</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span className="text-[10px] font-black text-gray-700 tracking-widest">{groupCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">선택</span>
          <span className={`text-xs font-black ${canNext ? 'text-purple-600' : 'text-gray-500'}`}>{count} / {total}</span>
          {canNext && <span className="text-[10px] text-purple-500 font-medium">선택 완료</span>}
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="flex-1 overflow-y-auto px-5 pb-2 max-w-md mx-auto w-full">
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-semibold text-gray-700 mb-1">등록된 팀원이 없어요</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-1">찾는 팀원이 없나요?</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              그룹 초대 링크를 공유하여<br />팀원에게 성향 검사를 요청해보세요.
            </p>
            <button onClick={handleCopyLink}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                copied ? 'bg-purple-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300'}`}>
              {copied ? '✅ 복사됨!' : '🔗 초대 링크 복사'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 py-1">
            {members.map(m => {
              const isSel = selected.includes(m.id);
              const isDis = !isSel && count >= total;
              const type  = TYPES[m.dominantType];
              return (
                <button key={m.id} onClick={() => toggle(m.id)} disabled={isDis}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] ${
                    isSel ? 'border-purple-400 bg-purple-50'
                    : isDis ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSel ? 'border-purple-400 bg-purple-400' : 'border-gray-200'}`}>
                    {isSel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white flex-shrink-0"
                    style={{ backgroundColor: isSel ? '#8B5CF6' : '#CBD5E1' }}>{m.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`font-bold text-sm ${isSel ? 'text-purple-800' : 'text-gray-900'}`}>{m.name}</p>
                      {type && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ color: type.color, backgroundColor: type.bg }}>{type.emoji} {type.name}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(m.domains||[]).slice(0,2).map(d=>(
                        <span key={d} className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">{d}</span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
            {members.length > 0 && (
              <div className="pt-2 pb-1">
                <p className="text-[10px] text-gray-400 text-center mb-2">찾는 팀원이 없나요?</p>
                <button onClick={handleCopyLink}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed text-sm font-semibold transition-all ${
                    copied ? 'border-purple-300 bg-purple-50 text-purple-600' : 'border-gray-200 bg-white text-gray-500 hover:border-purple-300'}`}>
                  {copied ? '✅ 링크가 복사됐어요!' : '🔗 초대 링크 복사하기'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-5 pb-7 pt-3 max-w-md mx-auto w-full"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(245,243,255,1) 30%)' }}>
        <button onClick={() => navigate('/balance/loading', { state: { selected } })} disabled={!canNext}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)' }}>
          {canNext ? '팀 밸런스 분석하기 →' : `${total - count}명 더 선택해주세요`}
        </button>
      </div>
    </div>
  );
}
