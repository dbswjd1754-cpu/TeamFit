# Firebase 설정 가이드

## 1단계: Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: "TeamFit" (자유롭게)
4. Google Analytics: 선택 해제 후 "프로젝트 만들기"

## 2단계: Firestore 활성화

1. 좌측 메뉴 "빌드" > "Firestore Database"
2. "데이터베이스 만들기" 클릭
3. **"테스트 모드로 시작"** 선택 (30일간 누구나 읽기/쓰기)
4. 위치: asia-northeast3 (서울) 선택
5. "완료"

## 3단계: 웹 앱 등록

1. 프로젝트 개요 > "</>" (웹) 아이콘 클릭
2. 앱 닉네임: "TeamFit Web"
3. "앱 등록" 클릭
4. **firebaseConfig 값 복사**

## 4단계: 환경변수 설정

### 로컬 개발
`.env.local.example`을 `.env.local`로 복사 후 값 입력:
```
cp .env.local.example .env.local
```

### Vercel 배포
Vercel 대시보드 > Settings > Environment Variables에 아래 추가:
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

## 5단계: Firestore 보안 규칙 (30일 후)

Firebase Console > Firestore > 규칙 탭:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /groups/{groupId}/members/{memberId} {
      allow read, write: if true;
    }
    match /groups/{groupId}/domains/{domainId} {
      allow read, write: if true;
    }
  }
}
```

## 완료!

설정 후 다른 기기에서 초대 링크로 접속하면
성향 분석 완료 즉시 모든 기기의 멤버 리스트에 실시간으로 표시됩니다.
