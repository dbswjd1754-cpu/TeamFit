/**
 * balanceScoring.js — TeamFit 팀 밸런스 & 보충 추천 엔진
 *
 * ═══════════════════════════════════════════════════════════
 *  핵심 원칙
 * ═══════════════════════════════════════════════════════════
 *  1. 모든 계산은 typeRatio(4가지 성향 비율) 전체를 사용
 *     dominantType(대표 성향) 단독 사용 금지
 *
 *  2. Team Balance Score = typeRatio 기반 팀 합산 벡터 대비
 *     이상적 균등 분포(25%씩)와의 편차(MAD) 역수
 *     → 4가지 성향이 25%씩이면 항상 100점
 *
 *  3. 부족 성향 계산 = 팀 합산 typeRatio에서 비율이 낮은 순서
 *     dominantType 카운트 기반 avg 비교 방식 사용 금지
 *
 *  4. 예상 점수 = 부족 성향 팀원 추가 후 동일 공식으로 계산
 *     절대 현재 점수보다 낮아지지 않음 (max 가드)
 *
 *  5. 기능별 계산 기준 구분
 *     ② 팀원 보충   : 최종 팀원 수(현재 + 보충) 기준
 *     ③ 팀 밸런스   : 현재 팀원 수 기준
 * ═══════════════════════════════════════════════════════════
 */

import { TYPES } from '../data/questions';

// ─────────────────────────────────────────────
// 공통 상수
// ─────────────────────────────────────────────
const KEYS = ['A', 'B', 'C', 'D'];

const TYPE_NAMES = { A: '추진형', B: '소통형', C: '탐구형', D: '실행형' };
const TYPE_ROLES = {
  A: { strength: '빠른 의사결정과 방향 설정',   weakness: '체계적 분석 없이 실행이 앞설 수 있어요' },
  B: { strength: '원활한 소통과 팀워크 관리',   weakness: '의견 조율에 시간이 걸릴 수 있어요' },
  C: { strength: '깊이 있는 분석과 근거 확보',  weakness: '빠른 결정이 필요한 순간에 느릴 수 있어요' },
  D: { strength: '빠른 구현과 검증 사이클',     weakness: '방향 없이 실행만 앞설 수 있어요' },
};

const STYLE_AFFINITY = {
  '빠른 실행력':        ['A', 'D'],
  '체계적인 진행':      ['A', 'C'],
  '다양한 아이디어':    ['B', 'C'],
  '원활한 소통':        ['B', 'D'],
  '높은 결과물 퀄리티': ['C', 'B'],
};

// ─────────────────────────────────────────────
// 1. 팀 성향 합산 벡터 (typeRatio 기반)
// ─────────────────────────────────────────────
export function sumRatios(teamMembers) {
  const sum = { A: 0, B: 0, C: 0, D: 0 };
  teamMembers.forEach(m => {
    const r = m.typeRatio || {};
    KEYS.forEach(k => { sum[k] += (r[k] || 0); });
  });
  return sum;
}

// 팀 합산 → 비율 정규화 (합계 = 1.0)
function normalizeRatios(sum) {
  const total = KEYS.reduce((s, k) => s + sum[k], 0);
  if (total === 0) return { A: 0.25, B: 0.25, C: 0.25, D: 0.25 }; // fallback
  return Object.fromEntries(KEYS.map(k => [k, sum[k] / total]));
}

// ─────────────────────────────────────────────
// 2. Ideal Distribution (n명 기준)
//    n=1 → {A:1,B:0,C:0,D:0}  n=4 → {A:1,B:1,C:1,D:1}
//    n=5 → {A:2,B:1,C:1,D:1}  n=8 → {A:2,B:2,C:2,D:2}
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// TeamFit 기본 이상 성향 비율: 4개 성향 균형 = 각 25%
//
// 팀 규모(n)에 관계없이 25:25:25:25를 목표로 삼고,
// 현재 팀에서 25% 미만인 성향을 "부족 성향"으로 판단합니다.
// ─────────────────────────────────────────────
export function calcIdealDistribution(n) {
  // 하위 호환용 — 실제 점수 계산은 calcIdealRatio 사용
  const base = Math.floor(n / 4);
  return { A: base, B: base, C: base, D: base };
}

// Ideal Ratio: 항상 25% 균등 고정
// 팀 규모에 따라 특정 성향을 임의로 높이지 않습니다.
// n=4 → {A:0.25, B:0.25, C:0.25, D:0.25}
// n=5 → {A:0.25, B:0.25, C:0.25, D:0.25}  (이전: A:0.40 → 수정)
// n=6 → {A:0.25, B:0.25, C:0.25, D:0.25}  (이전: A:0.33 → 수정)
export function calcIdealRatio(_n) {
  return { A: 0.25, B: 0.25, C: 0.25, D: 0.25 };
}

// MAD_MAX: 25% 균등 기준 최대 편차
// 최악 케이스 = 한 성향 100%, 나머지 0% → MAD = 0.75 + 0.25*3 = 1.5
export function calcMADMax(_idealRatio) {
  return 1.5; // 항상 고정 (25% 기준)
}

