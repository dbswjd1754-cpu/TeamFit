# TeamFit 설계 문서

> 이 문서는 2026-07-09 기준 실제 구현된 코드를 그대로 정리한 설계 문서입니다.
> 코드는 수정하지 않았으며, 모든 내용은 파일명·함수명을 근거로 작성되었습니다.

---

## 1. 전체 서비스 구조

### 1-1. 라우팅 맵 (`src/App.jsx`)

TeamFit은 `react-router-dom`의 `BrowserRouter` 기반 SPA이며, 실제 서비스 흐름은 크게
**① 그룹 진입 → ② 온보딩(성향검사) → ③ 그룹 홈 → ④ 3가지 AI 기능** 으로 구성됩니다.

```
진입
  /                          GroupEntry        그룹 코드 입력 / 그룹 생성
  /group/join/:code          JoinRedirect      초대 링크로 접속 시 자동 입장
  /already-completed         AlreadyCompleted  이미 검사를 완료한 사용자 재접속 안내
  /profile                   ProfileResult     "내 프로필 보기" (그룹 무관, 전역 Persona)

온보딩 (성향검사, Step 1~4)
  /onboarding/name           OnboardingName      Step 1 · 이름 입력
  /onboarding/domain         OnboardingDomain    Step 2 · 관심 도메인 선택 (다중 선택)
  /onboarding/priority       OnboardingPriority  Step 3 · 팀 선호 스타일(priority) 1개 선택
  /onboarding/test           OnboardingTest      Step 4 · 10문항 성향 검사
  /onboarding/result         OnboardingResult    결과 화면 (PersonaResultView 래핑)

그룹 홈
  /group-home                GroupHome         탭형 허브: 홈 / AI 추천 / 내 프로필

나와 맞는 팀원 찾기 (개인 매칭)
  /find-teammate              FindTeammate      AI 추천 / 비슷한 성향 / 같은 도메인 (3탭)

팀원 보충 (팀 매칭)
  /supplement/count            SupplementCount   몇 명 보충할지 입력
  /supplement/select           SupplementSelect  현재 팀원 선택 (검색 + 셀프 고정)
  /supplement/loading          AnalysisLoading(mode="supplement")  로딩 애니메이션
  /supplement/result           SupplementResult  Team Balance Score + 4탭 추천

팀 밸런스가 궁금해요
  /balance/count                BalanceCount      팀 인원 확인
  /balance/select               BalanceSelect     현재 팀원 선택 (검색 + 셀프 고정)
  /balance/loading              AnalysisLoading(mode="balance")
  /balance/result                BalanceResult     팀 협업 밸런스 리포트 (나만 보기)

하위 호환 리다이렉트
  /mode-select, /supplement/team-select, /supplement/balance,
  /team-balance/select, /team-balance/result, /landing → 각각 새 경로로 Navigate
```

### 1-2. 레거시/미사용 코드 (참고용 — 실제 서비스 흐름에 영향 없음)

- `/recommend`(`RecommendFeed.jsx`), `/match/:userId`(`MatchDetail.jsx`) — 라우트는 등록되어 있으나
  파일 내부 주석에 "레거시"로 표기되어 있고, 현재 UI 어디에서도 이 경로로 이동하는 버튼/링크가 없습니다.
- `/my-profile`(`MyProfile.jsx`) — 라우트는 등록돼 있으나 실제로 이 경로로 `navigate()`하는 코드가
  프로젝트 전체에서 발견되지 않습니다 (그룹 내 "내 프로필"은 `GroupHome.jsx`의 `profile` 탭이
  `InlineMyProfile` 컴포넌트로 인라인 렌더링하며, 이 라우트를 거치지 않습니다).
- `BasicInfo.jsx`, `Domain.jsx`, `GroupCode.jsx`, `MyResult.jsx`, `Priority.jsx`, `StyleTest.jsx`,
  `SupplementGroupCode.jsx`, `TeamBalance.jsx`, `TeamBalanceResult.jsx`, `TeamBalanceSelect.jsx`,
  `TeamSelect.jsx` — `App.jsx`에 아예 import되어 있지 않은 파일입니다. 이 파일들만 참조하는
  `src/utils/scoring.js`(구버전 스코어링), `src/store/useTeamStore.js`, `src/data/mockUsers.js` 역시
  현재 서비스에서 사용되지 않습니다.
  - 단, `src/utils/scoring.js`의 `calcBreakdown`/`calcVectorSimilarity`는 `SupplementResult.jsx`
    상단에서 import되고 있으나(28번째 줄), 실제 렌더링 코드에서는 호출되지 않는 dead import입니다.

### 1-3. 데이터 흐름 개요

```
OnboardingTest (10문항 응답)
   → useUserStore.finalizeTest()
       - typeRatio, dominantType, rawAnswerVector 계산
       - profiles/{name} (전역 Persona 프로필) 저장 — saveUserProfileToDB()
       - groups/{code}/members/{name} (그룹별 스냅샷) 저장 — useGroupStore.saveMember()
       - profiles/{name}.myGroups 배열 갱신 — recordGroupAccess()
   → OnboardingResult → PersonaResultView (Persona 계산 + "잘 맞는 Persona")

GroupHome
   → useGroupStore.members (Firestore 실시간 구독, subscribeMembers)
   → "나와 맞는 팀원 찾기"  → FindTeammate.jsx      (me = 나 1명, 후보 = 그룹 내 전체)
   → "팀원 보충"           → SupplementSelect → SupplementResult.jsx
                              (teamProfile = makeTeamProfile(선택한 팀원들), 후보 = 나머지 그룹원)
   → "팀 밸런스가 궁금해요" → BalanceSelect → BalanceResult.jsx
                              (선택한 팀원들만으로 typeRatio 기반 밸런스 계산, 추천 없음)
```

핵심 원칙(코드 주석 기준, `balanceScoring.js` 상단): 모든 계산은 **`typeRatio`(4가지 성향 비율)
전체**를 사용하며 `dominantType`(대표 성향 1개) 단독 사용은 금지됩니다. `dominantType`은
`typeRatio`의 최댓값 key일 뿐이며, UI 배지·아바타 색상 등 표시 목적으로만 쓰입니다.

---

## 2. AI 성향 분석

### 2-1. 10문항 구성 (`src/data/questions.js`)

