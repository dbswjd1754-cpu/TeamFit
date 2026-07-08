import { TYPES } from '../data/questions';

// ─────────────────────────────────────────────
// 팀 선호 스타일 → 친화 유형 매핑
// ─────────────────────────────────────────────
const STYLE_AFFINITY = {
  '빠른 실행력':        ['A', 'D'],
  '체계적인 진행':      ['A', 'C'],
  '다양한 아이디어':    ['B', 'C'],
  '원활한 소통':        ['B', 'D'],
  '높은 결과물 퀄리티': ['C', 'B'],
};

// ─────────────────────────────────────────────
// 1. 협업 스타일 유사도 — Vector Similarity (0~100)
//
//    rawAnswerVector: 각 문항의 선택 값 배열
//    → 코사인 유사도 계산 → 0~100 정규화
//    벡터가 없거나 길이 다를 경우 Jaccard fallback
// ─────────────────────────────────────────────
export function calcVectorSimilarity(vecA, vecB) {
  if (!vecA?.length || !vecB?.length) return 0;

  // 길이가 같을 때 코사인 유사도
  if (vecA.length === vecB.length) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      const a = Number(vecA[i]) || 0;
      const b = Number(vecB[i]) || 0;
      dot   += a * b;
      normA += a * a;
      normB += b * b;
    }
    if (normA === 0 || normB === 0) return 0;
    const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    // cos: -1 ~ 1 → 0 ~ 100
    return Math.round(((cos + 1) / 2) * 100);
  }

  // 길이 다를 때: 일치 답변 비율 (Jaccard-like fallback)
  const len   = Math.min(vecA.length, vecB.length);
  const match = vecA.slice(0, len).filter((v, i) => v === vecB[i]).length;
  return Math.round((match / len) * 100);
}

// ─────────────────────────────────────────────
// 2. 관심 도메인 일치율 (0~100)
//
//    3개 일치 = 100%
//    2개 일치 = 66%
//    1개 일치 = 33%
//    → 명세에 따라 일치 수 / 3 * 100 (최대 100 clamp)
// ─────────────────────────────────────────────
const normDomain = (s) => (s || '').toLowerCase().replace(/\s+/g, '').trim();

export function calcDomainRate(domainsA, domainsB) {
  if (!domainsA?.length || !domainsB?.length) return 0;
  const normB  = new Set(domainsB.map(normDomain));
  const common = domainsA.filter(d => normB.has(normDomain(d))).length;
  // 3개 일치 = 100, 2개 = 66, 1개 = 33, 0 = 0
  return Math.min(100, Math.round((common / 3) * 100));
}

// 기존 호환용 (UI 일부에서 아직 사용)
export function calcDomainScore(domainsA, domainsB) {
  if (!domainsA?.length || !domainsB?.length) return 0;
  const normB  = new Set(domainsB.map(normDomain));
  const common = domainsA.filter(d => normB.has(normDomain(d))).length;
  const maxLen = Math.max(domainsA.length, domainsB.length);
  return Math.round((common / maxLen) * 30);
}

// ─────────────────────────────────────────────
// 3. 협업 우선순위 유사도 (0~100)
// ─────────────────────────────────────────────
export function calcPriorityRate(prioA, prioB) {
  if (!prioA || !prioB) return 0;
  if (prioA === prioB) return 100;
  const affinityA = new Set(STYLE_AFFINITY[prioA] || []);
  const affinityB = new Set(STYLE_AFFINITY[prioB] || []);
  const overlap   = [...affinityA].filter(t => affinityB.has(t));
  return overlap.length > 0 ? 50 : 0;
}

// 기존 호환용
export function calcPriorityScore(prioA, prioB) {
  if (!prioA || !prioB) return 0;
  if (prioA === prioB) return 20;
  const affinityA = new Set(STYLE_AFFINITY[prioA] || []);
  const affinityB = new Set(STYLE_AFFINITY[prioB] || []);
  const overlap   = [...affinityA].filter(t => affinityB.has(t));
  return overlap.length > 0 ? 10 : 0;
}