// ─────────────────────────────────────────────
// 3. Team Balance Score (0~100)
//
//    방식: typeRatio 합산 → 팀 성향 비율 계산
//          → n명 기준 Ideal Ratio와의 MAD 편차 역수
//
//    공식:
//      actualRatio  = sumRatios(team) / total
//      idealRatio   = calcIdealRatio(n)   ← 팀 규모별 가변 기준
//      MAD          = Σ |actualRatio_k - idealRatio_k|
//      MAD_MAX      = calcMADMax(idealRatio)
//      Score        = (1 - MAD / MAD_MAX) × 100
//
//    특징:
//      - n=4 → ideal=25%씩, MAD_MAX=1.5 (기존과 동일)
//      - n=5 → ideal=40/20/20/20%, MAD_MAX=1.6
//      - n=1 → ideal=100%/0/0/0%, A100%이면 100점
//      - 어떤 팀 규모에서든 Ideal Distribution이면 항상 100점
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// calcTeamBalanceScoreBreakdown
// 4항목별 실제 점수 분해 (가중치 × 달성률)
//
//   성향 균형도 (40점 만점) : MAD 기반 균형도
//   역할 다양성 (30점 만점) : 4개 성향 중 존재하는 수 / 4
//   협업 스타일 (20점 만점) : 성향 분산도 (쏠림 없을수록 높음)
//   도메인 적합도 (10점 만점) : 팀 평균 도메인 수 / 기대치
// ─────────────────────────────────────────────
export function calcTeamBalanceScoreBreakdown(teamMembers) {
  if (!teamMembers.length) {
    return { typeBalance:0, roleDiversity:0, collabStyle:0, domainFit:0, total:0 };
  }

  const n   = teamMembers.length;
  const ir  = calcIdealRatio(n);
  const sum = sumRatios(teamMembers);
  const tot = KEYS.reduce((s,k)=>s+sum[k],0);
  const actual = tot > 0 ? normalizeRatios(sum)
    : (() => { const d=calcTeamDistribution(teamMembers); return Object.fromEntries(KEYS.map(k=>[k,(d[k]||0)/n])); })();

  // ① 성향 균형도 (40점 만점) — MAD 기반
  const madMax = calcMADMax(ir);
  const MAD    = KEYS.reduce((s,k)=>s+Math.abs(actual[k]-ir[k]),0);
  const typeBalance = Math.round(Math.max(0,(1-MAD/madMax))*40);

  // ② 역할 다양성 (30점 만점) — 실질 비율>5% 성향 수
  const activeTypes = KEYS.filter(k=>(actual[k]||0)>0.05).length;
  const roleDiversity = Math.round((activeTypes/4)*30);

  // ③ 협업 스타일 다양성 (20점 만점) — 최대 성향 비율이 낮을수록 고점
  const maxRatio = Math.max(...KEYS.map(k=>actual[k]||0));
  // 25%~100% 범위를 0~20점으로 역매핑 (25%=20점, 100%=0점)
  const collabStyle = Math.round(Math.max(0, (1-maxRatio)*20*(4/3)));

  // ④ 도메인 적합도 (10점 만점) — 팀원 평균 도메인 수
  const avgDomains = teamMembers.reduce((s,m)=>s+(m.domains?.length||0),0)/n;
  // 도메인 3개 이상이면 만점 기준
  const domainFit = Math.round(Math.min(10, (avgDomains/3)*10));

  const total = typeBalance + roleDiversity + Math.min(20,collabStyle) + domainFit;
  return {
    typeBalance,
    roleDiversity,
    collabStyle: Math.min(20,collabStyle),
    domainFit,
    total: Math.min(100,total),
  };
}

export function calcTeamBalanceScore(teamMembers) {
  // breakdown.total과 동일한 값 반환 — Hero 대형 점수와 4항목 합산 일관성 유지
  return calcTeamBalanceScoreBreakdown(teamMembers).total;
}

// ─────────────────────────────────────────────
// 4. dominantType 기반 분포 (UI 도넛 차트 전용)
//    — 점수 계산에 사용 금지
// ─────────────────────────────────────────────
export function calcTeamDistribution(teamMembers) {
  const dist = { A: 0, B: 0, C: 0, D: 0 };
  teamMembers.forEach(m => {
    if (m.dominantType && dist[m.dominantType] !== undefined) {
      dist[m.dominantType]++;
    }
  });
  return dist;
}

// ─────────────────────────────────────────────
// 5. 부족 성향 계산 (typeRatio 기반)
//
//    finalN명 기준 Ideal Ratio 대비 현재 팀의 성향 부족분 계산
//    finalN = 현재 팀원 수(현재 팀 분석) 또는 최종 팀원 수(보충 추천)
//
//    반환: 부족도 내림차순 정렬된 key 배열 ['B','C','D','A']
// ─────────────────────────────────────────────
export function calcLackingTypes(teamMembers, finalN) {
  const n = finalN || teamMembers.length;
  if (!n) return KEYS.slice();

  const DEFICIT_THRESHOLD = 0.05; // 5% 미만 deficit은 부족으로 판단하지 않음
  const sum   = sumRatios(teamMembers);
  const total = KEYS.reduce((s, k) => s + sum[k], 0);

  if (total === 0) {
    const dist = calcTeamDistribution(teamMembers);
    const ir   = calcIdealRatio(n);
    const sorted = KEYS.slice()
      .map(k => ({ k, deficit: ir[k] - (dist[k] || 0) / Math.max(teamMembers.length, 1) }))
      .sort((a, b) => b.deficit - a.deficit);
    // deficit >= 5%인 성향만 반환, 없으면 가장 부족한 1개 반환
    // deficit >= 5%인 성향만 반환, 없으면 빈 배열 (균형 팀)
    return sorted.filter(x => Math.round(x.deficit * 1000) / 1000 >= DEFICIT_THRESHOLD).map(x => x.k);
  }

  const actual = normalizeRatios(sum);
  const ir     = calcIdealRatio(n);
  const sorted = KEYS.slice()
    .map(k => ({ k, deficit: ir[k] - actual[k] }))
    .sort((a, b) => b.deficit - a.deficit);
  // deficit >= 5%인 성향만 반환, 없으면 빈 배열 (균형 팀)
  const meaningful = sorted.filter(x => Math.round(x.deficit * 1000) / 1000 >= DEFICIT_THRESHOLD);
  return meaningful.map(x => x.k);
}


// ─────────────────────────────────────────────
// 6. 예상 개선 점수 계산
//
//    부족 성향 want명 추가 후 동일 공식으로 재계산
//    절대 현재 점수보다 낮아지지 않음 (max 가드)
// ─────────────────────────────────────────────
export function calcExpectedScore(currentMembers, want) {
  const bs     = calcTeamBalanceScore(currentMembers);
  const finalN = currentMembers.length + want;

  // 부족 성향을 finalN 기준 Ideal로 계산 (② 팀원 보충 정책)
  const lacking = calcLackingTypes(currentMembers, finalN).slice(0, Math.min(want, 4));
  const toAdd   = Array.from({ length: want }, (_, i) =>
    lacking[i % lacking.length]
  );
  const virtual = [
    ...currentMembers,
    ...toAdd.map(t => ({
      dominantType: t,
      typeRatio: { A: 0, B: 0, C: 0, D: 0, [t]: 100 },
    })),
  ];
  // 예상 점수도 finalN 기준 Score로 계산
  const raw = Math.max(bs, calcTeamBalanceScore(virtual));
  // ★ 1명 추가 시 최대 20점 상승 가드 (want=1 이상이어도 합리적 범위 유지)
  const maxGain = want * 15; // 인원당 최대 15점 상승
  return Math.min(raw, bs + maxGain, 100);
}