- 4가지 성향: `A=추진형 🚀`, `B=소통형 🤝`, `C=탐구형 🔍`, `D=실행형 ⚡` (`TYPES` 객체)
- 각 문항은 PM 프로젝트 상황(`situation`)을 제시하고 4개의 행동 선택지(`options`) 중 하나를 고르게 합니다.
- **중요한 설계 디테일**: 선택지의 `key`(A/B/C/D, 화면에 표시되는 위치)와 `type`(실제로 반영되는 성향)이
  문항마다 다르게 셔플되어 있습니다. 예) Q1은 key=type 그대로(A→A, B→B...)이지만, Q2는
  key A가 실제로는 `type:'D'`, key B가 `type:'A'`로 매핑됩니다. 이는 사용자가 "1번만 계속 고르는"
  식의 편향된 응답을 해도 특정 성향에만 쏠리지 않도록 하기 위한 의도적 설계입니다.
- 각 옵션 선택 시 `{ questionId, selectedKey, type }` 형태의 답변 객체가 생성되어
  `useUserStore.addAnswer()`로 누적됩니다 (`OnboardingTest.jsx`).

### 2-2. typeRatio 계산 (`useUserStore.js` / `finalizeTest()`)

```js
counts = { A:0, B:0, C:0, D:0 }
sorted.forEach(a => counts[a.type]++ )   // type 기준으로 카운트 (key 아님)
total  = sorted.length (=10)
typeRatio.A = round(counts.A / total * 100)   // B, C, D 동일
dominantType = counts 중 최댓값 key
rawAnswerVector = sorted.map(a => a.selectedKey)   // 예: ['A','C','B',...] 10개
```

- `typeRatio`는 4개 값의 합이 항상 100(±반올림 오차)이 되도록 설계된 백분율 벡터입니다.
- `rawAnswerVector`는 사용자가 실제로 클릭한 위치(key) 시퀀스이며, `typeRatio`가 계산 불가능한
  예외 상황(추후 설명)에서만 유사도 계산의 fallback으로 사용됩니다.

### 2-3. Persona 결정 (`src/utils/persona.js` / `buildPersona(typeRatio)`)

Persona는 MBTI처럼 고정된 유형이 아니라, `typeRatio`로부터 매번 동적으로 계산됩니다.
판정은 아래 **우선순위(③ → ② → ①)** 로 순차 검사합니다:

1. **③ Balanced (올라운더)** — 가장 먼저 검사.
   `entries.length >= 3` (0%가 아닌 성향이 3개 이상) 이고 `(최댓값 - 최솟값) < 15%p` 이면
   `BALANCED_PERSONA`(🌈 올라운더) 반환.
2. **② Dual (조합 Persona)** — 1위와 2위의 차이가 `5%p` 이하면, 두 성향 key를 정렬해
   조합한 `DUAL_PERSONA`(예: `AB`→균형 잡힌 리더, `AC`→전략 설계자 등 6종) 반환.
3. **① Dominant (단일 Persona)** — 1위가 `40% 이상`이면서 2위와 `10%p 이상` 차이나면
   `SINGLE_PERSONA[1위]` (4종: 선도하는 개척자/팀을 잇는 조율자/깊이 파는 탐험가/빠르게 실행하는 제작자) 반환.
4. **기본값** — 위 세 조건에 모두 해당하지 않으면 1위 성향 기준 `SINGLE_PERSONA`로 fallback.

Persona 데이터(`name`, `en`, `emoji`, `desc`, `strengths[]`)는 `SINGLE_PERSONA`/`DUAL_PERSONA`/
`BALANCED_PERSONA` 상수에 하드코딩되어 있으며, 총 4(단일) + 6(조합) + 1(올라운더) = **11종**입니다.

`getAllPersonas()`는 이 11종을 하나의 배열로 반환하고, `getPersonaRatio(key)`는 각 Persona를
"대표하는" 가상 `typeRatio`를 반환합니다 (예: `A` → `{A:65,B:15,C:12,D:8}`, `AB` → `{A:40,B:40,C:12,D:8}`).
이 가상 비율은 실제 사용자 데이터가 아니라, "잘 맞는 Persona" 계산 시 각 Persona 유형을 대표하는
가상 후보를 만들기 위한 용도로만 쓰입니다.

### 2-4. "잘 맞는 Persona" 계산 (`calcMatchedPersonas()` — `PersonaResultView.jsx`, `GroupHome.jsx`에 동일 로직 중복)

1. `getAllPersonas()`에서 내 Persona(`myPersonaKey`)를 제외한 나머지 10개를 후보로 만듭니다.
2. 각 후보에 `getPersonaRatio(key)`를 `typeRatio`로 주입한 "가상 사용자" 객체를 생성합니다
   (`domains`/`priority`/`rawAnswerVector`는 **나 자신의 값을 그대로 복사**해서 채워 넣습니다 —
   즉 이 계산은 오직 "성향 궁합"만 비교하도록 설계되어 있습니다).
3. `buildTabRecommendations('ai', me, candidates, [])` — 실제 추천 엔진에 그대로 태워서 점수를 냅니다.
   - `teamMembers=[]`이므로 `calcBalanceImpactScore`는 후술하는 로직에 의해 모든 후보에게
     동일하게 50점을 반환합니다 → 결과적으로 "밸런스" 항목은 상수가 되어 순위에 영향을 주지 않고,
     사실상 **styleSim(40%) + domainPct(30%) + prioPct(20%)** 로 순위가 갈립니다.
     (domains/priority가 나 자신과 동일하게 복사되어 있으므로 domainPct·prioPct는 모든 후보에서
     동일 100점 — 결과적으로 실질적 변별 요소는 **styleSim(typeRatio 코사인 유사도)** 하나입니다.)
4. 점수 상위 2개 Persona를 "잘 맞는 Persona"로 채택합니다 (`recs.slice(0,2)`).

즉 "잘 맞는 Persona"는 별도의 궁합 공식이 있는 게 아니라, **실제 추천 엔진(`buildTabRecommendations`)을
그대로 재사용**하여 "나와 typeRatio 코사인 유사도가 가장 높은 Persona 유형 2개"를 뽑는 방식입니다.

- `FindTeammate.jsx`의 `calcPersonaCompatScore()`는 이와 별개로, "이 후보의 Persona가 내
  matchedPersonas(top2) 안에 들어가는지"를 0/100 점수로 변환해 AI 추천 탭 가중치에 사용합니다
  (자세한 내용은 3장).

---

## 3. AI 추천 — 나와 맞는 팀원 찾기 (`src/pages/FindTeammate.jsx`)

이 화면은 **개인 매칭 전용**입니다. `me`는 로그인한 사용자 1명이며, 팀 개념은 존재하지 않습니다
(`buildTabRecommendations(tab, me, candidates, [])`처럼 항상 `teamMembers=[]`로 호출됩니다).

### 3-1. AI 추천 탭 (`tab='ai'`)

`FindTeammate.jsx`는 공용 엔진(`buildTabRecommendations`)의 `'ai'` 결과를 그대로 쓰지 않고,
**개인 매칭 전용 재계산**을 수행합니다 (`FindTeammate.jsx` 561~582행):

