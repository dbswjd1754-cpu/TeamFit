/**
 * useAuthStore — Google 로그인 상태 (선택 기능)
 *
 * 로그인은 필수가 아님 — 로그인하지 않아도 기존처럼 이름을 직접 입력해
 * 그룹을 이용할 수 있다 (하위 호환). 로그인하면 기기가 바뀌어도
 * 같은 계정으로 들어오는 순간 이전 이름(name) 데이터에 자동으로 연결된다.
 */
import { create } from 'zustand';
import {
  signInWithPopup, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { getLinkedNameForUid, getLinkedUidForName, linkAuthToName, clearAuthLinkCache } from './groupDB';

const useAuthStore = create((set, get) => ({
  user:        null,   // { uid, displayName, email, photoURL } | null
  authReady:   false,  // onAuthStateChanged가 최초 1회라도 응답했는지
  linkedName:  null,   // 이 계정에 이미 연결된 이름 (있으면 자동 로그인 완료)
  linking:     false,

  /* ── 구글 로그인 ── */
  signInWithGoogle: async () => {
    if (!auth) {
      alert('로그인 기능을 사용할 수 없습니다. (Firebase 미설정)');
      return null;
    }
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    const user = { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL };
    set({ user });
    const linkedName = await getLinkedNameForUid(u.uid);
    set({ linkedName });
    return { user, linkedName };
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
