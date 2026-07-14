/**
 * useAuthStore — Google 로그인 상태 (선택 기능)
 *
 * 로그인은 필수가 아님 — 로그인하지 않아도 기존처럼 이름을 직접 입력해
 * 그룹을 이용할 수 있다 (하위 호환). 로그인하면 기기가 바뀌어도
 * 같은 계정으로 들어오는 순간 이전 이름(name) 데이터에 자동으로 연결된다.
 */
import { create } from 'zustand';
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { getLinkedNameForUid, getLinkedUidForName, linkAuthToName, clearAuthLinkCache } from './groupDB';

// 팝업 로그인이 실패/차단됐을 때 리디렉션 방식으로 재시도할지 판단하는 에러코드
const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
]);

// 모바일은 팝업 자체가 뜨자마자 브라우저에 의해 강제로 닫혀버리는 경우가 많아
// (에러조차 안 나고 그냥 아무 반응 없이 끝남) — 아예 처음부터 리디렉션 방식 사용
function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const useAuthStore = create((set, get) => ({
  user:        null,   // { uid, displayName, email, photoURL } | null
  authReady:   false,  // onAuthStateChanged가 최초 1회라도 응답했는지
  linkedName:  null,   // 이 계정에 이미 연결된 이름 (있으면 자동 로그인 완료)
  linking:     false,
  // 리디렉션 로그인으로 돌아왔을 때, 화면 쪽에서 "처음 로그인 안내 카드"를
  // 띄워야 하는지 알려주는 1회성 신호 (팝업 로그인은 signInWithGoogle의
  // 반환값으로 바로 알 수 있지만, 리디렉션은 페이지가 통째로 새로고침되어
  // 돌아오므로 신호를 store에 남겨둬야 화면이 이어서 처리할 수 있음)
  pendingClaimCheck: false,

  /* ── 구글 로그인 ──
     모바일 브라우저(특히 인앱 브라우저)는 팝업을 차단하거나 뜨자마자
     닫아버려서 아무 반응이 없는 것처럼 보일 수 있음 — 그런 경우 자동으로
     리디렉션 방식으로 재시도 */
  signInWithGoogle: async () => {
    if (!auth) {
      alert('로그인 기능을 사용할 수 없습니다. (Firebase 미설정)');
      return null;
    }
    if (isMobileBrowser()) {
      await signInWithRedirect(auth, googleProvider);
      return null; // 페이지가 구글 로그인 화면으로 이동했다가 돌아오므로 여기서는 결과 없음
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const user = { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL };
      set({ user });
      const linkedName = await getLinkedNameForUid(u.uid);
      set({ linkedName });
      return { user, linkedName };
    } catch (e) {
      if (POPUP_FALLBACK_CODES.has(e?.code)) {
        await signInWithRedirect(auth, googleProvider);
        return null; // 페이지가 구글 로그인 화면으로 이동했다가 돌아오므로 여기서는 결과 없음
      }
      throw e;
    }
  },

  /* ── 로그아웃 — 계정↔이름 연결 자체는 Firestore에 남아있어 다음 로그인 시 그대로 복원됨 ── */
  signOutUser: async () => {
    const uid = get().user?.uid;
    if (auth) { try { await signOut(auth); } catch {} }
    if (uid) clearAuthLinkCache(uid);
    set({ user: null, linkedName: null });
  },

  /* ── 처음 로그인한 계정을 기존 이름(name)에 연결(claim) ──
     이미 다른 계정이 그 이름을 쓰고 있으면 거부하고 이유를 반환 */
  claimName: async (name) => {
    const uid = get().user?.uid;
    if (!uid || !name?.trim()) return { success: false, reason: 'invalid' };
    const trimmed = name.trim();

    set({ linking: true });
    try {
      const existingUid = await getLinkedUidForName(trimmed);
      if (existingUid && existingUid !== uid) {
        return { success: false, reason: 'taken' };
      }
      await linkAuthToName(uid, trimmed);
      set({ linkedName: trimmed });
      return { success: true };
    } finally {
      set({ linking: false });
    }
  },
}));

// 앱 시작 시 로그인 상태 구독 (Firebase 미설정이면 아무 것도 하지 않음)
if (auth) {
  // 리디렉션 로그인으로 돌아온 직후 1회 — 처음 로그인이면 이름 연결 안내가
  // 필요하다는 신호를 남김 (onAuthStateChanged가 실제 user/linkedName은 채워줌)
  getRedirectResult(auth)
    .then(async (result) => {
      if (!result?.user) return;
      const linkedName = await getLinkedNameForUid(result.user.uid);
      if (!linkedName) useAuthStore.setState({ pendingClaimCheck: true });
    })
    .catch((e) => console.warn('[useAuthStore] 리디렉션 로그인 결과 처리 실패:', e.message));

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      const user = { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL };
      const linkedName = await getLinkedNameForUid(u.uid);
      useAuthStore.setState({ user, linkedName, authReady: true });
    } else {
      useAuthStore.setState({ user: null, linkedName: null, authReady: true });
    }
  });
} else {
  useAuthStore.setState({ authReady: true });
}

export default useAuthStore;