```js
base = buildTabRecommendations('ai', me, allMembers, [])   // styleSim/domainPct/prioPct/breakdown만 재사용
personaCompat = calcPersonaCompatScore(me, candidatePersonaKey, myPersonaKey)  // 0 or 100
score = round(
  styleSim  * 0.40 +
  domainPct * 0.30 +
  prioPct   * 0.20 +
  personaCompat * 0.10
)
```

- 공용 엔진의 `balanceImp`(팀 밸런스 기여도 — teamMembers=[]라 의미가 없음) 대신
  **Persona 궁합(personaCompat)** 을 10% 가중치 항목으로 대체한 것이 개인 매칭만의 고유 설계입니다.
- `personaCompat`은 후보의 Persona가 "내 잘 맞는 Persona top2" 안에 있으면 100점, 아니면 0점인
  이분법 점수입니다 (`calcPersonaCompatScore`, 2-4절 로직 재사용).
- 정렬은 재계산한 정수 `score` 내림차순, 상위 5명(`slice(0,5)`).

### 3-2. 비슷한 성향 탭 (`tab='similar'`)

`buildTabRecommendations('similar', me, allMembers, [])`를 그대로 사용합니다.
가중치: `styleSim×0.70 + domainPct×0.20 + prioPct×0.10` (밸런스 항목 없음).
후보 필터링(`buildTabRecommendations` 내부): 전체 후보를 `styleSim` 내림차순 정렬 후
상위 30%만 pool로 사용(`Math.ceil(length*0.3)`, 최소 1명 보장) → 그 안에서 종합 점수 재정렬.

### 3-3. 같은 도메인 탭 (`tab='domain'`)

`buildTabRecommendations('domain', me, allMembers, [])`.
가중치: `domainPct×0.70 + styleSim×0.20 + prioPct×0.10`.
후보 필터링: `breakdown.domainCount >= 1`(공통 도메인 1개 이상)인 후보만 남기되, 만약 그런 후보가
하나도 없으면 필터링을 포기하고 전체 pool을 그대로 사용합니다(`if (filtered.length > 0) pool = filtered`).

### 3-4. 공통 계산 요소

- **styleSim** — `calcStyleSim(candidate, me)`: `typeRatio` 코사인 유사도(`calcTypeRatioCosSim`)를
  0~100으로 정규화. 둘 중 하나라도 `typeRatio` 총합이 0이면 `rawAnswerVector` 코사인 유사도
  (`calcAnswerVecSim`)로 fallback.
- **domainPct** — `calcDomainMatch(me.domains, candidate.domains)`: 공통 도메인 개수를 3개 만점
  기준으로 스케일(`min(100, common/3*100)`). 문자열은 소문자화+공백제거 후 비교(`normDomain`).
- **prioPct** — `calcPriorityMatch(me.priority, candidate.priority)`: 완전히 같으면 100,
  `STYLE_AFFINITY`(성향 조합)가 겹치면 50, 아니면 0.
- 필터링/후보군은 항상 "나(currentName)를 제외한 같은 그룹 멤버 전체"입니다
  (`allMembers = rawMembers.map(...).filter(m => m.name !== currentName)`).

### 3-5. 카드 UI에서의 표시 방식

- 리스트 카드(`RecommendCard`)는 3탭 모두 동일하게 **"매칭 적합도"** 라벨 + 바 + `%`만 표시합니다
  (통일 이전에는 탭마다 다른 지표를 보여주었으나, 사용자 피드백에 따라 통일됨).
- `domain` 탭에서만 "공통 도메인" 보조 배지가 추가로 붙습니다(칩 형태 + "N개 일치").
- 표시값은 `preciseScore(bd, score)`로 소수점 1자리까지 재계산한 값(`scoreExact`)이며,
  **정렬에는 영향을 주지 않고 표시 전용**입니다(동점처럼 보이는 79%/79% 같은 상황을
  79.3%/78.5%처럼 구분해 보여주기 위함). 실제 순위는 `rec.score`(정수)로 결정됩니다.
- 상세 Bottom Sheet(`DetailSheet`)는 탭별 `ALL_ITEMS` 배열(성향 유사도/관심 도메인/팀 선호 스타일/
  Persona 궁합 또는 팀 밸런스 기여)로 산출 근거를 보여주며, AI 추천 이유는 각 항목의 `raw×weight`
  기여도(`item.score`) 기준 내림차순으로 정렬되어 후보마다 다른 순서·조합으로 나타납니다.

---

## 4. 팀원 보충 (`src/pages/SupplementResult.jsx`)

이 화면은 **팀 매칭**입니다. `me`가 아니라 이미 선택된 `teamMembers`를 하나의 가상 인물로
합친 `teamProfile`이 추천 엔진의 기준점이 됩니다.

### 4-1. TeamProfile 생성 (`makeTeamProfile(teamMembers, groupCode)` — `balanceScoring.js`)

```js
avgR      = teamMembers의 typeRatio 4개 값 각각 평균(반올림)      // "팀 평균 성향"
domains   = teamMembers의 domains 전체 합집합(중복 제거)
priority  = teamMembers 중 최빈값 priority (동률이면 먼저 나온 것)
rawAnswerVector = teamMembers의 rawAnswerVector를 이어붙임(flatMap)
dominantType = avgR에서 최댓값 key
```

`SupplementResult.jsx`의 `RecommendSection`에서 `teamProfile = makeTeamProfile(teamMembers, groupCode) || me`로
계산되며, 이 객체가 `buildTabRecommendations`의 `me` 인자로 그대로 전달됩니다.

### 4-2. 탭별 계산 — 공용 엔진 `buildTabRecommendations(tab, teamProfile, candidates, teamMembers)`

| 탭 | 가중치 (style/domain/priority/balance) | 후보 필터링 |
|---|---|---|
| `ai` | 0.40 / 0.30 / 0.20 / 0.10 | 없음(전체 후보) |
| `similar`(비슷한 성향) | 0.70 / 0.20 / 0.10 / 0 | styleSim 상위 30% |
| `domain`(같은 도메인) | 0.20 / 0.70 / 0.10 / 0 | domainCount≥1 (없으면 전체) |
| `balance`(밸런스 우선) | 0.20 / 0.20 / 0 / 0.60 | 최다부족성향 typeRatio > 20 (없으면 전체) |

- `styleSim`/`domainPct`/`prioPct`는 `teamProfile`(팀 평균)과 후보를 비교해 계산 — 3장과 동일 함수
  (`calcStyleSim`/`calcDomainMatch`/`calcPriorityMatch`) 재사용.
