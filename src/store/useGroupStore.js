import { create } from 'zustand';
import {
  loadSession, saveSession,
  saveMemberToDB, getMembersFromDB, getMembersCached,
  getMemberByName, isMemberCompleted,
  subscribeMembers, memberToScoringFormat,
  subscribeDomains,
  getCustomDomainsFromDB, saveCustomDomainToDB,
  debugDump,
} from './groupDB';

export const DEFAULT_DOMAINS = [
  { id:'ai',          label:'AI',           emoji:'🤖', isCustom:false },
  { id:'saas',        label:'SaaS',         emoji:'🖥️', isCustom:false },
  { id:'ecommerce',   label:'이커머스',      emoji:'🛍️', isCustom:false },
  { id:'fintech',     label:'금융/핀테크',   emoji:'💳', isCustom:false },
  { id:'healthcare',  label:'헬스케어',      emoji:'🏥', isCustom:false },
  { id:'game',        label:'게임',          emoji:'🎮', isCustom:false },
  { id:'edtech',      label:'교육',          emoji:'📚', isCustom:false },
  { id:'travel',      label:'여행/숙박',     emoji:'✈️', isCustom:false },
  { id:'productivity',label:'생산성',        emoji:'⚡', isCustom:false },
  { id:'community',   label:'커뮤니티',      emoji:'💬', isCustom:false },
  { id:'food',        label:'푸드테크',      emoji:'🍽️', isCustom:false },
  { id:'realestate',  label:'부동산',        emoji:'🏠', isCustom:false },
  { id:'mobility',    label:'모빌리티',      emoji:'🚗', isCustom:false },
  { id:'logistics',   label:'물류',          emoji:'📦', isCustom:false },
  { id:'media',       label:'미디어/콘텐츠', emoji:'📱', isCustom:false },
];

const session = loadSession();

// 구독 해제 함수 보관
let _unsubMembers = null;
let _unsubDomains = null;

const useGroupStore = create((set, get) => ({
  groupCode:     session.groupCode   || '',
  isEntered:     session.isEntered   || false,
  currentName:   session.currentName || '',

  members:       session.groupCode ? getMembersCached(session.groupCode) : [],
  // customDomains: 배열, 변경 시 컴포넌트 re-render 트리거
  customDomains: session.groupCode ? getCustomDomainsFromDB(session.groupCode) : [],
  isLoading:     false,

  /* ── 그룹 입장 ── */
  setGroupCode: async (code) => {
    if (!code) return;

    // 이전 구독 모두 해제
    if (_unsubMembers) { _unsubMembers(); _unsubMembers = null; }
    if (_unsubDomains) { _unsubDomains(); _unsubDomains = null; }

    const prev = loadSession();
    saveSession({ ...prev, groupCode: code, isEntered: true });

    // 캐시된 값으로 즉시 렌더
    set({
      groupCode:     code,
      isEntered:     true,
      members:       getMembersCached(code),
      customDomains: getCustomDomainsFromDB(code),
      isLoading:     true,
    });

    // 멤버 실시간 구독
    _unsubMembers = subscribeMembers(code, (members) => {
      set({ members, isLoading: false });
    });

    // ★ 커스텀 도메인 실시간 구독
    // 같은 그룹 다른 사용자가 등록한 도메인을 자동으로 수신
    _unsubDomains = subscribeDomains(code, (domains) => {
      set({ customDomains: domains });
    });
  },

  /* ── 현재 사용자 이름 저장 ── */
  setCurrentName: (name) => {
    const prev = loadSession();
    saveSession({ ...prev, currentName: name });
    set({ currentName: name });
  },

  /* ── 완료 여부 ── */
  isCurrentMemberCompleted: () => {
    const { groupCode, currentName } = get();
    return !!(groupCode && currentName && isMemberCompleted(groupCode, currentName));
  },

  /* ── 현재 사용자 프로필 ── */
  getCurrentMember: () => {
    const { groupCode, currentName, members } = get();
    if (!groupCode || !currentName) return null;
    return members.find(m => m.name === currentName)
      || getMemberByName(groupCode, currentName);
  },

  /* ── 멤버 저장 ── */
  saveMember: async (rawMember) => {
    const { groupCode } = get();
    if (!groupCode || !rawMember?.name) return;
    await saveMemberToDB(groupCode, rawMember);
    const fresh = getMembersCached(groupCode);
    set(s => ({ members: fresh.length >= s.members.length ? fresh : s.members }));
  },

  /* ── 멤버 새로고침 (수동) ── */
  refreshMembers: async () => {
    const { groupCode } = get();
    if (!groupCode) return;
    set({ isLoading: true });
    const members = await getMembersFromDB(groupCode);
    set({ members, isLoading: false });
  },

  /* ── scoring 엔진용 포맷 ── */
  getMembersForScoring: () => {
    const { groupCode, members } = get();
    return members.map(m => memberToScoringFormat(m, groupCode));
  },

  exit: () => {
    if (_unsubMembers) { _unsubMembers(); _unsubMembers = null; }
    if (_unsubDomains) { _unsubDomains(); _unsubDomains = null; }
    saveSession({});
    set({ groupCode:'', isEntered:false, currentName:'', members:[], customDomains:[], isLoading:false });
  },

  /* ── 도메인 API ── */

  // 현재 그룹의 전체 도메인 (기본 + 커스텀)
  // customDomains 상태가 바뀌면 이 함수를 호출하는 컴포넌트도 자동 갱신
  getGroupDomains: () => {
    const { customDomains } = get();
    return [...DEFAULT_DOMAINS, ...(customDomains || [])];
  },

  // 새 도메인 등록
  // ① 중복 체크 → ② localStorage 즉시 저장 → ③ store 상태 즉시 갱신 → ④ Firebase 비동기 저장
  addDomain: async (label) => {
    const { groupCode, customDomains } = get();
    if (!groupCode) return { success: false, duplicate: false };

    const trimmed = label.trim();
    if (!trimmed) return { success: false, duplicate: false };

    const norm = s => (s || '').toLowerCase().replace(/\s+/g, '').trim();
    const all  = [...DEFAULT_DOMAINS, ...(customDomains || [])];
    const dup  = all.find(d => norm(d.label) === norm(trimmed));
    if (dup) return { success: false, duplicate: true, existingId: dup.id };

    const nd = {
      id:       `custom_${groupCode}_${Date.now()}`,
      label:    trimmed,
      emoji:    '🏷️',
      isCustom: true,
    };

    // ★ store 상태 즉시 갱신 (re-render 트리거) — Firebase 완료 기다리지 않음
    set(s => ({ customDomains: [...(s.customDomains || []), nd] }));

    // Firebase + localStorage 저장 (비동기)
    await saveCustomDomainToDB(groupCode, nd);

    return { success: true, duplicate: false, domain: nd };
  },

  debug: () => debugDump(),
}));

// 앱 시작 시 기존 세션의 구독 재연결
if (session.groupCode && session.isEntered) {
  useGroupStore.getState().setGroupCode(session.groupCode);
}

export { memberToScoringFormat };
export default useGroupStore;
