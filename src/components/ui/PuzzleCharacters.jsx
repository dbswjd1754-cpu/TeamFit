/**
 * TeamFit 퍼즐 캐릭터 SVG 컴포넌트
 * 모든 화면에서 브랜드 일관성을 유지하기 위해 공통 사용
 *
 * 색상 기준 (로고 이미지 기반)
 *   민트 퍼즐: #7DCFB6 (왼쪽, 소통/팀원 보충)
 *   블루 퍼즐: #93C5FD (오른쪽, 추진/팀 만들기)
 *   눈/입:    민트=#2D6A5A, 블루=#1E3A8A
 *   볼터치:   #F9A8D4
 *   하트:     #FB7185
 */

/* ── 풀 로고 (두 퍼즐 + 하트) ──────────────────── */
export function TeamFitLogo({ size = 140 }) {
  const s = size / 140;
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 왼쪽: 민트 퍼즐 */}
      <rect x="8" y="22" width="58" height="58" rx="12" fill="#7DCFB6"/>
      <ellipse cx="37" cy="18" rx="10" ry="9" fill="#7DCFB6"/>
      <ellipse cx="66" cy="51" rx="9" ry="10" fill="#F0FDF8"/>
      <ellipse cx="37" cy="80" rx="10" ry="9" fill="#7DCFB6"/>
      <rect x="14" y="28" width="46" height="46" rx="10" fill="#8ED8C4" opacity="0.4"/>
      <ellipse cx="27" cy="46" rx="4" ry="4.5" fill="#2D6A5A"/>
      <ellipse cx="25.5" cy="44.5" rx="1.2" ry="1.2" fill="white" opacity="0.85"/>
      <ellipse cx="47" cy="46" rx="4" ry="4.5" fill="#2D6A5A"/>
      <ellipse cx="45.5" cy="44.5" rx="1.2" ry="1.2" fill="white" opacity="0.85"/>
      <path d="M30 57 Q37 63 44 57" stroke="#2D6A5A" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <ellipse cx="22" cy="55" rx="4" ry="2.5" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="52" cy="55" rx="4" ry="2.5" fill="#F9A8D4" opacity="0.6"/>

      {/* 오른쪽: 블루 퍼즐 */}
      <rect x="74" y="22" width="58" height="58" rx="12" fill="#93C5FD"/>
      <ellipse cx="74" cy="51" rx="9" ry="10" fill="#93C5FD"/>
      <ellipse cx="103" cy="22" rx="10" ry="9" fill="#EFF6FF"/>
      <ellipse cx="103" cy="80" rx="10" ry="9" fill="#93C5FD"/>
      <rect x="80" y="28" width="46" height="46" rx="10" fill="#BAD9FC" opacity="0.4"/>
      <ellipse cx="93" cy="46" rx="4" ry="4.5" fill="#1E3A8A"/>
      <ellipse cx="91.5" cy="44.5" rx="1.2" ry="1.2" fill="white" opacity="0.85"/>
      <ellipse cx="113" cy="46" rx="4" ry="4.5" fill="#1E3A8A"/>
      <ellipse cx="111.5" cy="44.5" rx="1.2" ry="1.2" fill="white" opacity="0.85"/>
      <path d="M96 57 Q103 64 110 57" stroke="#1E3A8A" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      <ellipse cx="88" cy="55" rx="4" ry="2.5" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="118" cy="55" rx="4" ry="2.5" fill="#F9A8D4" opacity="0.6"/>

      {/* 중앙 하트 */}
      <path d="M69 16 C69 13.5 71 11 73.5 11 C76 11 77.5 13 77.5 13 C77.5 13 79 11 81.5 11 C84 11 86 13.5 86 16 C86 20 77.5 26 77.5 26 C77.5 26 69 20 69 16Z" fill="#FB7185"/>

      {/* 반짝이 */}
      <line x1="14" y1="8" x2="14" y2="14" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"/>
      <line x1="11" y1="11" x2="17" y2="11" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"/>
      <line x1="126" y1="10" x2="126" y2="16" stroke="#7DCFB6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="123" y1="13" x2="129" y2="13" stroke="#7DCFB6" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/* ── 블루 퍼즐 단독 + 점선 빈자리 (팀 만들기 카드용) ── */
