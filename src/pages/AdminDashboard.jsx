/**
 * AdminDashboard — 관리자 전용 화면
 *
 * 등록(참여) 여부와 무관하게 지금까지 생성된 모든 그룹과
 * 그 그룹의 멤버 목록을 조회 전용으로 볼 수 있다.
 * 구글 로그인 이메일이 ADMIN_EMAILS에 있을 때만 접근 가능 (utils/admin.js).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { isAdminUser } from '../utils/admin';
import { getAllGroupsFromDB, getMembersFromDB } from '../store/groupDB';
import { buildPersona } from '../utils/persona';

function MemberRow({ member }) {
  const p  = member.profile || {};
  const sc = p.scores || {};
  const ratio = { A: sc.추진 || 0, B: sc.소통 || 0, C: sc.탐구 || 0, D: sc.실행 || 0 };
  const hasProfile = !!p.completed;
  const persona = hasProfile ? buildPersona(ratio) : null;
  const completedDate = p.completedAt
    ? new Date(p.completedAt).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' })
    : '-';

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3.5 py-2.5">
      <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center text-xs font-black text-gray-600 flex-shrink-0">
        {member.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-sm text-gray-900 truncate">{member.name}</p>
          {persona ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-600">
              {persona.emoji} {persona.name}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-600">
              검사 미완료
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {(p.domains || []).map(d => (
            <span key={d} className="text-[10px] text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-100">{d}</span>
          ))}
          {p.priority && (
            <span className="text-[10px] text-gray-400">· {p.priority}</span>
          )}
        </div>
      </div>
      <span className="text-[10px] text-gray-400 flex-shrink-0">{completedDate}</span>
    </div>
  );
}

function GroupCard({ group }) {
  const [open, setOpen]       = useState(false);
  const [members, setMembers] = useState(null); // null = 아직 안 불러옴

  const handleToggle = async () => {
    if (!open && members === null) {
      const list = await getMembersFromDB(group.groupCode);
      setMembers(list);
    }
    setOpen(o => !o);
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    const ms = typeof ts === 'number' ? ts : ts?.toMillis?.() ?? null;
    return ms ? new Date(ms).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }) : '-';
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      <button onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="font-black text-sm text-gray-900 truncate">
              {group.groupName || `그룹 ${group.groupCode}`}
            </p>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {group.groupCode}
            </span>
          </div>
          <p className="text-xs text-gray-400">
            멤버 {members !== null ? members.length : group.memberCount}명 · 생성일 {formatDate(group.createdAt)}
          </p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          className={`text-gray-300 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gray-50 pt-3">
          {members === null ? (
            <p className="text-xs text-gray-400 text-center py-4">불러오는 중...</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">아직 멤버가 없어요.</p>
          ) : (
            members
              .sort((a, b) => (b.profile?.completedAt || 0) - (a.profile?.completedAt || 0))
              .map(m => <MemberRow key={m.id} member={m}/>)
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate   = useNavigate();
  const authUser   = useAuthStore(s => s.user);
  const authReady  = useAuthStore(s => s.authReady);

  const [loading, setLoading] = useState(true);
  const [groups,  setGroups]  = useState([]);
  const [query,   setQuery]   = useState('');

  const allowed = authReady && authUser && isAdminUser(authUser);

  useEffect(() => {
    if (!authReady) return;
    if (!allowed) { navigate('/', { replace: true }); return; }
    (async () => {
      const list = await getAllGroupsFromDB();
      list.sort((a, b) => {
        const am = typeof a.createdAt === 'number' ? a.createdAt : a.createdAt?.toMillis?.() ?? 0;
        const bm = typeof b.createdAt === 'number' ? b.createdAt : b.createdAt?.toMillis?.() ?? 0;
        return bm - am;
      });
      setGroups(list);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, allowed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g =>
      (g.groupName || '').toLowerCase().includes(q) ||
      (g.groupCode || '').toLowerCase().includes(q)
    );
  }, [groups, query]);

  if (!authReady || !allowed) return null;

  return (
    <div className="min-h-screen" style={{ background:'linear-gradient(160deg,#F5F3FF 0%,#EFF6FF 55%,#F0FDF9 100%)' }}>
      <div className="max-w-md mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <p className="text-[10px] font-bold text-purple-500 tracking-widest uppercase">관리자 모드</p>
            <p className="text-base font-black text-gray-900">전체 그룹 조회</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-gray-400 bg-white/80 border border-gray-100 px-2.5 py-1 rounded-full">
            {groups.length}개 그룹
          </span>
        </div>
      </div>

      <div className="px-4 pb-10 max-w-md mx-auto space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
            width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="그룹 이름, 코드 검색"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200
              text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-300 shadow-sm"/>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            {query ? `"${query}"와 일치하는 그룹이 없어요.` : '아직 생성된 그룹이 없어요.'}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map(g => <GroupCard key={g.groupCode} group={g}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