// ─────────────────────────────────────────────
// 7. 팀 Gap 분석 (TeamBalance.jsx 전용 — AI 분석 문구)
//
//    typeRatio 기반 실제 비율을 기준으로 분석
//    distribution(카운트)이 아닌 비율로 강점/약점 판단
// ─────────────────────────────────────────────
export function analyzeTeamGap(teamMembers) {
  if (!teamMembers.length) {
    return { lacking: [], analysis: '팀원을 선택해주세요.', suggestion: '' };
  }

  const lacking   = calcLackingTypes(teamMembers);
  // 모든 성향이 균형잡힌 경우 lacking=[] → sortedByPct 기반으로 mostType/leastType 계산
  const _sorted   = [...KEYS].sort((a,b)=>(actual[b]||0)-(actual[a]||0));
  const mostType  = lacking.length > 0 ? lacking[lacking.length - 1] : _sorted[0];
  const leastType = lacking.length > 0 ? lacking[0] : null;

  const sum    = sumRatios(teamMembers);
  const total  = KEYS.reduce((s, k) => s + sum[k], 0);
  const actual = total > 0 ? normalizeRatios(sum) : { A: 0.25, B: 0.25, C: 0.25, D: 0.25 };

  const mostPct  = Math.round(actual[mostType]  * 100);
  const leastPct = Math.round(actual[leastType] * 100);

  const mostName  = TYPE_NAMES[mostType];
  const leastName = TYPE_NAMES[leastType];

  let analysis   = '';
  let suggestion = '';

  const ir = calcIdealRatio(teamMembers.length);
  // 5% 임계값 기준으로 균형 판단 (lacking이 빈 배열이면 균형)
  const isBalanced = lacking.length === 0;

  // ★ 상위 2개 강점 성향 계산
  const sortedByPct = [...KEYS].sort((a, b) => (actual[b] || 0) - (actual[a] || 0));
  const strongType1 = sortedByPct[0];
  const strongType2 = sortedByPct[1];
  const strong1Pct  = Math.round((actual[strongType1] || 0) * 100);
  const strong2Pct  = Math.round((actual[strongType2] || 0) * 100);
  const strong1Name = TYPE_NAMES[strongType1];
  const strong2Name = TYPE_NAMES[strongType2];

  if (isBalanced || !leastType) {
    analysis   = '현재 팀의 협업 성향이 균형 잡혀 있어요. 훌륭한 팀 구성입니다!';
    suggestion = '모든 협업 성향이 고르게 분포되어 있어요.';
  } else if (leastPct === 0) {
    analysis   = `현재 팀은 ${strong1Name}(${strong1Pct}%)과 ${strong2Name}(${strong2Pct}%)의 비중이 높아 관련 역량이 강점입니다.\n\n반면 ${leastName} 성향이 팀에 전혀 없어 해당 역할이 완전히 비어 있습니다.\n\nAI는 이러한 팀 성향 균형을 고려하여 ${leastName} 성향의 팀원을 우선 추천합니다.`;
    suggestion = buildSuggestion(leastType);
  } else {
    analysis   = `현재 팀은 ${strong1Name}(${strong1Pct}%)과 ${strong2Name}(${strong2Pct}%)의 비중이 높아 관련 협업 역량이 강점입니다.\n\n반면 ${leastName}(${leastPct}%)의 비율이 상대적으로 낮아 해당 역할이 부족할 수 있습니다.\n\nAI는 이러한 팀 성향 균형을 고려하여 ${leastName} 성향의 팀원을 우선 추천합니다.`;
    suggestion = buildSuggestion(leastType);
  }

  return { lacking: [leastType], zero: leastPct === 0 ? [leastType] : [], analysis, suggestion };
}

function buildSuggestion(leastType) {
  const suggestions = {
    A: '빠른 의사결정과 방향 설정을 이끌 추진형 팀원을 보충하면 프로젝트 속도가 올라가요.',
    B: '팀원 간 의견을 조율하고 갈등을 완화할 소통형 팀원을 보충하면 협업이 부드러워져요.',
    C: '데이터와 근거를 바탕으로 깊이 분석할 탐구형 팀원을 보충하면 의사결정 품질이 높아져요.',
    D: '아이디어를 빠르게 실물로 만들고 검증할 실행형 팀원을 보충하면 작업 속도가 빨라져요.',
  };
  return suggestions[leastType] || '팀 밸런스를 위해 부족한 유형의 팀원을 보충해보세요.';
}

// ─────────────────────────────────────────────
// 8. 팀 밸런스 개선 효과 계산 (후보 1명 추가 시)
//    SupplementResult의 추천 탭 밸런스 가중치에 사용
// ─────────────────────────────────────────────
export function calcBalanceImpact(candidate, teamMembers) {
  const before = calcTeamBalanceScore(teamMembers);
  const after  = calcTeamBalanceScore([...teamMembers, candidate]);
  // 0~100 정규화: 개선폭을 0~100으로 환산
  // 최대 개선폭 = 100 - 0 = 100
  const impact = Math.max(0, after - before);
  return Math.min(100, Math.round((impact / 100) * 100) + (after > before ? 20 : 0));
  // 개선이 있으면 기본 20점 추가 (추천 가중치 구조에 맞게)
}

// 더 단순한 버전: 후보 추가 후 점수 상승률
export function calcBalanceImpactScore(candidate, teamMembers) {
  if (!teamMembers.length) return 50;
  const before = calcTeamBalanceScore(teamMembers);
  const after  = calcTeamBalanceScore([...teamMembers, candidate]);
  const gain   = after - before;
  // gain: -100 ~ 100 → 0~100 정규화
  // gain=0 → 50, gain=100 → 100, gain=-100 → 0
  return Math.min(100, Math.max(0, Math.round(50 + gain * 0.5)));
}