export function NewTeamPuzzle({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 점선 빈 퍼즐 자리 (왼쪽) */}
      <rect x="2" y="16" width="34" height="34" rx="8" fill="none" stroke="#CBD5E1" strokeWidth="1.8" strokeDasharray="4 3"/>
      <ellipse cx="19" cy="13" rx="6" ry="5" fill="none" stroke="#CBD5E1" strokeWidth="1.8" strokeDasharray="4 3"/>
      <ellipse cx="36" cy="33" rx="5" ry="6" fill="none" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="4 3"/>
      <ellipse cx="19" cy="50" rx="6" ry="5" fill="none" stroke="#CBD5E1" strokeWidth="1.8" strokeDasharray="4 3"/>
      {/* 물음표 */}
      <text x="19" y="37" textAnchor="middle" fontSize="13" fill="#CBD5E1" fontWeight="700">?</text>

      {/* 블루 퍼즐 (오른쪽) */}
      <rect x="40" y="16" width="36" height="36" rx="8" fill="#93C5FD"/>
      <ellipse cx="40" cy="34" rx="6" ry="7" fill="#93C5FD"/>
      <ellipse cx="58" cy="16" rx="7" ry="6" fill="#DBEAFE"/>
      <ellipse cx="58" cy="52" rx="7" ry="6" fill="#93C5FD"/>
      <rect x="45" y="21" width="28" height="28" rx="7" fill="#BAD9FC" opacity="0.45"/>
      {/* 눈 */}
      <ellipse cx="53" cy="32" rx="2.8" ry="3.2" fill="#1E3A8A"/>
      <ellipse cx="52" cy="31" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      <ellipse cx="65" cy="32" rx="2.8" ry="3.2" fill="#1E3A8A"/>
      <ellipse cx="64" cy="31" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      {/* 입 */}
      <path d="M55 39 Q59 43 63 39" stroke="#1E3A8A" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="49" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="67" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>
    </svg>
  );
}

