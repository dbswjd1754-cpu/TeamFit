# TeamFit 🤝

> PM 부트캠프 수강생을 위한 팀원 매칭 서비스

협업 스타일 · 관심 도메인 · 프로젝트 우선순위를 기반으로  
나와 가장 잘 맞는 팀원을 **TeamFit Match Score**로 추천해드립니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 그룹 코드 | 기수별 분리 (PM7, PM6 …) |
| 협업 스타일 검사 | PM 프로젝트 상황 기반 10문항 시나리오 |
| Match Score | 협업 스타일 50 + 관심 도메인 30 + 우선순위 20 = 100점 |
| 상세 분석 | 점수 Breakdown · 추천 이유 · 협업 강점 · 팁 |

## 협업 유형

- 🚀 **추진형** — 빠른 의사결정, 목표 중심
- 🤝 **소통형** — 팀 합의, 관계 조율
- 🔍 **탐구형** — 근거 기반, 완성도 지향
- ⚡ **실행형** — 빠른 실행, 프로토타입 선호

---

## 기술 스택

- **React 19** + **Vite 8**
- **Tailwind CSS 3**
- **React Router v7**
- **Zustand** (클라이언트 상태 관리)

---

## 개발 환경 실행

```bash
npm install
npm run dev
```

## 프로덕션 빌드

```bash
npm run build
# dist/ 폴더가 생성됩니다
```

---

## Vercel 배포

### 방법 1 — GitHub 연동 (권장)

1. GitHub에 레포 생성 후 push
2. [vercel.com](https://vercel.com) → **Add New Project** → 레포 선택
3. 설정은 자동 감지 (Vite 프레임워크 자동 인식)
4. **Deploy** 클릭

### 방법 2 — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

> `vercel.json`에 SPA 라우팅 설정이 포함되어 있어 별도 설정 불필요

---

## 프로젝트 구조

```
src/
├── data/
│   ├── questions.js      # 10문항 + 유형 정의
│   └── mockUsers.js      # 테스트용 유저 데이터
├── utils/
│   └── scoring.js        # Match Score 계산 + 자연어 생성
├── store/
│   └── useUserStore.js   # Zustand 전역 상태
├── components/
│   ├── ui/               # Button, ProgressBar, ScoreBar, TypeBadge
│   └── layout/           # PageLayout
└── pages/
    ├── Landing.jsx
    ├── GroupCode.jsx
    ├── BasicInfo.jsx
    ├── Domain.jsx
    ├── Priority.jsx
    ├── StyleTest.jsx
    ├── MyResult.jsx
    ├── RecommendFeed.jsx
    └── MatchDetail.jsx
```

---

## 화면 플로우

```
랜딩 → 그룹 코드 → 이름 입력 → 관심 도메인
     → 프로젝트 우선순위 → 협업 스타일 검사 (10문항)
     → 내 유형 결과 → 추천 피드 → 상세 분석
```