// ─────────────────────────────────────────────
// 9. 보충 추천 점수 계산
//    정책: AI탭 = 성향40 + 도메인30 + 우선순위20 + 밸런스10
//    (scoring.js의 calcTabScore와 동일 구조)
// ─────────────────────────────────────────────

const normDomain = (s) => (s || '').toLowerCase().replace(/\s+/g, '').trim();

// typeRatio 벡터 코사인 유사도 (0~100)
// 정책: 4가지 성향 비율(typeRatio) 전체를 사용해 협업 성향 유사도 계산
function calcTypeRatioCosSim(ratioA, ratioB) {
  const KEYS = ['A','B','C','D'];
  const vA = KEYS.map(k => (ratioA || {})[k] || 0);
  const vB = KEYS.map(k => (ratioB || {})[k] || 0);
  let dot=0, nA=0, nB=0;
  for (let i=0; i<4; i++) {
    dot += vA[i]*vB[i]; nA += vA[i]*vA[i]; nB += vB[i]*vB[i];
  }
  if (!nA || !nB) return 0;
  const cos = dot / (Math.sqrt(nA) * Math.sqrt(nB));
  return Math.round(((cos + 1) / 2) * 100);
}

// rawAnswerVector 문자열(ABCD) → 숫자 변환 후 코사인 유사도 (0~100)
// selectedKey = 'A'|'B'|'C'|'D' → 1|2|3|4 로 매핑
function calcAnswerVecSim(vecA, vecB) {
  if (!vecA?.length || !vecB?.length) return 0;
  const toNum = v => {
    if (typeof v === 'number') return v;
    const map = {A:1, B:2, C:3, D:4};
    return map[String(v)] || (parseInt(v) || 0);
  };
  const len = Math.min(vecA.length, vecB.length);
  const a = vecA.slice(0, len).map(toNum);
  const b = vecB.slice(0, len).map(toNum);
  let dot=0, nA=0, nB=0;
  for (let i=0; i<len; i++) {
    dot += a[i]*b[i]; nA += a[i]*a[i]; nB += b[i]*b[i];
  }
  if (!nA || !nB) return 0;
  const cos = dot / (Math.sqrt(nA) * Math.sqrt(nB));
  return Math.round(((cos + 1) / 2) * 100);
}

// 성향 유사도: typeRatio 기반(primary) + rawAnswerVector(fallback)
// typeRatio가 모두 0이면 rawAnswerVector로 fallback
function calcStyleSim(candidate, me) {
  const rA = me?.typeRatio || {}, rB = candidate?.typeRatio || {};
  const rATotal = (rA.A||0)+(rA.B||0)+(rA.C||0)+(rA.D||0);
  const rBTotal = (rB.A||0)+(rB.B||0)+(rB.C||0)+(rB.D||0);

  // typeRatio가 있으면 우선 사용 (정책: 4가지 성향 비율 전체 비교)
  if (rATotal > 0 && rBTotal > 0) {
    return calcTypeRatioCosSim(rA, rB);
  }

  // typeRatio 없으면 rawAnswerVector로 fallback (ABCD 문자열 처리)
  return calcAnswerVecSim(me?.rawAnswerVector || [], candidate?.rawAnswerVector || []);
}

function calcDomainMatch(domainsA, domainsB) {
  if (!domainsA?.length || !domainsB?.length) return 0;
  const setB   = new Set(domainsB.map(normDomain));
  const common = domainsA.filter(d => setB.has(normDomain(d))).length;
  return Math.min(100, Math.round((common / 3) * 100));
}

function calcPriorityMatch(prioA, prioB) {
  if (!prioA || !prioB) return 0;
  if (prioA === prioB) return 100;
  const afA = new Set(STYLE_AFFINITY[prioA] || []);
  const afB = new Set(STYLE_AFFINITY[prioB] || []);
  return [...afA].some(t => afB.has(t)) ? 50 : 0;
}