- `balanceImp` = `calcBalanceImpactScore(candidate, teamMembers)` — **팀원 개개인(teamMembers)** 기준으로
  계산되며, `teamProfile`이 아니라 실제 `teamMembers` 배열을 사용합니다(5장 참고).

### 4-3. AI 추천 탭의 특수 재계산 (`buildTeamSuppRecs()` — `SupplementResult.jsx` 765~789행)

`SupplementResult.jsx`는 `ai` 탭에서 공용 엔진의 결과를 받아온 뒤 점수를 한 번 더 명시적으로
재계산합니다(가중치 자체는 동일 — `styleSim×0.40 + domainPct×0.30 + prioPct×0.20 + balanceImp×0.10`).
이는 리스트에 표시되는 순위가 항상 점수 순서와 정확히 일치하도록(부족 성향 여부로 순서를 뒤집는 로직을
쓰지 않도록) 보장하기 위한 코드이며, 실질적으로 공용 엔진의 계산식과 동일합니다.
(과거에는 부족 성향 보유 후보를 강제로 최상단에 올리는 재정렬 로직이 있었으나, 현재는 제거되어
점수 순서와 화면 순서가 항상 일치합니다.)

### 4-4. Team Balance 계산과의 관계

- 화면 상단 Hero의 Team Balance Score는 **teamMembers만**으로 계산합니다(`calcTeamBalanceScore(teamMembers)`,
  보충 예정 인원은 반영 안 함).
- "부족 성향" 추천 섹션(④)의 `lackingFinal`은 `finalN = teamMembers.length + want`(보충 후 최종 인원)
  기준으로 `calcLackingTypes(teamMembers, finalN)`를 계산합니다. 즉 **현재 점수는 현재 인원 기준**,
  **부족 성향 판단은 보충 후 최종 인원 기준**으로 서로 다른 분모를 사용합니다(주석에 명시된 설계
  원칙: "② 팀원 보충 = 최종 팀원 수 기준, ③ 팀 밸런스 = 현재 팀원 수 기준").

### 4-5. 후보 필터링 공통 규칙

`candidates = allForSection.filter(m => !selectedIds.has(m.id))` — 이미 선택된 `teamMembers`를
제외한 같은 그룹의 전체 멤버가 후보 pool입니다. 탭별 추가 필터링은 4-2절 표 참고.

---

## 5. Team Balance Score (`src/utils/balanceScoring.js`)

### 5-1. 기본 공식

```
actualRatio = normalizeRatios(sumRatios(teamMembers))   // 팀 typeRatio 합산 후 비율화(합=1.0)
idealRatio  = calcIdealRatio(n) = { A:0.25, B:0.25, C:0.25, D:0.25 }   // 팀 규모와 무관하게 항상 균등
MAD         = Σ |actualRatio_k − idealRatio_k|   (k = A,B,C,D)
MAD_MAX     = calcMADMax() = 1.5   // 한 성향 100%·나머지 0%일 때의 최대 편차: 0.75+0.25×3
typeBalance = round(max(0, 1 − MAD/1.5) × 40)     // 40점 만점
```

- `sumRatios(teamMembers)`: 팀원 전체의 `typeRatio` 4개 값을 단순 합산(개인 typeRatio 자체가
  이미 0~100 스케일이므로, 인원수가 늘어날수록 합계도 커짐 — `normalizeRatios`에서 합계로 나눠 정규화).
- 팀원 전원의 `typeRatio` 합이 0인 예외 상황(전원 미검사)에는 `calcTeamDistribution`
  (dominantType 카운트)로 fallback합니다.

### 5-2. 4항목 분해 (`calcTeamBalanceScoreBreakdown(teamMembers)`)

| 항목 | 만점 | 계산식 |
|---|---|---|
| ① 성향 균형도 typeBalance | 40 | `round(max(0, 1-MAD/1.5) × 40)` — 위 5-1 공식 |
| ② 역할 다양성 roleDiversity | 30 | `activeTypes = actual[k] > 0.05인 성향 개수`(0~4); `round(activeTypes/4 × 30)` |
| ③ 협업 스타일 collabStyle | 20 | `maxRatio = max(actual 4개 값)`; `round(max(0,(1-maxRatio)×20×4/3))`, 최종 `min(20, ...)` — 한 성향에 쏠릴수록(maxRatio↑) 감점, 25%로 고르게 분산되어 있으면 만점 |
| ④ 도메인 적합도 domainFit | 10 | `avgDomains = 팀원 평균 domains.length`; `round(min(10, avgDomains/3×10))` — 팀원 평균 관심 도메인 3개 이상이면 만점 |

`total = typeBalance + roleDiversity + collabStyle + domainFit` (0~100, `min(100, total)` 가드).
`calcTeamBalanceScore(teamMembers)`는 이 `breakdown.total`을 그대로 반환하는 얇은 wrapper이며,
**Hero 대형 점수와 4항목 합산 점수가 항상 정확히 일치**하도록 이렇게 설계되어 있습니다.

### 5-3. 부족 성향 계산 (`calcLackingTypes(teamMembers, finalN)`)

```
deficit_k = idealRatio_k(=0.25) − actualRatio_k
정렬: deficit 내림차순
반환: deficit >= 5%p(DEFICIT_THRESHOLD=0.05)인 성향만, 없으면 빈 배열([]  → "이미 균형 잡힌 팀")
```

- `finalN` 인자는 실제 계산식에는 관여하지 않습니다(이상 비율이 항상 25% 고정이므로) — 다만
  호출부에서 "몇 명 기준으로 부족분을 판단할지" 의도를 남기기 위해 유지되는 파라미터입니다.
- 반환값은 부족한 정도가 큰 순서의 key 배열(예: `['B','C']`)이며, `[0]`이 "가장 부족한 성향".

### 5-4. 팀 밸런스 개선 효과 (`calcBalanceImpactScore(candidate, teamMembers)`)

```
if (teamMembers.length === 0) return 50   // 팀이 비어 있으면 항상 50(중립값) — 2-4절 Persona 궁합 계산에서 의도적으로 활용됨
before = calcTeamBalanceScore(teamMembers)
after  = calcTeamBalanceScore([...teamMembers, candidate])
gain   = after − before                     // −100~100
return clamp(round(50 + gain×0.5), 0, 100)  // gain=0→50, gain=100→100, gain=-100→0
```

### 5-5. 예상 개선 점수 (`calcExpectedScore(currentMembers, want)`)

부족 성향 상위 `want`명을 가상으로(`typeRatio`에 해당 성향 100% 부여) 추가한 뒤 다시
`calcTeamBalanceScore`로 계산하고, `max(현재 점수, 가상 점수)`를 취해 **절대 현재보다 낮아지지
않도록** 가드합니다. 추가로 "인원당 최대 15점 상승"(`want × 15`) 상한 가드가 있습니다.