/* ── 민트 퍼즐 단독 + 빈 자리 (팀원 보충 카드용) ── */
export function FillTeamPuzzle({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 민트 퍼즐 (왼쪽) */}
      <rect x="4" y="16" width="36" height="36" rx="8" fill="#7DCFB6"/>
      <ellipse cx="22" cy="13" rx="7" ry="6" fill="#7DCFB6"/>
      <ellipse cx="40" cy="34" rx="6" ry="7" fill="#ECFDF5"/>
      <ellipse cx="22" cy="52" rx="7" ry="6" fill="#7DCFB6"/>
      <rect x="9" y="21" width="28" height="28" rx="7" fill="#8ED8C4" opacity="0.45"/>
      {/* 눈 */}
      <ellipse cx="16" cy="32" rx="2.8" ry="3.2" fill="#2D6A5A"/>
      <ellipse cx="15" cy="31" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      <ellipse cx="28" cy="32" rx="2.8" ry="3.2" fill="#2D6A5A"/>
      <ellipse cx="27" cy="31" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      {/* 입 */}
      <path d="M18 39 Q22 43 26 39" stroke="#2D6A5A" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="11" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="33" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>

      {/* 빈 퍼즐 자리 (오른쪽, 맞물리는 모양) */}
      <rect x="44" y="16" width="32" height="36" rx="8" fill="none" stroke="#10B981" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.5"/>
      <ellipse cx="44" cy="34" rx="6" ry="7" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4"/>
      <ellipse cx="60" cy="16" rx="6" ry="5" fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4"/>
      <ellipse cx="60" cy="52" rx="6" ry="5" fill="none" stroke="#10B981" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.5"/>
      {/* + 아이콘 */}
      <line x1="60" y1="28" x2="60" y2="40" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" opacity="0.6"/>
      <line x1="54" y1="34" x2="66" y2="34" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

/* ── 작은 단일 블루 퍼즐 (온보딩용) ────────────── */
export function BluePuzzleSmall({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" rx="5" fill="#93C5FD"/>
      <ellipse cx="16" cy="2" rx="4" ry="3.5" fill="#93C5FD"/>
      <ellipse cx="30" cy="16" rx="3.5" ry="4" fill="#DBEAFE"/>
      <ellipse cx="16" cy="30" rx="4" ry="3.5" fill="#93C5FD"/>
      <ellipse cx="10" cy="14" rx="2" ry="2.3" fill="#1E3A8A"/>
      <ellipse cx="22" cy="14" rx="2" ry="2.3" fill="#1E3A8A"/>
      <path d="M12 19 Q16 22.5 20 19" stroke="#1E3A8A" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

/* ── 팀 밸런스 분석 아이콘
     민트 퍼즐(좌) + 블루 퍼즐(우) + 원형 차트 배지
     NewTeamPuzzle / FillTeamPuzzle과 동일한 디자인 언어
     viewBox 80×80, 구형 퍼즐 스타일 ── */
export function TeamBalancePuzzle({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">

      {/* ── 민트 퍼즐 (왼쪽) ── */}
      <rect x="2" y="16" width="34" height="34" rx="8" fill="#7DCFB6"/>
      {/* 위 돌기 */}
      <ellipse cx="19" cy="13" rx="6.5" ry="5.5" fill="#7DCFB6"/>
      {/* 오른쪽 홈 */}
      <ellipse cx="36" cy="33" rx="5" ry="6" fill="#ECFDF5"/>
      {/* 아래 돌기 */}
      <ellipse cx="19" cy="50" rx="6.5" ry="5.5" fill="#7DCFB6"/>
      {/* 하이라이트 */}
      <rect x="7" y="21" width="24" height="12" rx="6" fill="#8ED8C4" opacity="0.5"/>
      {/* 눈 L */}
      <ellipse cx="13" cy="32" rx="2.8" ry="3.2" fill="#2D6A5A"/>
      <ellipse cx="12.1" cy="31.1" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      {/* 눈 R */}
      <ellipse cx="25" cy="32" rx="2.8" ry="3.2" fill="#2D6A5A"/>
      <ellipse cx="24.1" cy="31.1" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      {/* 입 */}
      <path d="M15 39 Q19 43 23 39" stroke="#2D6A5A" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="9" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="29" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>

      {/* ── 블루 퍼즐 (오른쪽) ── */}
      <rect x="42" y="16" width="34" height="34" rx="8" fill="#93C5FD"/>
      {/* 위 홈 */}
      <ellipse cx="59" cy="13" rx="6.5" ry="5.5" fill="#DBEAFE"/>
      {/* 왼쪽 홈 (민트 홈에 맞물림) */}
      <ellipse cx="42" cy="33" rx="5" ry="6" fill="#DBEAFE"/>
      {/* 아래 홈 */}
      <ellipse cx="59" cy="50" rx="6.5" ry="5.5" fill="#DBEAFE"/>
      {/* 하이라이트 */}
      <rect x="47" y="21" width="24" height="12" rx="6" fill="#BAD9FC" opacity="0.5"/>
      {/* 눈 L */}
      <ellipse cx="53" cy="32" rx="2.8" ry="3.2" fill="#1E3A8A"/>
      <ellipse cx="52.1" cy="31.1" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      {/* 눈 R */}
      <ellipse cx="65" cy="32" rx="2.8" ry="3.2" fill="#1E3A8A"/>
      <ellipse cx="64.1" cy="31.1" rx="0.9" ry="0.9" fill="white" opacity="0.85"/>
      {/* 입 */}
      <path d="M55 39 Q59 43 63 39" stroke="#1E3A8A" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="49" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="69" cy="38" rx="2.8" ry="1.8" fill="#F9A8D4" opacity="0.6"/>

      {/* ── 원형 차트 배지 (우하단) "팀 분석" 상징 ── */}
      {/* 배지 흰 배경 + 테두리 */}
      <circle cx="62" cy="62" r="16" fill="white" stroke="#E0F0FF" strokeWidth="1.5"/>
      <circle cx="62" cy="62" r="12.5" fill="#F0F9FF"/>
      {/* 도넛 차트 — 4색 호: 민트30%, 블루25%, 보라25%, 앰버20% */}
      {/* r=8.5, circumference≈53.4 */}
      {/* 민트 (30% = 16.0) */}
      <circle cx="62" cy="62" r="8.5"
        fill="none" stroke="#7DCFB6" strokeWidth="4.5"
        strokeDasharray="16 37.4"
        strokeDashoffset="0"
        strokeLinecap="butt"/>
      {/* 블루 (25% = 13.4) */}
      <circle cx="62" cy="62" r="8.5"
        fill="none" stroke="#93C5FD" strokeWidth="4.5"
        strokeDasharray="13.4 40"
        strokeDashoffset="-16"
        strokeLinecap="butt"/>
      {/* 보라 (25% = 13.4) */}
      <circle cx="62" cy="62" r="8.5"
        fill="none" stroke="#C4B5FD" strokeWidth="4.5"
        strokeDasharray="13.4 40"
        strokeDashoffset="-29.4"
        strokeLinecap="butt"/>
      {/* 앰버 (20% = 10.7) */}
      <circle cx="62" cy="62" r="8.5"
        fill="none" stroke="#FCD34D" strokeWidth="4.5"
        strokeDasharray="10.7 42.7"
        strokeDashoffset="-42.8"
        strokeLinecap="butt"/>
      {/* 차트 중앙 점 */}
      <circle cx="62" cy="62" r="3.5" fill="white"/>
      <circle cx="62" cy="62" r="2" fill="#7DCFB6" opacity="0.7"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════
   추천 탭 전용 아이콘 (32×32 기준, size prop)
   TeamFit 퍼즐 캐릭터 스타일 통일
══════════════════════════════════════════════ */

/**
 * TabIconAI — AI 추천
 * 블루 퍼즐 + 반짝이(sparkle) 3개
 */
export function TabIconAI({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 퍼즐 몸통 */}
      <rect x="3" y="7" width="20" height="20" rx="5" fill="#93C5FD"/>
      {/* 위 돌기 */}
      <ellipse cx="13" cy="5.5" rx="4" ry="3.5" fill="#93C5FD"/>
      {/* 오른쪽 홈 */}
      <ellipse cx="23" cy="17" rx="3.5" ry="4" fill="#DBEAFE"/>
      {/* 아래 돌기 */}
      <ellipse cx="13" cy="28.5" rx="4" ry="3.5" fill="#93C5FD"/>
      {/* 하이라이트 */}
      <rect x="6" y="10" width="14" height="14" rx="4" fill="#BAD9FC" opacity="0.4"/>
      {/* 눈 */}
      <ellipse cx="10" cy="16" rx="1.8" ry="2" fill="#1E3A8A"/>
      <ellipse cx="9.4" cy="15.4" rx="0.6" ry="0.6" fill="white" opacity="0.85"/>
      <ellipse cx="16" cy="16" rx="1.8" ry="2" fill="#1E3A8A"/>
      <ellipse cx="15.4" cy="15.4" rx="0.6" ry="0.6" fill="white" opacity="0.85"/>
      {/* 미소 */}
      <path d="M11 20 Q13 22.5 15 20" stroke="#1E3A8A" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="7.5" cy="19" rx="1.8" ry="1.1" fill="#F9A8D4" opacity="0.6"/>
      <ellipse cx="18.5" cy="19" rx="1.8" ry="1.1" fill="#F9A8D4" opacity="0.6"/>
      {/* ★ 반짝이 3개 */}
      {/* 큰 반짝이 */}
      <path d="M26 5 L26.7 7.3 L29 8 L26.7 8.7 L26 11 L25.3 8.7 L23 8 L25.3 7.3 Z"
        fill="#FCD34D" opacity="0.95"/>
      {/* 작은 반짝이 1 */}
      <path d="M29 13 L29.4 14.2 L30.6 14.6 L29.4 15 L29 16.2 L28.6 15 L27.4 14.6 L28.6 14.2 Z"
        fill="#FCD34D" opacity="0.8"/>
      {/* 작은 반짝이 2 */}
      <path d="M24 1.5 L24.3 2.5 L25.3 2.8 L24.3 3.1 L24 4.1 L23.7 3.1 L22.7 2.8 L23.7 2.5 Z"
        fill="#FCD34D" opacity="0.7"/>
    </svg>
  );
}

/**
 * TabIconSimilar — 나와 비슷한 성향
 * 민트+블루 퍼즐 두 개가 같은 방향·같은 표정으로 나란히
 */
export function TabIconSimilar({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 민트 퍼즐 (왼쪽, 작게) */}
      <rect x="1" y="9" width="14" height="14" rx="4" fill="#7DCFB6"/>
      <ellipse cx="8" cy="7.5" rx="3" ry="2.5" fill="#7DCFB6"/>
      <ellipse cx="15" cy="16" rx="2.5" ry="3" fill="#ECFDF5"/>
      <ellipse cx="8" cy="24.5" rx="3" ry="2.5" fill="#7DCFB6"/>
      <rect x="3.5" y="11.5" width="9" height="9" rx="3" fill="#8ED8C4" opacity="0.35"/>
      {/* 눈 */}
      <ellipse cx="6" cy="15" rx="1.3" ry="1.5" fill="#2D6A5A"/>
      <ellipse cx="5.6" cy="14.6" rx="0.45" ry="0.45" fill="white" opacity="0.85"/>
      <ellipse cx="10" cy="15" rx="1.3" ry="1.5" fill="#2D6A5A"/>
      <ellipse cx="9.6" cy="14.6" rx="0.45" ry="0.45" fill="white" opacity="0.85"/>
      {/* 미소 */}
      <path d="M6.5 18.5 Q8 20 9.5 18.5" stroke="#2D6A5A" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="4" cy="17.5" rx="1.3" ry="0.8" fill="#F9A8D4" opacity="0.55"/>
      <ellipse cx="12" cy="17.5" rx="1.3" ry="0.8" fill="#F9A8D4" opacity="0.55"/>

      {/* 블루 퍼즐 (오른쪽, 같은 방향·표정) */}
      <rect x="17" y="9" width="14" height="14" rx="4" fill="#93C5FD"/>
      <ellipse cx="24" cy="7.5" rx="3" ry="2.5" fill="#93C5FD"/>
      <ellipse cx="17" cy="16" rx="2.5" ry="3" fill="#93C5FD"/>
      <ellipse cx="24" cy="24.5" rx="3" ry="2.5" fill="#93C5FD"/>
      <rect x="19.5" y="11.5" width="9" height="9" rx="3" fill="#BAD9FC" opacity="0.35"/>
      {/* 눈 (같은 표정) */}
      <ellipse cx="22" cy="15" rx="1.3" ry="1.5" fill="#1E3A8A"/>
      <ellipse cx="21.6" cy="14.6" rx="0.45" ry="0.45" fill="white" opacity="0.85"/>
      <ellipse cx="26" cy="15" rx="1.3" ry="1.5" fill="#1E3A8A"/>
      <ellipse cx="25.6" cy="14.6" rx="0.45" ry="0.45" fill="white" opacity="0.85"/>
      {/* 미소 (같은 표정) */}
      <path d="M22.5 18.5 Q24 20 25.5 18.5" stroke="#1E3A8A" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      {/* 볼터치 */}
      <ellipse cx="20" cy="17.5" rx="1.3" ry="0.8" fill="#F9A8D4" opacity="0.55"/>
      <ellipse cx="28" cy="17.5" rx="1.3" ry="0.8" fill="#F9A8D4" opacity="0.55"/>

      {/* 연결선 (나란히 이어지는 느낌) */}
      <path d="M15 16 Q16 16 17 16" stroke="#C7F7E9" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * TabIconDomain — 같은 도메인 우선
 * 민트 퍼즐 + 블루 퍼즐이 같은 태그(라벨)를 들고 있는 형태
 */
export function TabIconDomain({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 민트 퍼즐 (왼쪽 위) */}
      <rect x="1" y="1" width="13" height="13" rx="3.5" fill="#7DCFB6"/>
      <ellipse cx="7.5" cy="0" rx="2.5" ry="2" fill="#7DCFB6"/>
      <ellipse cx="14" cy="7.5" rx="2" ry="2.5" fill="#ECFDF5"/>
      <ellipse cx="7.5" cy="14" rx="2.5" ry="2" fill="#7DCFB6"/>
      <rect x="3" y="3" width="8" height="8" rx="3" fill="#8ED8C4" opacity="0.35"/>
      {/* 눈 */}
      <ellipse cx="5.5" cy="6.5" rx="1.1" ry="1.3" fill="#2D6A5A"/>
      <ellipse cx="5.1" cy="6.1" rx="0.38" ry="0.38" fill="white" opacity="0.85"/>
      <ellipse cx="9" cy="6.5" rx="1.1" ry="1.3" fill="#2D6A5A"/>
      <ellipse cx="8.6" cy="6.1" rx="0.38" ry="0.38" fill="white" opacity="0.85"/>
      <path d="M6 9.5 Q7.5 11 9 9.5" stroke="#2D6A5A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

      {/* 블루 퍼즐 (오른쪽 아래) */}
      <rect x="18" y="18" width="13" height="13" rx="3.5" fill="#93C5FD"/>
      <ellipse cx="24.5" cy="17" rx="2.5" ry="2" fill="#93C5FD"/>
      <ellipse cx="18" cy="24.5" rx="2" ry="2.5" fill="#93C5FD"/>
      <ellipse cx="24.5" cy="31" rx="2.5" ry="2" fill="#93C5FD"/>
      <rect x="20" y="20" width="8" height="8" rx="3" fill="#BAD9FC" opacity="0.35"/>
      {/* 눈 */}
      <ellipse cx="22.5" cy="23.5" rx="1.1" ry="1.3" fill="#1E3A8A"/>
      <ellipse cx="22.1" cy="23.1" rx="0.38" ry="0.38" fill="white" opacity="0.85"/>
      <ellipse cx="26" cy="23.5" rx="1.1" ry="1.3" fill="#1E3A8A"/>
      <ellipse cx="25.6" cy="23.1" rx="0.38" ry="0.38" fill="white" opacity="0.85"/>
      <path d="M23 26.5 Q24.5 28 26 26.5" stroke="#1E3A8A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

      {/* 공유 태그 라벨 (가운데, 두 퍼즐을 연결) */}
      <rect x="10" y="12" width="12" height="8" rx="2.5" fill="#F0FDF9" stroke="#10B981" strokeWidth="1.2"/>
      <line x1="12" y1="15" x2="20" y2="15" stroke="#10B981" strokeWidth="1" strokeLinecap="round"/>
      <line x1="12" y1="17.5" x2="18" y2="17.5" stroke="#10B981" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      {/* 태그 왼쪽 구멍 */}
      <circle cx="11.5" cy="16" r="1" fill="white" stroke="#10B981" strokeWidth="0.8"/>
    </svg>
  );
}

/**
 * TabIconBalance — 팀 밸런스 우선
 * 4색 퍼즐 4개가 완전히 맞물린 형태 (2×2)
 */
export function TabIconBalance({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 좌상단: 민트 퍼즐 */}
      <rect x="1" y="1" width="13" height="13" rx="3.5" fill="#7DCFB6"/>
      <ellipse cx="7.5" cy="0" rx="2.5" ry="2" fill="#7DCFB6"/>
      <ellipse cx="14" cy="7.5" rx="2" ry="2.5" fill="#ECFDF5"/>
      <rect x="3" y="3" width="8" height="8" rx="3" fill="#8ED8C4" opacity="0.3"/>
      <ellipse cx="5.2" cy="6.5" rx="1.1" ry="1.3" fill="#2D6A5A"/>
      <ellipse cx="4.8" cy="6.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <ellipse cx="8.8" cy="6.5" rx="1.1" ry="1.3" fill="#2D6A5A"/>
      <ellipse cx="8.4" cy="6.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <path d="M5.8 9.5 Q7.2 11 8.6 9.5" stroke="#2D6A5A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

      {/* 우상단: 블루 퍼즐 */}
      <rect x="18" y="1" width="13" height="13" rx="3.5" fill="#93C5FD"/>
      <ellipse cx="24.5" cy="0" rx="2.5" ry="2" fill="#EFF6FF"/>
      <ellipse cx="18" cy="7.5" rx="2" ry="2.5" fill="#93C5FD"/>
      <ellipse cx="31" cy="7.5" rx="2" ry="2.5" fill="#93C5FD"/>
      <rect x="20" y="3" width="8" height="8" rx="3" fill="#BAD9FC" opacity="0.3"/>
      <ellipse cx="22.2" cy="6.5" rx="1.1" ry="1.3" fill="#1E3A8A"/>
      <ellipse cx="21.8" cy="6.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <ellipse cx="25.8" cy="6.5" rx="1.1" ry="1.3" fill="#1E3A8A"/>
      <ellipse cx="25.4" cy="6.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <path d="M22.8 9.5 Q24.2 11 25.6 9.5" stroke="#1E3A8A" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

      {/* 좌하단: 보라 퍼즐 */}
      <rect x="1" y="18" width="13" height="13" rx="3.5" fill="#C4B5FD"/>
      <ellipse cx="7.5" cy="17" rx="2.5" ry="2" fill="#C4B5FD"/>
      <ellipse cx="14" cy="24.5" rx="2" ry="2.5" fill="#EDE9FE"/>
      <ellipse cx="7.5" cy="31" rx="2.5" ry="2" fill="#C4B5FD"/>
      <rect x="3" y="20" width="8" height="8" rx="3" fill="#DDD6FE" opacity="0.3"/>
      <ellipse cx="5.2" cy="23.5" rx="1.1" ry="1.3" fill="#5B21B6"/>
      <ellipse cx="4.8" cy="23.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <ellipse cx="8.8" cy="23.5" rx="1.1" ry="1.3" fill="#5B21B6"/>
      <ellipse cx="8.4" cy="23.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <path d="M5.8 26.5 Q7.2 28 8.6 26.5" stroke="#5B21B6" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

      {/* 우하단: 앰버 퍼즐 */}
      <rect x="18" y="18" width="13" height="13" rx="3.5" fill="#FCD34D"/>
      <ellipse cx="24.5" cy="17" rx="2.5" ry="2" fill="#FCD34D"/>
      <ellipse cx="18" cy="24.5" rx="2" ry="2.5" fill="#FCD34D"/>
      <ellipse cx="31" cy="24.5" rx="2" ry="2.5" fill="#FCD34D"/>
      <ellipse cx="24.5" cy="31" rx="2.5" ry="2" fill="#FCD34D"/>
      <rect x="20" y="20" width="8" height="8" rx="3" fill="#FDE68A" opacity="0.3"/>
      <ellipse cx="22.2" cy="23.5" rx="1.1" ry="1.3" fill="#92400E"/>
      <ellipse cx="21.8" cy="23.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <ellipse cx="25.8" cy="23.5" rx="1.1" ry="1.3" fill="#92400E"/>
      <ellipse cx="25.4" cy="23.1" rx="0.36" ry="0.36" fill="white" opacity="0.85"/>
      <path d="M22.8 26.5 Q24.2 28 25.6 26.5" stroke="#92400E" strokeWidth="0.9" strokeLinecap="round" fill="none"/>

      {/* 중앙 연결 하트 */}
      <path d="M14 15.2 C14 14.4 14.7 13.8 15.5 13.8 C16.3 13.8 16.7 14.4 16.7 14.4 C16.7 14.4 17.1 13.8 17.9 13.8 C18.7 13.8 19.4 14.4 19.4 15.2 C19.4 16.4 16.7 18.2 16.7 18.2 C16.7 18.2 14 16.4 14 15.2Z"
        fill="#FB7185"/>
    </svg>
  );
}