// ─────────────────────────────────────────────
// 10. 구체적 추천 카드 설명 생성
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 공통 데이터 추출 헬퍼
// ─────────────────────────────────────────────
function extractReasonData(candidate, teamMembers, me) {
  const teamDomains   = new Set(teamMembers.flatMap(m => m.domains || []).map(normDomain));
  const commonDomains = (candidate.domains || []).filter(d => teamDomains.has(normDomain(d)));

  const prioCount = {};
  teamMembers.forEach(m => { if (m.priority) prioCount[m.priority] = (prioCount[m.priority] || 0) + 1; });
  const topPrio  = Object.entries(prioCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const prioExact = topPrio && candidate.priority === topPrio;
  const prioClose = topPrio && !prioExact && calcPriorityMatch(candidate.priority, topPrio) >= 50;

  const before = calcTeamBalanceScore(teamMembers);
  const after  = calcTeamBalanceScore([...teamMembers, candidate]);
  const gain   = after - before;

  const lacking   = calcLackingTypes(teamMembers);
  const leastType = lacking[0];
  const leastName = TYPE_NAMES[leastType];
  const cRatio    = candidate.typeRatio || {};
  const complementsLack = leastType && (cRatio[leastType] || 0) > 30;

  const sim = me ? calcStyleSim(candidate, me) : 0;

  return { commonDomains, topPrio, prioExact, prioClose, gain, leastType, leastName, complementsLack, sim };
}

// ─────────────────────────────────────────────
// 탭별 추천 카드 이유 (체크리스트, 최대 4개)
//
// 탭 강조 포인트:
//   ai      → 종합 근거: 도메인 > 밸런스 > 우선순위 > 성향
//   domain  → 도메인 먼저, 그 다음 우선순위/성향
//   similar → 성향 유사도 먼저, 그 다음 도메인/우선순위
//   balance → 밸런스 보완 먼저, 그 다음 도메인/우선순위
// ─────────────────────────────────────────────
function buildSupplementCardReasons(candidate, teamMembers, tab, me) {
  const d = extractReasonData(candidate, teamMembers, me);
  const parts = [];

  if (tab === 'ai') {
    // AI 추천: 여러 요소를 균형 있게, 가장 임팩트 큰 것부터
    if (d.commonDomains.length >= 2) {
      parts.push(`관심 도메인 ${d.commonDomains.length}개 일치 (${d.commonDomains.slice(0,2).join(', ')})`);
    } else if (d.commonDomains.length === 1) {
      parts.push(`관심 도메인 "${d.commonDomains[0]}" 일치`);
    }
    if (d.gain > 5) {
      parts.push(`팀 밸런스 +${d.gain}점 개선 예상`);
    }
    if (d.prioExact) {
      parts.push(`협업 우선순위 "${candidate.priority}" 일치`);
    } else if (d.prioClose) {
      parts.push(`협업 방향성 유사 (${candidate.priority})`);
    }
    if (d.complementsLack) {
      parts.push(`현재 부족한 ${d.leastName} 성향 보완`);
    }
  }

  else if (tab === 'domain') {
    // 같은 도메인: 도메인 일치가 핵심, 얼마나 겹치는지 구체적으로
    if (d.commonDomains.length >= 3) {
      parts.push(`관심 도메인 3개 모두 일치 (${d.commonDomains.slice(0,3).join(', ')})`);
    } else if (d.commonDomains.length === 2) {
      parts.push(`관심 도메인 2개 일치 (${d.commonDomains.join(', ')})`);
    } else if (d.commonDomains.length === 1) {
      parts.push(`관심 도메인 "${d.commonDomains[0]}" 일치`);
    } else {
      parts.push('관심 도메인은 다르지만 새로운 시각을 더해줄 수 있어요');
    }
    if (d.prioExact) {
      parts.push(`협업 우선순위 "${candidate.priority}" 일치`);
    } else if (d.prioClose) {
      parts.push(`협업 방향성 유사 (${candidate.priority})`);
    }
    if (d.gain > 5) {
      parts.push(`팀 밸런스 +${d.gain}점 개선 예상`);
    }
  }

  else if (tab === 'similar') {
    // 같은 성향: 성향 유사도가 핵심
    if (d.sim >= 80) {
      parts.push(`협업 스타일 유사도 ${d.sim}% — 매우 높음`);
    } else if (d.sim >= 60) {
      parts.push(`협업 스타일 유사도 ${d.sim}%`);
    } else if (d.sim > 0) {
      parts.push(`협업 스타일 유사도 ${d.sim}%`);
    }
    if (d.commonDomains.length >= 2) {
      parts.push(`관심 도메인 ${d.commonDomains.length}개 일치 (${d.commonDomains.slice(0,2).join(', ')})`);
    } else if (d.commonDomains.length === 1) {
      parts.push(`관심 도메인 "${d.commonDomains[0]}" 일치`);
    }
    if (d.prioExact) {
      parts.push(`협업 우선순위 "${candidate.priority}" 일치`);
    } else if (d.prioClose) {
      parts.push(`협업 방향성 유사 (${candidate.priority})`);
    }
  }

  else if (tab === 'balance') {
    // 밸런스 우선: 팀 보완이 핵심, 부족 성향 채워주는지 먼저
    if (d.complementsLack) {
      parts.push(`현재 팀에 부족한 ${d.leastName} 성향 보완`);
    }
    if (d.gain > 0) {
      parts.push(`팀 밸런스 +${d.gain}점 개선 예상`);
    }
    if (d.commonDomains.length >= 1) {
      parts.push(`관심 도메인 ${d.commonDomains.length}개 일치 (${d.commonDomains.slice(0,2).join(', ')})`);
    }
    if (d.prioExact) {
      parts.push(`협업 우선순위 "${candidate.priority}" 일치`);
    } else if (d.prioClose) {
      parts.push(`협업 방향성 유사 (${candidate.priority})`);
    }
  }

  // 내용 없으면 fallback
  if (parts.length === 0) {
    if (d.gain > 0) parts.push(`팀 밸런스 +${d.gain}점 개선 예상`);
    else parts.push('다양한 관점으로 팀에 새로운 시각을 더해줄 수 있어요');
  }

  return parts;
}

// ─────────────────────────────────────────────
// 탭별 AI 추천 이유 — 후보별 실제 기여도 기반 동적 생성
//
//   고정된 문구를 탭 종류로만 분기하지 않고, 이미 계산된 breakdown
//   (styleSim/domainPct/prioPct/balanceGain × 탭별 weights = contributions)을
//   근거값(value)으로 사용해 "이 후보의 점수에 가장 크게 기여한 요소"부터
//   정렬 후 최대 4개까지 노출한다 → 후보마다, 탭마다 다른 조합이 나옴
// ─────────────────────────────────────────────
function buildSupplementAISummary(candidate, teamMembers, tab, score, breakdown) {
  const bd = breakdown || {};
  const {
    styleSim = 0,
    commonDomains = [],
    contributions = {},
    prioMatch, prioRate = 0, prioOther,
    balanceGain = 0,
    lacksType, lacksTypeName, candidateLacksStrong,
  } = bd;

  const items = []; // { value: 정렬 기준 점수, text: 표시 문구 }

  // ① 협업 스타일 유사도
  if (styleSim > 0) {
    const text = styleSim >= 85
      ? `협업 스타일 유사도가 ${styleSim}%로 매우 높습니다.`
      : styleSim >= 60
        ? `협업 스타일 유사도가 ${styleSim}%로 높습니다.`
        : `협업 스타일 유사도가 ${styleSim}%입니다.`;
    items.push({ value: contributions.style || 0, text });
  }

  // ② 관심 도메인 일치
  if (commonDomains.length >= 3) {
    items.push({ value: contributions.domain || 0,
      text: `공통 관심 도메인 ${commonDomains.length}개가 모두 일치합니다 (${commonDomains.slice(0,3).join(', ')}).` });
  } else if (commonDomains.length === 2) {
    items.push({ value: contributions.domain || 0,
      text: `공통 관심 도메인이 ${commonDomains.length}개 일치합니다 (${commonDomains.join(', ')}).` });
  } else if (commonDomains.length === 1) {
    items.push({ value: contributions.domain || 0,
      text: `공통 관심 도메인 "${commonDomains[0]}"이 일치합니다.` });
  }

  // ③ 협업 우선순위
  if (prioMatch) {
    items.push({ value: contributions.priority || 0, text: `프로젝트 우선순위 "${prioOther}"가 팀과 동일합니다.` });
  } else if (prioRate >= 50) {
    items.push({ value: contributions.priority || 0, text: '프로젝트 진행 방향이 팀과 유사합니다.' });
  }

  // ④ 팀 밸런스 개선
  if (balanceGain > 0) {
    items.push({ value: (contributions.balance || 0) + balanceGain, text: `팀 밸런스를 +${balanceGain}점 개선합니다.` });
  }

  // ⑤ 부족 성향 보완 — 탭 가중치와 무관하게 항상 설득력 있는 근거이므로 기본 우선순위를 확보
  if (lacksType && candidateLacksStrong) {
    const pct = Math.round(candidate.typeRatio?.[lacksType] || 0);
    items.push({
      value: 35 + pct * 0.3,
      text: pct >= 40
        ? `현재 부족한 ${lacksTypeName} 성향을 가장 많이 보완합니다 (${pct}%).`
        : `현재 팀에 부족한 ${lacksTypeName} 성향을 보완합니다.`,
    });
  }

  // ⑥ 역할 다양성 증가 (후보 합류 전후 비교)
  const roleDivBefore = calcTeamBalanceScoreBreakdown(teamMembers).roleDiversity;
  const roleDivAfter  = calcTeamBalanceScoreBreakdown([...teamMembers, candidate]).roleDiversity;
  if (roleDivAfter > roleDivBefore) {
    items.push({ value: 15, text: '역할 다양성이 증가합니다.' });
  }

  if (items.length === 0) {
    return score >= 65
      ? '종합적으로 현재 팀과 잘 어울리는 팀원입니다.'
      : '다양한 시각으로 팀에 새로운 관점을 더해줄 수 있는 팀원입니다.';
  }

  return items
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
    .map(it => it.text)
    .join(' + ');
}

// ─────────────────────────────────────────────
// 10-b. 팀 합산 프로필 생성
//
//   SupplementResult 전용:
//   팀원 개개인이 아닌 "팀 전체"를 하나의 기준점으로 삼아
//   후보자와의 유사도(styleSim / domainMatch / priorityMatch)를 계산
//
//   반환 형태는 buildTabRecommendations의 me 파라미터 포맷과 동일
// ─────────────────────────────────────────────
export function makeTeamProfile(teamMembers, groupCode) {
  if (!teamMembers.length) return null;

  // typeRatio 평균
  const sumR = { A:0, B:0, C:0, D:0 };
  teamMembers.forEach(m => {
    const r = m.typeRatio || {};
    KEYS.forEach(k => { sumR[k] += (r[k] || 0); });
  });
  const n = teamMembers.length;
  const avgR = Object.fromEntries(KEYS.map(k => [k, Math.round(sumR[k] / n)]));

  // 팀 전체 도메인 합집합
  const domains = [...new Set(teamMembers.flatMap(m => m.domains || []))];

  // 팀 최빈 우선순위
  const prioCnt = {};
  teamMembers.forEach(m => { if (m.priority) prioCnt[m.priority] = (prioCnt[m.priority] || 0) + 1; });
  const priority = Object.entries(prioCnt).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // rawAnswerVector: 팀 전체 벡터 이어붙임 (calcStyleSim에서 길이 불일치 → 단순 일치율 fallback)
  const rawAnswerVector = teamMembers.flatMap(m => m.rawAnswerVector || []);

  return {
    id: `team_${groupCode}`,
    name: '팀 전체',
    groupCode,
    projectCode: groupCode,
    dominantType: KEYS.reduce((a, b) => avgR[a] >= avgR[b] ? a : b),
    typeRatio: avgR,
    rawAnswerVector,
    domains,
    priority,
  };
}

// ─────────────────────────────────────────────
// 11. 보충 추천 목록 생성 (SupplementResult 전용)
//
//     탭별 가중치:
//       ai      : 성향40 + 도메인30 + 우선순위20 + 밸런스10
//       domain  : 도메인70 + 성향20 + 우선순위10
//       similar : 성향70 + 도메인20 + 우선순위10
//       balance : 밸런스60 + 성향20 + 도메인20
// ─────────────────────────────────────────────
export function buildTabRecommendations(tab, me, candidates, teamMembers) {
  const scored = candidates.map(candidate => {
    const styleSim   = calcStyleSim(candidate, me);
    const domainPct  = calcDomainMatch(me?.domains, candidate.domains);
    const prioPct    = calcPriorityMatch(me?.priority, candidate.priority);
    const balanceImp = calcBalanceImpactScore(candidate, teamMembers);

    let score;
    switch (tab) {
      case 'domain':
        score = Math.round(domainPct * 0.70 + styleSim * 0.20 + prioPct * 0.10);
        break;
      case 'similar':
        score = Math.round(styleSim * 0.70 + domainPct * 0.20 + prioPct * 0.10);
        break;
      case 'balance':
        score = Math.round(balanceImp * 0.60 + styleSim * 0.20 + domainPct * 0.20);
        break;
      case 'ai':
      default:
        score = Math.round(styleSim * 0.40 + domainPct * 0.30 + prioPct * 0.20 + balanceImp * 0.10);
    }

    // 탭별 가중치 정의
    const WEIGHTS = {
      ai:      { style: 0.40, domain: 0.30, priority: 0.20, balance: 0.10 },
      domain:  { style: 0.20, domain: 0.70, priority: 0.10, balance: 0    },
      similar: { style: 0.70, domain: 0.20, priority: 0.10, balance: 0    },
      balance: { style: 0.20, domain: 0.20, priority: 0,    balance: 0.60 },
    };
    const weights = WEIGHTS[tab] || WEIGHTS.ai;

    // 항목별 기여 점수 (원점수 × 가중치)
    const contributions = {
      style:    Math.round(styleSim   * weights.style),
      domain:   Math.round(domainPct  * weights.domain),
      priority: Math.round(prioPct    * weights.priority),
      balance:  Math.round(balanceImp * weights.balance),
    };

    const lacksTypeNow = calcLackingTypes(teamMembers)[0] || null;
    const balanceGainNow = Math.max(0, calcTeamBalanceScore([...teamMembers, candidate]) - calcTeamBalanceScore(teamMembers));

    const breakdown = {
      // 원점수 (0~100)
      styleSim, domainPct, prioPct, balanceImp,
      // 탭 & 가중치 (점수 산출 근거 표시용)
      tab,
      weights,
      contributions,
      // 바텀시트용 세부 정보
      domainCount:    ((me?.domains || []).filter(d => {
        const setB = new Set((candidate.domains || []).map(normDomain));
        return setB.has(normDomain(d));
      })).length,
      commonDomains:  (me?.domains || []).filter(d => {
        const setB = new Set((candidate.domains || []).map(normDomain));
        return setB.has(normDomain(d));
      }),
      domainTotal:    Math.max((me?.domains || []).length, 1),
      prioMatch:      me?.priority === candidate.priority,
      prioSame:       me?.priority,
      prioOther:      candidate.priority,
      prioRate:       prioPct,
      balanceRate:    balanceImp,
      balanceGain:    balanceGainNow,
      lacksType:      lacksTypeNow,
      lacksTypeName:  lacksTypeNow ? TYPE_NAMES[lacksTypeNow] : null,
      candidateLacksStrong: lacksTypeNow && (candidate.typeRatio?.[lacksTypeNow] || 0) > 30,
    };

    const reasons   = buildSupplementCardReasons(candidate, teamMembers, tab, me);
    const aiSummary = buildSupplementAISummary(candidate, teamMembers, tab, score, breakdown);

    // 디버그 로그 (개발 환경에서 score 산출 근거 확인)
    if (typeof __DEV__ !== 'undefined' && __DEV__ || typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('[TabRec]', tab, candidate.name, score, {
        styleSim, domainPct, prioPct, balanceImp,
        formula: tab==='ai' ? `${styleSim}×0.4 + ${domainPct}×0.3 + ${prioPct}×0.2 + ${balanceImp}×0.1`
          : tab==='similar' ? `${styleSim}×0.7 + ${domainPct}×0.2 + ${prioPct}×0.1`
          : tab==='domain'  ? `${domainPct}×0.7 + ${styleSim}×0.2 + ${prioPct}×0.1`
          : `${balanceImp}×0.6 + ${styleSim}×0.2 + ${domainPct}×0.2`,
      });
    }

    return { user: candidate, score, breakdown, reasons, aiSummary };
  });

  // 탭별 후보군 필터링
  let pool = scored;
  if (tab === 'domain') {
    const filtered = scored.filter(r => r.breakdown.domainCount >= 1);
    if (filtered.length > 0) pool = filtered;
  } else if (tab === 'similar') {
    const sorted30 = [...scored].sort((a, b) => b.breakdown.styleSim - a.breakdown.styleSim);
    pool = sorted30.slice(0, Math.max(1, Math.ceil(sorted30.length * 0.3)));
  } else if (tab === 'balance') {
    const lt = calcLackingTypes(teamMembers)[0];
    if (lt) {
      const filtered = scored.filter(r => (r.user.typeRatio?.[lt] || 0) > 20);
      if (filtered.length > 0) pool = filtered;
    }
  }

  return pool
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ─────────────────────────────────────────────
// 12. Team Balance Score 구간 레이블
// ─────────────────────────────────────────────
export function getTeamScoreLabel(score) {
  if (score >= 90) return { label: '완벽에 가까운 밸런스', color: '#10B981', grade: 'S' };
  if (score >= 75) return { label: '균형 잡힌 팀',         color: '#4F6EF7', grade: 'A' };
  if (score >= 55) return { label: '보완이 필요한 팀',     color: '#F59E0B', grade: 'B' };
  return           { label: '성향 불균형 주의',            color: '#EF4444', grade: 'C' };
}

// ─── 추천 점수 색상 기준 (전 화면 통일) ───────
// 80+ 초록  60-79 파랑  40-59 주황  40미만 빨강
export function getMatchLabel(score) {
  if (score >= 80) return { label: '높은 적합도',   color: '#10B981' }; // 초록
  if (score >= 60) return { label: '적합도 양호',   color: '#4F6EF7' }; // 파랑
  if (score >= 40) return { label: '보완 관계',     color: '#F59E0B' }; // 주황
  return             { label: '낮은 적합도',         color: '#EF4444' }; // 빨강
}

// 레거시 호환 별칭
export function getSupplementLabel(score) {
  return getMatchLabel(score);
}

// ─────────────────────────────────────────────
// 13. AI 팀 분석 (TeamBalanceResult 전용)
//     typeRatio 기반 비율 분석으로 통일
// ─────────────────────────────────────────────
export function generateTeamAnalysis(members, distribution, balanceScore) {
  const total = members.length;
  if (total === 0) return { strengths: [], weaknesses: [], recommendation: '', summary: '' };

  const sum    = sumRatios(members);
  const totSum = KEYS.reduce((s, k) => s + sum[k], 0);
  const actual = totSum > 0 ? normalizeRatios(sum) : { A: 0.25, B: 0.25, C: 0.25, D: 0.25 };

  const lacking = calcLackingTypes(members);
  const mostKey  = lacking[lacking.length - 1];
  const leastKey = lacking[0];
  const mostPct  = Math.round(actual[mostKey]  * 100);
  const leastPct = Math.round(actual[leastKey] * 100);

  const DESCS = {
    A: '빠른 의사결정과 강한 실행력',
    B: '원활한 소통과 팀 분위기 관리',
    C: '깊이 있는 분석과 근거 기반 결정',
    D: '빠른 구현과 검증 사이클',
  };

  const strengths = [];
  if (mostPct >= 35) strengths.push(`🚀 ${TYPE_NAMES[mostKey]} 비중(${mostPct}%)이 높아 ${DESCS[mostKey]}이 뛰어납니다.`);
  if (actual.A >= 0.2 && actual.D >= 0.2) strengths.push('⚡ 추진형과 실행형이 함께해 프로젝트 속도가 빠를 거예요.');
  if (actual.B >= 0.2 && actual.C >= 0.2) strengths.push('🤝 소통형과 탐구형이 함께해 팀 내 의사결정 품질이 높아요.');
  if (balanceScore >= 75) strengths.push('⚖️ 네 가지 성향이 고르게 분포되어 다양한 상황에 유연하게 대응할 수 있어요.');
  if (strengths.length === 0) strengths.push(`현재 팀은 ${TYPE_NAMES[mostKey]} 중심으로 구성되어 있어요.`);

  const weaknesses = [];
  if (leastPct === 0) {
    weaknesses.push(`⚠️ ${TYPE_NAMES[leastKey]} 성향이 없어 ${DESCS[leastKey]}이 부족할 수 있어요.`);
  } else if (leastPct < 15) {
    weaknesses.push(`⚠️ ${TYPE_NAMES[leastKey]} 성향(${leastPct}%)이 매우 적어 ${DESCS[leastKey]}이 약해질 수 있어요.`);
  }
  if (mostPct >= 50) weaknesses.push(`⚠️ ${TYPE_NAMES[mostKey]}에 집중되어 있어 의사결정 방식이 단조로울 수 있어요.`);
  if (weaknesses.length === 0) weaknesses.push('현재 구성에서 큰 약점은 발견되지 않았어요.');

  const recommendation = leastPct < 15
    ? `💡 ${TYPE_NAMES[leastKey]} 성향 팀원을 보충하면 팀의 약점을 보완할 수 있어요.`
    : '💡 현재 팀 구성이 이미 잘 균형 잡혀 있어요.';

  const summary = balanceScore >= 75
    ? `${total}명의 팀원이 균형 잡힌 성향을 갖추고 있어요.`
    : `${TYPE_NAMES[mostKey]} 중심 팀으로, ${TYPE_NAMES[leastKey]} 성향 보강이 필요해요.`;

  return { strengths, weaknesses, recommendation, summary };
}

// ─────────────────────────────────────────────
// 14. AI 분석 문구 (SupplementResult 전용)
//     현재 팀 분석 → 부족 성향 → 추천 이유 흐름
// ─────────────────────────────────────────────
export function generateSupplementAIText(teamMembers, balanceScore, finalN) {
  if (!teamMembers.length) return '팀원을 선택해주세요.';

  // 4항목 실제 점수 계산
  const bd = calcTeamBalanceScoreBreakdown(teamMembers);

  const currentLacking = calcLackingTypes(teamMembers);
  const mostKey        = currentLacking[currentLacking.length - 1];
  const finalLacking   = finalN ? calcLackingTypes(teamMembers, finalN) : currentLacking;
  const leastKey       = finalLacking[0] || null; // 균형 팀이면 null

  const sum    = sumRatios(teamMembers);
  const totSum = KEYS.reduce((s,k)=>s+sum[k],0);
  const actual = totSum > 0 ? normalizeRatios(sum) : { A:0.25,B:0.25,C:0.25,D:0.25 };
  const mostPct  = Math.round(actual[mostKey]  * 100);
  const leastPct = leastKey ? Math.round(actual[leastKey] * 100) : 0;

  // 항목별 진단 문장
  const typeBalanceStr = !leastKey || bd.typeBalance >= 32
    ? `성향 균형도(${bd.typeBalance}/40)가 높아 다양한 협업 역할이 잘 분배되어 있습니다`
    : `성향 균형도(${bd.typeBalance}/40)가 낮아 ${TYPE_NAMES[leastKey]} 역할이 부족합니다`;

  const roleDivStr = bd.roleDiversity >= 22
    ? `역할 다양성(${bd.roleDiversity}/30)이 확보되어 있습니다`
    : `역할 다양성(${bd.roleDiversity}/30)이 부족해 특정 성향에 편중되어 있습니다`;

  const collabStr = bd.collabStyle >= 14
    ? `협업 스타일(${bd.collabStyle}/20)이 고르게 분포되어 있습니다`
    : `협업 스타일(${bd.collabStyle}/20)이 ${TYPE_NAMES[mostKey]}에 집중되어 있습니다`;

  const domainStr = bd.domainFit >= 7
    ? `도메인 적합도(${bd.domainFit}/10)가 높아 프로젝트 방향성이 잘 맞습니다`
    : `도메인 적합도(${bd.domainFit}/10)를 높이려면 다양한 도메인 팀원이 필요합니다`;

  if (balanceScore >= 80) {
    return `현재 팀은 ${typeBalanceStr}. ${roleDivStr}. ${domainStr}.`;
  }

  const leastStr = leastPct === 0
    ? `${TYPE_NAMES[leastKey]} 성향이 팀에 없어`
    : `${TYPE_NAMES[leastKey]}(${leastPct}%) 비율이 낮아`;

  return `${typeBalanceStr}. ${roleDivStr}. ${leastStr} 해당 역할이 부족합니다. ${domainStr}.`;
}

// ─────────────────────────────────────────────
// 15. 레거시 호환 (이전 버전 호출부 지원)
// ─────────────────────────────────────────────
export function buildSupplementRecommendations(currentTeamMembers, allUsers, groupCode) {
  const currentIds = new Set(currentTeamMembers.map(m => m.id));
  const candidates = allUsers.filter(u => {
    const code = u.projectCode ?? u.groupCode;
    return code === groupCode && !currentIds.has(u.id);
  });

  // ★ 팀 보충 추천: 'balance' 탭 사용 (balanceImp 60% 가중치)
  //   정렬 우선순위: ① 부족 성향 보완도 ② 팀 밸런스 개선 ③ 도메인 ④ 스타일
  //   me=null이므로 styleSim/domain/prio는 0 → balanceImp가 핵심 기준
  const results = buildTabRecommendations('balance', null, candidates, currentTeamMembers);

  // ★ 부족 성향 보유자 우선 정렬 강화
  //   가장 부족한 성향(lackingTypes[0])을 가진 후보를 최상위로
  const lacking = calcLackingTypes(currentTeamMembers);
  const leastKey = lacking[0]; // 가장 부족한 성향

  if (leastKey) {
    results.sort((a, b) => {
      const aHasLeast = (a.user.typeRatio?.[leastKey] || 0) > 25;
      const bHasLeast = (b.user.typeRatio?.[leastKey] || 0) > 25;
      if (aHasLeast && !bHasLeast) return -1;
      if (!aHasLeast && bHasLeast) return 1;
      return b.score - a.score; // 같은 그룹이면 score 순
    });
  }

  return results;
}