### 5-6. 등급 레이블 (`getTeamScoreLabel(score)`)

```
90+           S · 완벽에 가까운 밸런스 (#10B981)
75~89         A · 균형 잡힌 팀        (#4F6EF7)
55~74         B · 보완이 필요한 팀    (#F59E0B)
0~54          C · 성향 불균형 주의    (#EF4444)
```

---

## 6. 추천 이유 생성

추천 이유는 **점수 계산과 완전히 분리된 후처리 텍스트 생성 로직**입니다 — 이유 문구의
유무나 내용이 점수/정렬에 영향을 주지 않습니다.

### 6-1. 팀원 보충 — `buildSupplementAISummary(candidate, teamMembers, tab, score, breakdown)`

`buildTabRecommendations` 내부에서 후보마다 자동 호출되어 `rec.aiSummary` 문자열로 저장됩니다.
동작 방식(중요도 = 실제 채점 기여도 기반 동적 정렬):

1. 아래 6가지 후보 문구를 각각 "발생 조건"이 참일 때만 `items` 배열에 `{value, text}`로 push:
   - **협업 스타일 유사도**: `styleSim>0`이면 무조건 추가. `value = contributions.style`(=styleSim×해당 탭 가중치)
   - **관심 도메인 일치**: `commonDomains.length`가 1/2/3+ 개일 때 각각 다른 문구. `value = contributions.domain`
   - **협업 우선순위**: `prioMatch`(완전 일치)면 `withI()`로 조사 자동 선택한 문구, 아니면 `prioRate>=50`(유사)일 때만 문구 추가. `value = contributions.priority`
   - **팀 밸런스 개선**: `balanceGain>0`이면 추가. `value = contributions.balance + balanceGain`
   - **부족 성향 보완**: `lacksType && candidateLacksStrong`(후보의 해당 성향 비율이 30% 초과)이면 추가.
     `value = 35 + pct×0.3` — 다른 항목과 무관하게 항상 우선순위를 높게 주는 고정 가중치(탭 가중치를 타지 않음).
   - **역할 다양성 증가**: 후보 합류 전후 `roleDiversity`가 실제로 증가하면 추가. `value=15`(고정).
2. `items`를 `value` 내림차순 정렬 후 상위 4개만 골라 `.text`를 `' + '`로 join.
3. `items`가 하나도 없으면 `score>=65`일 때/아닐 때 각각 다른 fallback 문구 반환.

**핵심 설계 의도**: `value`가 "탭 가중치가 이미 반영된 실제 raw×weight 기여도"이기 때문에, 같은
후보라도 탭이 달라지면(예: `similar` vs `balance`) 가중치가 다르므로 이유 문구의 **등장 순서 자체가
달라집니다**. 따라서 고정된 우선순위 템플릿이 아니라 "이 후보의 이 탭에서 실제로 점수에 가장 크게
기여한 요소부터" 보여주는 방식입니다.

이 문자열은 `SupplementResult.jsx`의 `MatchDetailSheet`에서 `rec.aiSummary.split(' + ')`로 다시
쪼개져 체크리스트(✓) 형태로 렌더링됩니다. **리스트 카드에는 더 이상 표시되지 않고, 상세
Bottom Sheet에서만 노출됩니다** (list=빠른 비교, detail=추천 이유라는 역할 분리).

### 6-2. 나와 맞는 팀원 찾기 — `DetailSheet`의 `aiReasons` (`FindTeammate.jsx` 291~318행)

동일한 사상을 개인 매칭 화면에 맞게 로컬로 재구현한 버전입니다. `ALL_ITEMS`(성향 유사도/관심
도메인/팀 선호 스타일/Persona 궁합 또는 팀 밸런스 기여, 4개 항목)를 순회하며 각 항목의 실제
발생 조건(rawStyle≥70/≥50, commonDomains 개수, prioMatch, isPersonaMatch, balance raw≥60)을
만족하는 것만 `{value: item.score, text}`로 골라 `value` 내림차순 정렬 → 최대 4개 표시.
`aiReasons.length < 2`이면 "종합적인 매칭 점수가 높습니다." 고정 문구를 보강합니다.

### 6-3. 사용되지 않는 레거시 이유 생성 함수 (참고)

- `buildSupplementCardReasons(candidate, teamMembers, tab, me)` — 탭별 고정 순서 템플릿 방식의
  구버전 이유 생성 함수. `buildTabRecommendations`에서 여전히 호출되어 `rec.reasons` 필드에
  저장되지만, **`SupplementResult.jsx`/`FindTeammate.jsx` 어디에서도 `rec.reasons`를 화면에
  렌더링하지 않습니다** — 계산은 되지만 표시되지 않는 dead data입니다.

---

## 7. AI 분석 문장

TeamFit에는 화면별로 서로 다른 3벌의 AI 분석 문장 생성 로직이 있습니다.

### 7-1. `BalanceResult.jsx` — 팀 협업 밸런스 리포트 (인라인 생성, 함수 분리 없음)

`aiLines` 배열(⑤ AI 종합 분석 섹션)은 아래 4가지를 항상 이 순서로 생성합니다:

1. **성향 강점** — 팀에서 비율이 가장 높은 성향(`mostKey`)과 그 %, `withI()`로 조사를 자동 선택한
   강점 라벨(`STRENGTH_LABEL`) 문장. 조건 없이 항상 표시.
2. **역할 다양성** — `bd.roleDiversity < 22`(30점 만점 중 22 미만)면 "편중된 구성", 아니면 "양호하게 확보".
3. **부족 성향** — `leastKey`(계산된 부족 성향)가 있으면만 표시. `WEAK_LABEL` 기반 문장.
4. **도메인 분석** — `isDomainConcentrated`(상위 도메인 점유율 50%↑)/`isDomainDiverse`(집중 아니고
   도메인 종류 4개 이상 & 상위 점유율 40% 미만)/그 외 3갈래로 서로 다른 문구 생성.
   (이 분류 기준은 단순 "도메인 종류 개수"가 아니라 **실제 쏠림 정도(topDomainShare)** 를 우선
   기준으로 삼도록 설계되어 있습니다 — 종류가 많아도 특정 도메인에 절반 이상 몰려 있으면
   "다양함"이 아니라 "집중" 문구가 나옵니다.)

`risks`(⑥ 협업 리스크)는 조건이 하나도 안 맞으면 "큰 협업 리스크는 발견되지 않았습니다" fallback:
- `lackingKeys.length > 0`이면 부족 성향들의 역할 공백 문구
- `bd.collabStyle < 12`(20점 만점 중)면 협업 스타일 편중 문구
- `isDomainDiverse`면 "주제 선정 합의가 길어질 수 있다" 문구