// ─────────────────────────────────────────────
// 4. 팀 밸런스 보완도 (0~100)
//    후보자의 typeRatio가 현재 팀에서 부족한 성향일수록 높은 점수
//    대표 성향이 아니라 4가지 성향 비율 벡터 전체를 비교
// ─────────────────────────────────────────────
export function calcBalanceComplement(candidate, teamMembers) {
  if (!teamMembers?.length) return 50; // 팀원 없으면 중간점

  // 팀 전체 성향 벡터 평균
  const teamAvg = { A: 0, B: 0, C: 0, D: 0 };
  teamMembers.forEach(m => {
    const r = m.typeRatio || {};
    teamAvg.A += (r.A || 0);
    teamAvg.B += (r.B || 0);
    teamAvg.C += (r.C || 0);
    teamAvg.D += (r.D || 0);
  });
  const n = teamMembers.length;
  Object.keys(teamAvg).forEach(k => { teamAvg[k] /= n; });

  // 팀 평균이 낮은 영역에서 후보자 강도가 높을수록 보완도 ↑
  const ratio = candidate.typeRatio || {};
  let score = 0;
  let weightSum = 0;
  ['A', 'B', 'C', 'D'].forEach(k => {
    const teamVal      = teamAvg[k];          // 팀 평균 (0~100)
    const candidateVal = ratio[k] || 0;       // 후보자 해당 성향 (0~100)
    const gap          = Math.max(0, 50 - teamVal); // 팀이 부족한 정도
    score     += gap * (candidateVal / 100);
    weightSum += gap;
  });

  if (weightSum === 0) return 50;
  return Math.min(100, Math.round((score / weightSum) * 100));
}

// ─────────────────────────────────────────────
// 5. 기존 호환 calcStyleScore (일부 UI에서 사용)
// ─────────────────────────────────────────────
export function calcStyleScore(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  const matches = vecA.filter((v, i) => v === vecB[i]).length;
  return Math.round((matches / vecA.length) * 50);
}

// ─────────────────────────────────────────────
// 6. 기존 호환 calcMatchScore
// ─────────────────────────────────────────────
export function calcMatchScore(userA, userB) {
  const style    = calcStyleScore(userA.rawAnswerVector, userB.rawAnswerVector);
  const domain   = calcDomainScore(userA.domains, userB.domains);
  const priority = calcPriorityScore(userA.priority, userB.priority);
  return { total: style + domain + priority, style, domain, priority };
}

// ─────────────────────────────────────────────
// 7. 탭별 매칭 적합도 계산 (0~100점)
//
//    ① AI 추천:    성향40 + 도메인30 + 우선순위20 + 밸런스10
//    ② 같은도메인: 도메인45 + 성향30 + 우선순위25   (후보군: 도메인 1개↑ 일치)
//    ③ 비슷한성향: 도메인45 + 우선순위30 + 밸런스25 (후보군: 성향 상위30%)
//    ④ 밸런스우선: 도메인45 + 우선순위30 + 성향25   (후보군: 부족 성향)
// ─────────────────────────────────────────────
export function calcTabScore(tab, me, candidate, teamMembers) {
  const styleRate    = calcVectorSimilarity(me.rawAnswerVector, candidate.rawAnswerVector);
  const domainRate   = calcDomainRate(me.domains, candidate.domains);
  const priorityRate = calcPriorityRate(me.priority, candidate.priority);
  const balanceRate  = calcBalanceComplement(candidate, teamMembers);

  switch (tab) {
    case 'ai':
      // AI 추천: 성향40 + 도메인30 + 우선순위20 + 밸런스10
      return Math.round(styleRate * 0.40 + domainRate * 0.30 + priorityRate * 0.20 + balanceRate * 0.10);
    case 'domain':
      // 같은 도메인: 도메인70 + 성향20 + 우선순위10
      return Math.round(domainRate * 0.70 + styleRate * 0.20 + priorityRate * 0.10);
    case 'similar':
      // 같은 성향: 성향70 + 도메인20 + 우선순위10
      return Math.round(styleRate * 0.70 + domainRate * 0.20 + priorityRate * 0.10);
    case 'balance':
      // 밸런스 우선: 밸런스60 + 성향20 + 도메인20
      return Math.round(balanceRate * 0.60 + styleRate * 0.20 + domainRate * 0.20);
    default:
      return Math.round(styleRate * 0.40 + domainRate * 0.30 + priorityRate * 0.20 + balanceRate * 0.10);
  }
}

