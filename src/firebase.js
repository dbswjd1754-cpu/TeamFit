/**
 * Firebase 설정
 *
 * Firebase 환경변수가 없으면 Firestore 없이 localStorage만 사용합니다.
 * (앱 자체는 정상 동작, 멀티 기기 공유만 비활성)
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore }           from 'firebase/firestore';

const apiKey    = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// 환경변수가 없으면 Firebase 초기화 건너뜀
let db = null;

if (apiKey && projectId) {
  try {
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({
          apiKey,
          authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId,
          storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId:             import.meta.env.VITE_FIREBASE_APP_ID,
        });
    db = getFirestore(app);
  } catch (e) {
    console.warn('[Firebase] 초기화 실패, localStorage 모드로 동작합니다:', e.message);
    db = null;
  }
} else {
  console.info('[Firebase] 환경변수 없음 → localStorage 모드로 동작합니다.');
}

export { db };