### 7-2. `SupplementResult.jsx` — AI 팀 분석 카드 (인라인 생성)

3단 구조로 고정되어 있습니다:
1. **현재 강점** — `actualRatio` 상위 2개 성향 배지 + 설명 문장(조건 없이 항상 표시).
2. **보완 필요** — `leastKey`가 있으면 `lackedSorted`(25% 미만인 성향들, 최대 3개) 배지 표시.
   2개 이상이면 "두 성향을 함께 보완" 문구, 1개면 `LACK_DESC[leastKey]` 개별 문구. 없으면
   "특별히 부족한 성향이 없습니다".
3. **팀 진단** — 탭과 무관한 현재 상태 요약. `leastKey`가 있으면 "'밸런스 우선' 탭에서 확인할
   수 있어요"로 유도하되, **AI 추천 탭이 항상 부족 성향을 채워준다고 단정하는 문구는 쓰지 않도록
   의도적으로 수정되어 있습니다**(코드 주석: "AI 추천 탭 기본값과 모순되는 것을 방지").

### 7-3. `balanceScoring.js`의 범용 텍스트 생성 함수 (일부는 현재 미사용)

- **`analyzeTeamGap(teamMembers)`** — `lacking`/`analysis`/`suggestion`을 반환하는 범용 팀 갭 분석
  함수. `buildSuggestion(leastType)`으로 성향별 보충 제안 문구 4종을 갖고 있습니다.
  **주의**: 이 함수 209번째 줄 부근에 `actual` 변수가 선언 이전에 참조되는 순서 문제(`_sorted` 계산에서
  `actual`을 쓰지만 `actual`은 그 다음 줄에서 선언됨)가 있어, 실제로 호출되면 런타임 에러가 발생할
  수 있는 코드입니다. 전체 프로젝트에서 이 함수를 import하는 곳이 없어(dead code) 문제가 드러나지
  않고 있습니다.
- **`generateTeamAnalysis(members, distribution, balanceScore)`** — `strengths[]`/`weaknesses[]`/
  `recommendation`/`summary`를 반환하는 또 다른 범용 분석 함수. 역시 현재 라우팅된 화면 어디에서도
  import되지 않는 dead code입니다(레거시 `TeamBalanceResult.jsx` 전용으로 작성된 것으로 추정).
- **`generateSupplementAIText(teamMembers, balanceScore, finalN)`** — 4항목(typeBalance/roleDiversity/
  collabStyle/domainFit) 점수를 문장으로 풀어 쓰는 함수. 역시 `SupplementResult.jsx`에서 import되지
  않아 현재 화면에는 나타나지 않습니다(대신 7-2절의 인라인 로직이 사용됨).

---

## 8. 데이터 구조

### 8-1. User (개인 프로필)

두 곳에 흩어져 있으며 형태가 약간 다릅니다.

**`useUserStore.js`의 클라이언트 상태** (현재 로그인한 사용자):
```js
{
  name: string,
  domains: string[],           // OnboardingDomain에서 선택한 라벨 배열
  priority: string,            // OnboardingPriority의 TEAM_STYLES 중 하나의 id (예: '빠른 실행력')
  answers: [{questionId, selectedKey, type}],   // 검사 중간 상태, finalizeTest 후 rawAnswerVector로 변환
  rawAnswerVector: string[],   // ['A','C','B',...] 10개, key 시퀀스
  typeRatio: { A:number, B:number, C:number, D:number },  // 합≈100
  dominantType: 'A'|'B'|'C'|'D',
  recommendations: [],         // 현재 어디서도 채워쓰지 않는 미사용 필드
}
```

**Firestore `profiles/{name}`** (전역 Persona 프로필 — `groupDB.js`의 `saveUserProfileToDB`):
```js
{
  dominantType, typeRatio, rawAnswerVector, domains, priority,
  completedAt: timestamp,
  myGroups: [{ groupCode, groupName, lastAccessAt }],   // recordGroupAccess()가 관리
}
```

**Firestore `groups/{code}/members/{name}`** (그룹별 스냅샷):
```js
{
  id: `${code}_${name}`, name, groupCode,
  profile: {
    typeKey: dominantType,
    scores: { 추진:number, 소통:number, 탐구:number, 실행:number },  // typeRatio를 한글 키로 저장
    domains, priority, rawAnswerVector, completedAt,
  },
}
```

**추천/계산 엔진이 실제로 사용하는 "scoring 포맷"** (여러 페이지에서 매번 인라인 변환):
```js
{
  id, name, groupCode, projectCode,
  dominantType: p.typeKey,
  typeRatio: { A:sc.추진, B:sc.소통, C:sc.탐구, D:sc.실행 },   // 한글 scores → A/B/C/D 재매핑
  rawAnswerVector: p.rawAnswerVector,
  domains: p.domains,
  priority: p.priority,
}
```
이 변환은 `useGroupStore.js`의 `memberToScoringFormat()`(export됨, 실제로는 각 페이지가
자체적으로 `.map()`을 인라인 작성해 중복 구현하는 경우가 대부분)와 동일한 필드 매핑을 따릅니다.

### 8-2. Group

**Firestore `groups/{code}`** (메타):
```js
{ groupName: string, createdAt: timestamp }
```

**Firestore `groups/{code}/domains/{domainId}`** (그룹별 커스텀 도메인):
```js
{ id: `custom_${code}_${timestamp}`, label, emoji:'🏷️', isCustom:true }
```
`useGroupStore.js`의 `DEFAULT_DOMAINS`(15개 고정 도메인: AI/SaaS/이커머스/... )와
그룹별 `customDomains`를 합쳐 `getGroupDomains()`가 반환합니다.

### 8-3. Persona

`src/utils/persona.js`에 하드코딩된 정적 데이터(11종) — 사용자별로 저장되지 않고, 매번
`typeRatio`로부터 `buildPersona()`가 실시간 재계산합니다:
```js
{ key: 'A'|'AB'|...|'BALANCED', type: 'single'|'dual'|'balanced',
  name, en, emoji, desc, strengths: string[] }
```

### 8-4. typeRatio

`{ A:number, B:number, C:number, D:number }`, 각 값은 0~100, 합계 ≈ 100(개인 단위) 또는
평균/합산 방식에 따라 달라짐(아래 참고). 이 프로젝트에서 **가장 많이 재사용되는 핵심 자료구조**이며,
용도에 따라 세 가지 다른 방식으로 등장합니다:
- **개인 typeRatio**: `finalizeTest()`에서 계산, 합계 ≈ 100.
- **팀 합산(sumRatios)**: 개인 typeRatio 값을 그대로 더한 것 — 합계는 인원수×100에 가까움
  (`calcTeamBalanceScoreBreakdown` 등에서 `normalizeRatios`로 다시 0~1 스케일 비율로 정규화해서 사용).