// ─────────────────────────────────────────────
// 8. 탭별 후보군 필터링
// ─────────────────────────────────────────────
export function filterCandidatesByTab(tab, me, candidates, teamMembers) {
  switch (tab) {

    case 'domain': {
      // 도메인 1개 이상 일치하는 사용자만
      return candidates.filter(c => {
        const normB  = new Set((c.domains || []).map(normDomain));
        const common = (me.domains || []).filter(d => normB.has(normDomain(d))).length;
        return common >= 1;
      });
    }

    case 'similar': {
      // 성향 유사도 순 상위 30% 후보군
      const withSim = candidates.map(c => ({
        candidate: c,
        sim: calcVectorSimilarity(me.rawAnswerVector, c.rawAnswerVector),
      })).sort((a, b) => b.sim - a.sim);
      const top30 = Math.max(1, Math.ceil(withSim.length * 0.3));
      return withSim.slice(0, top30).map(x => x.candidate);
    }

    case 'balance': {
      // 팀에서 부족한 성향(typeRatio가 팀 평균보다 높은 영역 보유)
      if (!teamMembers?.length) return candidates;
      const teamAvg = { A: 0, B: 0, C: 0, D: 0 };
      teamMembers.forEach(m => {
        const r = m.typeRatio || {};
        Object.keys(teamAvg).forEach(k => { teamAvg[k] += (r[k] || 0); });
      });
      const n = teamMembers.length;
      Object.keys(teamAvg).forEach(k => { teamAvg[k] /= n; });
      // 팀 평균보다 낮은 유형(부족 유형)
      const lacksKeys = Object.entries(teamAvg)
        .filter(([, v]) => v < 50)
        .map(([k]) => k);
      if (lacksKeys.length === 0) return candidates; // 팀이 균형잡혀 있으면 전체
      // 후보 중 부족 유형에서 팀 평균 이상 강도를 가진 사람만
      return candidates.filter(c => {
        const r = c.typeRatio || {};
        return lacksKeys.some(k => (r[k] || 0) >= teamAvg[k]);
      });
    }

    default: // ai — 전체
      return candidates;
  }
}

