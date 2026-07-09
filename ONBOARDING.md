# TeamFit — 온보딩 / 세션 컨텍스트

이 문서는 새 채팅에서 이 프로젝트 작업을 이어갈 때 빠르게 맥락을 잡기 위한 요약입니다.

## 프로젝트 개요

- **TeamFit**: 팀원들의 협업 성향(Persona)을 분석하고, 그룹(프로젝트) 단위로 팀원 추천·팀 밸런스 분석을 제공하는 React 앱.
- 스택: React 19 + Vite + Tailwind + Zustand + Firebase(Firestore). 인증 시스템 없음 — 사용자 식별은 "이름" 문자열 기준(로컬 브라우저에 저장).
- GitHub: https://github.com/dbswjd1754-cpu/TeamFit (main 브랜치)
- 로컬 개발 환경에 Node.js/npm, GitHub CLI(gh)가 기본 설치되어 있지 않음 — 매 세션마다 스크래치패드에 바이너리를 내려받아 써야 할 수 있음.

## Firestore 데이터 구조

```
groups/{groupCode}                    — { groupCode, groupName, createdAt }
groups/{groupCode}/members/{memberId} — 그룹별 멤버 프로필 사본 (성향검사 결과, 도메인, 우선순위)
groups/{groupCode}/domains/{domainId} — 그룹에서 추가한 커스텀 도메인
profiles/{name}                       — 그룹과 무관한 전역 Persona 프로필
  .dominantType, .typeRatio, .rawAnswerVector, .domains, .priority, .completedAt
  .myGroups: [{ groupCode, groupName, joinedAt, lastAccessAt }]
```

Firebase 연결 실패 시 대부분 localStorage로 자동 폴백하도록 되어 있음(`src/store/groupDB.js`).

## 이번 세션에서 진행한 주요 작업 (시간순)

1. **GitHub 연동** — 로컬 폴더를 `TeamFit` 저장소로 최초 연결.
2. **잘 맞는 Persona 영역 개선** — ⓘ 설명 문구를 실제 취지에 맞게 수정, 카드에서 퍼센트 제거.
3. **"성향 다시 검사하기" 반영 로직 개선** — 다시 검사한 결과가 화면마다 다르게 보이는 문제 등 개인화 설명 추가.
4. **팀원 보충 크래시 수정** — `SupplementResult.jsx`에서 스코프 밖 변수 참조로 인한 크래시, 완전 균형 팀일 때 `leastKey` undefined로 인한 크래시 2건 수정.
5. **보완 필요 배지 색상** — 하드코딩된 빨간색 → 성향별 고유 색상으로 변경.
6. **그룹 간 Persona 재사용 시스템 (핵심 기능)** — `src/store/groupDB.js`, `src/store/useUserStore.js`, `src/utils/profileRouting.js` 신규/수정.
   - 한 번 성향검사를 완료하면 `profiles/{name}`에 전역 저장 → 다른 그룹을 만들거나 참여해도 재검사하지 않음.
   - 재검사 시 그 사용자가 속한 **모든** 그룹의 멤버 데이터가 최신 결과로 일괄 갱신됨(fan-out).
7. **시작 화면 개편** (`GroupEntry.jsx`) — "내 프로필 보기" 카드, "내 그룹 바로가기"(Bottom Sheet, `MyGroupsSheet.jsx`), 그룹 생성 시 그룹 이름 입력 단계, 이미 성향 등록된 사용자를 위한 "✅ 성향 등록 완료" 카드.
8. **"내 프로필 보기" 화면** (`ProfileResult.jsx`) — 성향검사 완료 직후 화면과 동일한 컴포넌트(`src/components/persona/PersonaResultView.jsx`)를 공유해서 재사용.
9. **GroupHome에 뒤로가기 버튼** 추가 — 그룹 안에서 시작 화면으로 이동 가능(그룹 세션은 유지됨).
10. **팀원 보충 화면 박람회 대비 리뷰 + 수정** (`SupplementResult.jsx`) — 아래 항목을 리뷰 리포트로 먼저 제시하고 승인 후 수정:
    - AI 추천 탭 순위가 점수 순이 아니었던 버그(부족 성향 보유자 우선 정렬이 점수를 무시) 수정.
    - 리스트 점수와 상세정보(Team Contribution Score)가 탭에 따라 다른 가중치로 계산되어 숫자가 달랐던 문제 수정 — 이제 항상 일치.
    - 상세정보의 "AI 추천 이유"가 후보 개인 지표를 무시하고 팀의 부족 성향만 보고 고정 문구를 쓰던 문제 수정 — 리스트와 동일한 근거를 재사용.
    - 변화 없는 항목(예: 20%→20%) 표시 정리, 죽은 코드 제거, 추천 이유 최대 2개로 제한.
11. **그룹 홈 헤더에 그룹 이름 표시** — 기존엔 그룹 코드만 보였는데, 코드 위에 그룹 이름도 함께 표시.
12. **시작 화면 로고·아이콘 교체** — 사용자가 첨부한 퍼즐 캐릭터 이미지로 로고와 "그룹 만들기/그룹 코드 입력/내 그룹 바로가기" 3개 버튼 아이콘을 교체. 원본 이미지에 체크무늬 배경이 그려져 있어(진짜 투명이 아니었음) flood-fill로 배경만 제거하고 디자인은 그대로 유지. 로고와 "TeamFit" 텍스트 사이 여백도 좁혀 하나의 컴포넌트처럼 보이게 조정.
13. **분석 로딩 화면 퍼즐 애니메이션 재설계** (`AnalysisLoading.jsx`) — 기존엔 두 퍼즐이 일정 거리에서 좌우로 왔다갔다만 반복. `progress`/`done` 값을 받아 0~40%(약한 bounce)→40~80%(easing으로 서서히 접근)→80~100%(소켓·돌기가 실제로 맞물리는 정확한 위치까지 이동)→완료 시 scale pulse + 반짝임 순서로 재구현. 맞물림 좌표는 SVG 소켓/돌기 위치를 실측해서 각 조각 20px씩 이동하는 값으로 확정.

모든 변경은 각 단계마다 실제 브라우저 미리보기에서 재현·검증하고, 테스트용으로 만든 Firestore 데이터는 매번 정리했습니다.

## 다음에 이어갈 때 참고할 점

- 새 채팅에서 이 파일을 첨부하거나 공유 링크를 열면 위 맥락을 그대로 이어받을 수 있습니다.
- `git log --oneline`으로 커밋 단위 변경 내역을 확인할 수 있습니다.
- 로컬 미리보기가 필요하면 Node.js가 시스템에 없을 수 있으니, 먼저 `node -v`로 확인 후 필요시 안내해주세요.