- **팀 평균(makeTeamProfile의 avgR)**: 합산 후 인원수로 나눈 것 — 합계는 다시 ≈100.

### 8-5. domains

`string[]` — `OnboardingDomain.jsx`에서 다중 선택된 라벨 문자열 배열(예: `['AI','헬스케어']`).
비교 시 항상 `normDomain()`(소문자화 + 공백 제거)을 거쳐 대소문자/공백 차이를 무시합니다.
사용처: `calcDomainMatch`, `BalanceResult.jsx`의 도메인 분포 집계, `makeTeamProfile`의 합집합 계산.

### 8-6. priority

`string` — `OnboardingPriority.jsx`의 `TEAM_STYLES` 5종 중 하나의 `id` 값 그대로 저장
(`'빠른 실행력'`/`'체계적인 진행'`/`'다양한 아이디어'`/`'원활한 소통'`/`'높은 결과물 퀄리티'`).
각 값은 `styleAffinity: ['A','D']`처럼 2개 성향 key와 연결되어 있으며, 이 매핑은
`balanceScoring.js`의 `STYLE_AFFINITY` 상수로 그대로 복제되어 있습니다(두 파일이 동일한
값을 독립적으로 하드코딩 — 단일 소스가 아님, 8-7절 참고).

### 8-7. 코드 중복 주의 사항 (설계 문서 목적상 명시)

- `OnboardingPriority.jsx`의 `TEAM_STYLES[].styleAffinity`와 `balanceScoring.js`의
  `STYLE_AFFINITY` 상수는 값이 동일하지만 서로 다른 파일에 독립적으로 정의되어 있어,
  한쪽만 수정하면 불일치가 발생할 수 있는 구조입니다.
- `describeMyPersona()` 함수는 `PersonaResultView.jsx`와 `GroupHome.jsx`(InlineMyProfile 내부)에
  완전히 동일한 내용으로 각각 정의되어 있습니다(공용 유틸로 분리되어 있지 않음).
- Persona 설명 Bottom Sheet(`PersonaInfoSheet`/`MatchedPersonaInfoSheet`)도 `PersonaResultView.jsx`와
  `GroupHome.jsx`에 각각 독립적으로(문구까지 거의 동일하게) 구현되어 있습니다.

---

## 9. 서비스 전체 계산식 (누락 없이 정리)

### 9-1. 원점수 계산 함수 (모두 `balanceScoring.js`)

```
calcTypeRatioCosSim(ratioA, ratioB)
  dot = Σ a_k*b_k,  |a|=√Σa_k²,  |b|=√Σb_k²   (k=A,B,C,D)
  cos = dot / (|a|·|b|)                        (0 벡터면 0 반환)
  return round( ((cos+1)/2) × 100 )            // -1~1 → 0~100 정규화

calcAnswerVecSim(vecA, vecB)
  selectedKey 'A'|'B'|'C'|'D' → 1|2|3|4 숫자 변환 후 위와 동일한 코사인 유사도 공식
  (두 벡터 길이가 다르면 짧은 쪽 길이만큼만 비교)

calcStyleSim(candidate, me)
  me.typeRatio 합 > 0 AND candidate.typeRatio 합 > 0  → calcTypeRatioCosSim 사용
  둘 중 하나라도 typeRatio 합이 0                      → calcAnswerVecSim(rawAnswerVector) fallback

calcDomainMatch(domainsA, domainsB)
  common = domainsA 중 domainsB에 있는 개수 (normDomain 정규화 비교)
  return min(100, round(common/3 × 100))     // 3개 이상이면 100 (그 이상은 cap)

calcPriorityMatch(prioA, prioB)
  같음        → 100
  STYLE_AFFINITY 교집합 존재 → 50
  그 외        → 0

calcBalanceImpactScore(candidate, teamMembers)
  teamMembers 비어있음 → 50 (고정)
  gain = calcTeamBalanceScore([...teamMembers,candidate]) - calcTeamBalanceScore(teamMembers)
  return clamp(round(50 + gain×0.5), 0, 100)
```

### 9-2. Team Balance Score 관련 (5장 요약 재수록)

```
normalizeRatios(sum) = { k: sum[k] / Σsum }             // 합=1.0로 정규화, 전부 0이면 25%씩
calcIdealRatio(n)     = { A:0.25, B:0.25, C:0.25, D:0.25 }  // 항상 고정
calcMADMax()          = 1.5                                // 항상 고정
MAD                   = Σ|actual_k - ideal_k|
typeBalance(40점)     = round(max(0, 1-MAD/1.5) × 40)
roleDiversity(30점)   = round( (actual_k>0.05인 성향 수 / 4) × 30 )
collabStyle(20점)     = round(min(20, max(0,(1-max(actual))×20×4/3)))
domainFit(10점)       = round(min(10, (팀평균 domains.length/3)×10))
calcTeamBalanceScore  = typeBalance+roleDiversity+collabStyle+domainFit  (0~100)

calcLackingTypes(team, finalN)
  deficit_k = 0.25 - actual_k,  내림차순 정렬
  return deficit ≥ 0.05(반올림 소수3자리 비교)인 key만

calcExpectedScore(current, want)
  lacking = calcLackingTypes(current, current.length+want).slice(0, min(want,4))
  virtual = current + [want명의 가상 인원, typeRatio={부족성향:100}]
  raw     = max(calcTeamBalanceScore(current), calcTeamBalanceScore(virtual))
  return min(raw, calcTeamBalanceScore(current)+want×15, 100)
```

### 9-3. 추천 종합 점수 (탭별 가중치 — `buildTabRecommendations`)

```
ai(개인)      = styleSim×0.40 + domainPct×0.30 + prioPct×0.20 + balanceImp×0.10   ※공용 엔진 원본
ai(개인·실사용) = styleSim×0.40 + domainPct×0.30 + prioPct×0.20 + personaCompat×0.10  ※FindTeammate 재계산판
ai(팀)        = styleSim×0.40 + domainPct×0.30 + prioPct×0.20 + balanceImp×0.10   ※SupplementResult 재계산판(공용식과 동일)
similar       = styleSim×0.70 + domainPct×0.20 + prioPct×0.10
domain        = domainPct×0.70 + styleSim×0.20 + prioPct×0.10
balance       = balanceImp×0.60 + styleSim×0.20 + domainPct×0.20

personaCompat(0 or 100) = (후보 Persona ∈ 나의 matchedPersonas top2) ? 100 : 0
contributions.{style,domain,priority,balance} = round(원점수 × 해당 가중치)   // 추천 이유 근거값(6장)으로 재사용
```