// ─────────────────────────────────────────────
// 9. 탭별 추천 목록 생성 (상위 5명, 매칭 적합도)
//    rec = { user, score, breakdown, reasons, aiSummary }
// ─────────────────────────────────────────────
export function buildTabRecommendations(tab, me, allCandidates, teamMembers) {
  const pool = filterCandidatesByTab(tab, me, allCandidates, teamMembers);
  const finalPool = pool.length > 0 ? pool : allCandidates;

  return finalPool
    .map(candidate => {
      const score      = calcTabScore(tab, me, candidate, teamMembers);
      const breakdown  = calcBreakdown(me, candidate, teamMembers);
      const reasons    = buildConcreteReasons(me, candidate, breakdown, tab);
      const aiSummary  = buildAISummary(me, candidate, breakdown, tab, score);
      return { user: candidate, score, breakdown, reasons, aiSummary };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ─────────────────────────────────────────────
// 9-1. 세부 점수 분해 (바텀시트용)
// ─────────────────────────────────────────────
export function calcBreakdown(me, candidate, teamMembers) {
  const styleSim    = calcVectorSimilarity(me.rawAnswerVector, candidate.rawAnswerVector);
  const domainRate  = calcDomainRate(me.domains, candidate.domains);
  const prioRate    = calcPriorityRate(me.priority, candidate.priority);
  const balanceRate = calcBalanceComplement(candidate, teamMembers);

  // 도메인 일치 개수
  const normD = s => (s||'').toLowerCase().replace(/\s+/g,'').trim();
  const normB = new Set((candidate.domains||[]).map(normD));
  const commonDomains = (me.domains||[]).filter(d => normB.has(normD(d)));

  // 팀에서 부족한 성향 이름
  const TYPE_NAMES = { A:'추진형', B:'소통형', C:'탐구형', D:'실행형' };
  let lacksType = null;
  if (teamMembers?.length) {
    const avg = { A:0, B:0, C:0, D:0 };
    teamMembers.forEach(m => {
      const r = m.typeRatio||{};
      Object.keys(avg).forEach(k => { avg[k] += (r[k]||0); });
    });
    Object.keys(avg).forEach(k => { avg[k] /= teamMembers.length; });
    const sorted = Object.entries(avg).sort((a,b) => a[1]-b[1]);
    lacksType = sorted[0][0]; // 가장 부족한 유형
  }
  const candidateLacksStrong = lacksType && (candidate.typeRatio?.[lacksType]||0) > 40;

  return {
    styleSim,          // 0~100
    domainRate,        // 0~100
    domainCount: commonDomains.length,
    domainTotal: Math.max((me.domains||[]).length, 1),
    commonDomains,
    prioRate,          // 0~100
    prioMatch: me.priority === candidate.priority,
    prioSame: me.priority,
    prioOther: candidate.priority,
    balanceRate,       // 0~100
    lacksType,
    lacksTypeName: lacksType ? TYPE_NAMES[lacksType] : null,
    candidateLacksStrong,
  };
}

// ─────────────────────────────────────────────
// 9-2. 구체적 추천 이유 생성 (체크리스트)
// ─────────────────────────────────────────────
export function buildConcreteReasons(me, candidate, bd, tab) {
  const parts = [];

  // ── 팀 밸런스 보완 (balance 탭 or 유의미할 때)
  if (tab === 'balance' || (tab === 'ai' && bd.candidateLacksStrong)) {
    if (bd.lacksTypeName) {
      parts.push(`현재 팀에 부족한 ${bd.lacksTypeName} 성향을 보완할 수 있는 후보입니다.`);
    }
  }

  // ── 도메인 일치 (항상 표시, 0개면 다름 명시)
  if (bd.domainCount >= 3) {
    parts.push(`관심 도메인 3개가 모두 일치합니다. (${bd.commonDomains.slice(0,3).join(', ')})`);
  } else if (bd.domainCount === 2) {
    parts.push(`관심 도메인 ${bd.domainCount}개가 일치합니다. (${bd.commonDomains.join(', ')})`);
  } else if (bd.domainCount === 1) {
    parts.push(`관심 도메인 1개가 일치합니다. (${bd.commonDomains[0]})`);
  } else {
    parts.push('관심 도메인 일치 없음 — 다양한 시각 보완 가능합니다.');
  }

  // ── 협업 우선순위
  if (bd.prioMatch) {
    parts.push(`협업 우선순위가 동일합니다. (${bd.prioSame})`);
  } else if (bd.prioRate >= 50) {
    parts.push(`협업 우선순위가 유사합니다. (${bd.prioSame} ↔ ${bd.prioOther})`);
  } else if (bd.prioOther) {
    parts.push(`협업 우선순위가 다릅니다. (${bd.prioSame} ↔ ${bd.prioOther})`);
  }

  // ── 협업 스타일 유사도
  if (bd.styleSim >= 80) {
    parts.push(`협업 스타일 유사도 ${bd.styleSim}% — 매우 높습니다.`);
  } else if (bd.styleSim >= 60) {
    parts.push(`협업 스타일 유사도 ${bd.styleSim}%`);
  } else if (tab === 'similar' || bd.styleSim >= 40) {
    parts.push(`협업 스타일 유사도 ${bd.styleSim}%`);
  }

  return parts;
}

// ─────────────────────────────────────────────
// 9-3. AI 한 줄 요약 생성
// ─────────────────────────────────────────────
export function buildAISummary(me, candidate, bd, tab, score) {
  const parts = [];

  // 팀 밸런스 보완 여부
  if (bd.candidateLacksStrong && bd.lacksTypeName) {
    parts.push(`팀의 ${bd.lacksTypeName} 역할 공백을 채울 수 있고`);
  }

  // 도메인
  if (bd.domainCount >= 2) {
    parts.push(`관심 도메인 ${bd.domainCount}개가 겹쳐`);
  } else if (bd.domainCount === 1) {
    parts.push(`${bd.commonDomains[0]} 도메인 관심사가 일치해`);
  }

  // 우선순위
  if (bd.prioMatch) {
    parts.push(`협업 우선순위(${bd.prioSame})도 동일해`);
  } else if (bd.prioRate >= 50) {
    parts.push(`협업 방향성도 비슷해`);
  }

  // 유사도 강조
  if (tab === 'similar' && bd.styleSim >= 70) {
    parts.push(`협업 스타일이 ${bd.styleSim}%로 잘 맞아`);
  }

  if (parts.length === 0) {
    // 아무 강점도 없을 때 fallback
    return score >= 60
      ? '종합적으로 현재 팀과 잘 어울리는 팀원입니다.'
      : '다양한 시각으로 팀에 새로운 관점을 더해줄 수 있는 팀원입니다.';
  }

  const joined = parts.join(', ');
  return `${joined} 현재 팀에 잘 맞는 팀원입니다.`;
}

// ─────────────────────────────────────────────
// 10. 점수 구간 레이블
// ─────────────────────────────────────────────
export function getScoreLabel(score) {
  if (score >= 90) return { label: '완벽에 가까운 팀원', color: '#10B981' };
  if (score >= 75) return { label: '매우 잘 맞는 팀원', color: '#4F6EF7' };
  if (score >= 60) return { label: '잘 맞는 팀원',       color: '#8B5CF6' };
  if (score >= 45) return { label: '보완 관계의 팀원',   color: '#F59E0B' };
  return             { label: '도전적인 조합',            color: '#EF4444' };
}

// 매칭 적합도 레이블 (SupplementResult에서 사용)
export function getMatchLabel(score) {
  if (score >= 85) return { label: '매우 높은 적합도', color: '#10B981' };
  if (score >= 70) return { label: '높은 적합도',      color: '#4F6EF7' };
  if (score >= 55) return { label: '적합도 양호',       color: '#8B5CF6' };
  if (score >= 40) return { label: '보완 관계',         color: '#F59E0B' };
  return             { label: '참고용 추천',             color: '#94A3B8' };
}

// ─────────────────────────────────────────────
// 11. 탭별 추천 이유 자연어 생성
// ─────────────────────────────────────────────
const STYLE_DESC = {
  '빠른 실행력':        '빠른 실행과 검증을 중시해요',
  '체계적인 진행':      '체계적인 계획과 역할 분담을 중시해요',
  '다양한 아이디어':    '자유로운 아이디어 실험을 중시해요',
  '원활한 소통':        '팀원 간 활발한 소통을 중시해요',
  '높은 결과물 퀄리티': '높은 완성도의 결과물을 중시해요',
};

export function generateRecommendReason(me, other, tab, score) {
  const parts = [];

  const normD = (s) => (s || '').toLowerCase().replace(/\s+/g, '').trim();
  const otherNorm    = new Set((other.domains || []).map(normD));
  const commonDomains = (me.domains || []).filter(d => otherNorm.has(normD(d)));

  const sim      = calcVectorSimilarity(me.rawAnswerVector, other.rawAnswerVector);
  const prioRate = calcPriorityRate(me.priority, other.priority);

  switch (tab) {

    case 'ai':
      // 가장 높은 기여 요소를 앞에
      if (sim >= 70)
        parts.push('프로젝트 상황에서 비슷한 판단을 내리는 경향이 강해 호흡 맞추기가 수월해요.');
      else if (commonDomains.length >= 2)
        parts.push(`관심 도메인 ${commonDomains.join(', ')}이 여러 개 겹쳐 빠른 공감대 형성이 가능해요.`);
      else if (sim >= 50)
        parts.push('중요한 순간에 비슷한 선택을 하는 편이라 큰 방향에서 충돌이 적을 거예요.');
      else
        parts.push('서로 다른 시각으로 접근해 다양한 아이디어가 나올 수 있는 조합이에요.');
      if (commonDomains.length >= 1 && sim < 70)
        parts.push(`${commonDomains[0]} 도메인에 공통 관심사가 있어 같은 방향에서 문제를 바라볼 수 있어요.`);
      break;

    case 'domain':
      if (commonDomains.length >= 3)
        parts.push(`관심 도메인 ${commonDomains.slice(0, 3).join(', ')} 3개가 일치해 프로젝트 방향성이 완전히 맞아요.`);
      else if (commonDomains.length === 2)
        parts.push(`관심 도메인 ${commonDomains.join(', ')} 2개가 겹쳐 같은 분야에서 깊이 있는 협업이 가능해요.`);
      else if (commonDomains.length === 1)
        parts.push(`${commonDomains[0]} 도메인에서 공통 관심사를 가지고 있어요.`);
      else
        parts.push('다양한 도메인 관심사를 가지고 있어 새로운 시각을 더해줄 수 있어요.');
      if (prioRate >= 50)
        parts.push(`팀 운영 방식(\"${other.priority}\")도 비슷해 프로젝트 진행이 매끄러울 거예요.`);
      break;

    case 'similar':
      if (sim >= 80)
        parts.push(`협업 스타일 유사도 ${sim}%로 의사결정 방식이 거의 같아요.`);
      else if (sim >= 60)
        parts.push(`협업 스타일 유사도 ${sim}%로 중요한 순간에 비슷한 선택을 해요.`);
      else
        parts.push(`성향 상위 후보군으로 협업 호흡을 빠르게 맞출 수 있어요.`);
      if (commonDomains.length >= 1)
        parts.push(`${commonDomains.slice(0, 2).join(', ')} 도메인도 겹쳐 시너지를 낼 수 있어요.`);
      break;

    case 'balance':
      if (score >= 70)
        parts.push('현재 팀에서 부족한 성향을 강하게 보완해줄 수 있는 팀원이에요.');
      else
        parts.push('팀 성향 분포에서 부족한 역할을 채워줄 수 있어요.');
      if (commonDomains.length >= 1)
        parts.push(`${commonDomains[0]} 도메인 관심사도 일치해 방향성도 맞아요.`);
      if (prioRate >= 50)
        parts.push(`협업 우선순위 \"${other.priority}\"도 팀과 잘 맞아요.`);
      break;

    default:
      parts.push('종합적으로 잘 맞는 팀원이에요.');
  }

  return parts;
}

// ─────────────────────────────────────────────
// 12. 협업 강점 생성 (MatchDetail 전용)
// ─────────────────────────────────────────────
export function generateStrengths(me, other, scores) {
  const strengths = [];
  if (scores.style >= 35)
    strengths.push('프로젝트 상황에서 비슷한 판단을 해서 의사결정이 빠릅니다');
  else
    strengths.push('서로 다른 관점이 만나 더 균형 잡힌 결정을 내릴 수 있습니다');

  const combo = [me.dominantType, other.dominantType].sort().join('');
  const comboStrengths = {
    'AA': '두 분 모두 실행력이 강해 프로젝트 속도가 빠를 거예요',
    'AB': '방향 설정과 팀 분위기 관리를 자연스럽게 분담할 수 있어요',
    'AC': '빠른 실행과 깊은 분석이 균형을 이루는 팀이 됩니다',
    'AD': '목표 설정과 구현이 맞물려 데드라인 관리에 강해요',
    'BB': '팀 내 갈등 없이 협업 분위기가 좋을 거예요',
    'BC': '방향 탐색과 팀 조율이 함께 이뤄져 탄탄한 기획이 가능해요',
    'BD': '아이디어를 빠르게 만들고 팀이 함께 검증하는 사이클이 좋아요',
    'CC': '깊이 있는 리서치와 근거 기반 의사결정이 강점이에요',
    'CD': '분석 후 빠르게 실행하는 사이클이 자연스럽게 돌아가요',
    'DD': '실행 속도가 빠르고 결과물을 빠르게 만들어낼 수 있어요',
  };
  strengths.push(comboStrengths[combo] || '서로 다른 강점으로 역할을 자연스럽게 분담할 수 있어요');
  return strengths;
}

// ─────────────────────────────────────────────
// 13. 협업 팁 생성 (MatchDetail 전용)
// ─────────────────────────────────────────────
export function generateTip(me, other, scores) {
  if (scores.style <= 20)
    return '판단 기준이 많이 달라 초반에 팀의 의사결정 방식을 명확히 정해두는 걸 추천해요.';
  if (me.priority !== other.priority && scores.priority === 0) {
    const myLabel    = me.priority    || '미정';
    const otherLabel = other.priority || '미정';
    return `팀 운영 방식 선호가 달라요. \"${myLabel}\" vs \"${otherLabel}\" — 킥오프 때 서로의 기대를 충분히 공유해두면 좋아요.`;
  }
  const combo = [me.dominantType, other.dominantType].sort().join('');
  const tips = {
    'AA': '둘 다 추진력이 강해 역할 충돌이 생길 수 있어요. 초반에 담당 영역을 명확히 정해두세요.',
    'BB': '의사결정이 늦어질 수 있어요. 마감 기한을 명확히 하고 결정 권한을 나눠두세요.',
    'CC': '완벽함을 추구하다 일정이 밀릴 수 있어요. \"충분히 좋다\" 기준을 합의해두세요.',
    'DD': '빠른 실행이 강점이지만 방향 없이 달릴 수 있어요. 주기적인 방향 점검 시간을 만드세요.',
  };
  return tips[combo] || '서로의 업무 스타일을 초반에 공유하고, 중간 체크인을 정기적으로 가지면 더 좋은 팀이 될 거예요.';
}

// ─────────────────────────────────────────────
// 14. 전체 추천 리스트 (FindTeammate — AI 탭 기준)
// ─────────────────────────────────────────────
export function buildRecommendations(me, allUsers) {
  const candidates = allUsers.filter(u =>
    u.id !== me.id && u.projectCode === me.projectCode
  );
  return buildTabRecommendations('ai', me, candidates, [])
    .map(r => ({
      user:       r.user,
      scores: {
        total:    r.score,
        style:    Math.round(calcVectorSimilarity(me.rawAnswerVector, r.user.rawAnswerVector) * 0.4),
        domain:   Math.round(calcDomainRate(me.domains, r.user.domains) * 0.3),
        priority: Math.round(calcPriorityRate(me.priority, r.user.priority) * 0.2),
      },
      scoreLabel: getScoreLabel(r.score),
      reasons:    r.reasons,
      strengths:  generateStrengths(me, r.user, { style: Math.round(calcVectorSimilarity(me.rawAnswerVector, r.user.rawAnswerVector) * 0.4) }),
      tip:        generateTip(me, r.user, { style: Math.round(calcVectorSimilarity(me.rawAnswerVector, r.user.rawAnswerVector) * 0.4), priority: calcPriorityScore(me.priority, r.user.priority) }),
    }));
}