### 9-4. 표시 전용 정밀 점수 (정렬에는 미사용)

```
preciseScore(bd) = styleSim×w.style + domainPct×w.domain + prioPct×w.priority + balanceOrPersonaCompat×w.balance
   // buildTabRecommendations 내부의 최종 Math.round() "이전" 값을 그대로 재현 — 소수 1자리 표시용
   // FindTeammate.jsx / SupplementResult.jsx 양쪽에 각각 로컬 함수로 구현(공용 유틸 아님)
```

### 9-5. 성향 검사 원점수

```
counts[type]++  (10문항, type 기준 카운트)
typeRatio_k = round(counts_k / 10 × 100)
dominantType = argmax(counts)
```

### 9-6. Persona 판정 임계값 (2-3절 재수록)

```
Balanced:  entries≥3 개 성향>0  AND  (max-min) < 15%p
Dual:      |1위-2위| ≤ 5%p
Dominant:  1위 ≥ 40%  AND  (1위-2위) ≥ 10%p
Default:   1위 기준 단일
```

---

## 10. 구현 근거 (코드에서 확인 가능한 "왜 이렇게 만들었는가")

- **`dominantType` 대신 항상 `typeRatio` 전체를 쓰는 이유** — `balanceScoring.js` 최상단 주석에
  명시: 대표 성향 1개만 보면 "약하게 걸친" 성향 정보가 소실되어 팀 밸런스나 유사도 계산이
  왜곡되기 때문. `dominantType`은 UI 배지·아바타 색상 등 **표시 전용**으로만 남겨둠.

- **Ideal Ratio를 팀 인원수와 무관하게 항상 25%로 고정한 이유** — 코드 주석(`calcIdealRatio` 상단):
  과거에는 인원수별로 이상적인 인원 배분(`calcIdealDistribution`, 예: 5명이면 A가 2명)을 만들어
  특정 성향을 더 요구하는 방식이었으나, "왜 5명 팀은 추진형이 더 필요한가"라는 근거가 약해
  성향과 무관하게 **항상 4개 성향 25%씩이 이상적**이라는 단순하고 설명 가능한 기준으로 통일함.

- **팀원 보충(②)과 팀 밸런스(③)에서 분모를 다르게 쓰는 이유** — 주석에 명시된 원칙: 팀원 보충은
  "보충 후 최종 팀"을 기준으로 부족 성향을 판단해야 실제로 채용할 사람을 추천하는 의미가 있고,
  팀 밸런스 분석은 "지금 이 순간의 팀 상태"를 그대로 보여줘야 하므로 현재 인원 기준을 유지함.

- **`calcBalanceImpactScore`가 빈 팀에서 50을 반환하는 이유** — 팀이 아예 없는 상황(개인 매칭,
  Persona 궁합 계산)에서 "밸런스 개선 효과"라는 개념 자체가 성립하지 않으므로, 상수 50(중립값)을
  반환해 이 항목이 다른 실질적 항목(성향/도메인/우선순위)에 의해서만 승부가 나도록 설계함
  — 이 특성이 2-4절의 "잘 맞는 Persona" 계산에서 의도적으로 재활용됨.

- **AI 추천 카드에서 리스트와 상세를 분리한 이유** — 코드 주석(`FindTeammate.jsx`/`SupplementResult.jsx`):
  "list = 빠른 비교, detail = 왜 추천되었는지"로 역할을 분리해, 리스트에서는 한눈에 비교 가능한
  핵심 지표(매칭 적합도)만 보여주고, 근거가 되는 세부 설명은 사용자가 실제로 궁금해할 때(클릭 시)만
  노출되도록 정보 위계를 조정함.

- **추천 이유를 고정 순서 템플릿에서 기여도 기반 동적 정렬로 바꾼 이유** — 기존에는 탭마다
  "도메인 먼저, 그다음 밸런스..." 식 고정 순서였는데, 실제로 그 후보의 점수를 가장 크게 끌어올린
  요소가 아닌 게 먼저 표시되는 모순이 있었음. `contributions`(raw×weight)를 그대로 재사용해
  "이 후보에게 실제로 가장 크게 기여한 요소부터" 보여주도록 수정되어, 후보마다 서로 다른 조합이
  나오게 됨 (`buildSupplementAISummary`, `FindTeammate.jsx`의 `aiReasons`).

- **표시용 소수점 점수(`preciseScore`/`scoreExact`)를 도입했지만 정렬에는 쓰지 않는 이유** —
  두 후보가 정수 반올림 때문에 "79% vs 79%"처럼 동점으로 보이는 경우 사용자가 "왜 순위가
  다른가"를 오해할 수 있어, 반올림 이전의 실제 값을 소수 1자리까지만 노출해 우열을 시각적으로
  구분되게 하되, **추천 알고리즘/정렬 로직 자체는 절대 변경하지 않는다**는 제약(사용자 명시적 요청)에
  따라 `.sort()` 비교에는 여전히 기존 정수 `rec.score`만 사용함.

- **0점 기여 항목을 숨기지 않고 회색으로만 표시하는 이유** — 산출 근거 표(`ALL_ITEMS`)에서 기여도가
  0인 항목을 삭제하면 "왜 이 항목이 없지?"라는 의문이 생길 수 있어, 항목 자체는 유지하되 회색
  처리 + "일치하지 않음" 문구로 "계산은 됐지만 기여가 없었다"는 것을 명확히 전달하도록 설계함.

- **AI 추천 탭 텍스트에서 "부족 성향 보완"을 단정하지 않는 이유** — AI 추천 탭은 성향(40%) +
  도메인(30%) + 우선순위(20%) + 밸런스(10%) 종합 점수이므로 부족 성향을 채워주지 않는 후보가
  1위가 될 수도 있음. 그런데 팀 진단 문구가 "AI 추천 탭에서 확인하세요"라고 단정하면 실제 결과와
  모순될 수 있어, 부족 성향 보완을 확정적으로 약속하는 문구는 실제로 그 기준(밸런스 60%)을 쓰는
  '밸런스 우선' 탭에만 연결되도록 문구를 분리함.

- **Persona가 매번 재계산되고 별도로 저장되지 않는 이유** — `typeRatio`만 있으면 언제든
  `buildPersona()`로 동일한 결과를 재현할 수 있어, Persona 자체를 DB에 별도 필드로 저장하지 않고
  단일 소스(`typeRatio`)로부터 파생시키는 방식을 택함 — 재검사 시 typeRatio만 갱신하면 Persona도
  자동으로 최신 상태를 반영.

---

*(문서 끝 — 위 내용은 `src/` 하위 실제 코드를 근거로 작성되었으며, 신규 기능 추가나 코드 변경은
포함되어 있지 않습니다.)*
