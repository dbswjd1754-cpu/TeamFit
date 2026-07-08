/**
 * persona.js — TeamFit Persona System
 *
 * Persona는 사용자의 성향 비율을 기반으로 동적으로 생성됩니다.
 * MBTI처럼 고정 유형이 아니며, 비율 계산 결과에 따라 달라집니다.
 *
 * 생성 규칙:
 *   ① Dominant  — 1위 성향 40% 이상 + 2위보다 10%p 이상 차이 → 단일 Persona
 *   ② Dual      — 1·2위 차이 5%p 이하 → 조합 Persona
 *   ③ Balanced  — 4개 성향 균등 (최대-최소 차이 15% 미만) → 올라운더
 *   (기본)        → 1위 기준 단일 Persona
 */

// ── 단일 성향 Persona ─────────────────────────────────────────
const SINGLE_PERSONA = {
  A: {
    name: '선도하는 개척자',
    en:   'Project Pioneer',
    emoji: '🚀',
    desc: '모호한 상황에서도 먼저 방향을 잡고 팀을 이끄는 협업 스타일입니다. 빠른 의사결정으로 프로젝트에 추진력을 불어넣습니다.',
    strengths: ['방향 설정', '의사결정', '목표 중심 실행', '프로젝트 추진'],
  },
  B: {
    name: '팀을 잇는 조율자',
    en:   'Team Connector',
    emoji: '🤝',
    desc: '팀원 모두의 의견을 경청하고 협업 분위기를 만드는 협업 스타일입니다. 갈등 상황에서 자연스럽게 중재자 역할을 합니다.',
    strengths: ['의견 조율', '협업 분위기 형성', '팀 관계 관리', '갈등 중재'],
  },
  C: {
    name: '깊이 파는 탐험가',
    en:   'Deep Explorer',
    emoji: '🔍',
    desc: '데이터와 근거를 바탕으로 문제의 본질을 파악하는 협업 스타일입니다. 분석으로 팀의 의사결정 품질을 높입니다.',
    strengths: ['데이터 분석', '문제 해결', '꼼꼼한 검토', '의사결정 근거 생성'],
  },
  D: {
    name: '빠르게 실행하는 제작자',
    en:   'Swift Builder',
    emoji: '⚡',
    desc: '아이디어를 빠르게 실물로 만들고 검증하는 협업 스타일입니다. 완벽함보다 진행을 우선해 팀의 속도를 높입니다.',
    strengths: ['빠른 실행', '프로토타입 제작', '데드라인 준수', '실행 완성도'],
  },
};

// ── 조합 Persona (상위 2개 성향 조합) ────────────────────────
const DUAL_PERSONA = {
  AB: { name: '균형 잡힌 리더',     en: 'Balanced Leader',        emoji: '🚀🤝', desc: '방향을 제시하면서도 팀원과의 협업을 중요하게 생각하는 균형형 리더 스타일입니다.', strengths: ['방향 설정', '팀 합의 도출', '의견 조율', '협업 추진'] },
  AC: { name: '전략 설계자',         en: 'Strategic Architect',    emoji: '🚀🔍', desc: '빠른 추진력과 깊은 분석을 결합해 근거 있는 방향을 만드는 협업 스타일입니다.', strengths: ['전략 수립', '방향 설정', '근거 기반 의사결정', '문제 해결'] },
  AD: { name: '실행하는 리더',       en: 'Executing Leader',       emoji: '🚀⚡', desc: '방향 설정부터 실행까지 직접 이끄는 강한 추진형 협업 스타일입니다.', strengths: ['방향 설정', '빠른 실행', '의사결정', '목표 달성'] },
  BC: { name: '신중한 협력자',       en: 'Thoughtful Collaborator',emoji: '🤝🔍', desc: '팀과 긴밀하게 소통하면서 데이터 기반으로 의사결정을 돕는 협업 스타일입니다.', strengths: ['팀 소통', '분석적 지원', '꼼꼼한 검토', '갈등 중재'] },
  BD: { name: '함께 만드는 실행가',  en: 'Collaborative Builder',  emoji: '🤝⚡', desc: '팀원과 함께 빠르게 만들고 검증하는 실행 중심 협업 스타일입니다.', strengths: ['협업 실행', '빠른 프로토타입', '팀 분위기', '완성도 관리'] },
  CD: { name: '완성형 전문가',       en: 'Polished Expert',        emoji: '🔍⚡', desc: '충분한 분석 후 빠르게 실행하는 완성도 높은 협업 스타일입니다.', strengths: ['데이터 기반 실행', '문제 해결', '품질 관리', '빠른 검증'] },
};

// ── 올라운더 ──────────────────────────────────────────────────
const BALANCED_PERSONA = {
  name: '올라운더',
  en:   'All-rounder',
  emoji: '🌈',
  desc: '상황에 따라 리더와 서포터 역할을 모두 수행할 수 있는 유연한 협업 스타일입니다. 어떤 팀에서도 적응력이 뛰어납니다.',
  strengths: ['역할 유연성', '상황 적응', '팀 균형 유지', '다양한 협업 스타일'],
};

/**
 * buildPersona(typeRatio) → Persona 객체
 * @param {{ A:number, B:number, C:number, D:number }} typeRatio  — 합계 ≈ 100
 */
export function buildPersona(typeRatio) {
  const entries = Object.entries(typeRatio)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return { ...SINGLE_PERSONA.A, key:'A', type:'single' };

  const [[k1, v1], [k2, v2] = ['', 0]] = entries;

  // ③ Balanced — 최대-최소 차이 15% 미만
  const vals = entries.map(([,v])=>v);
  if (vals.length >= 3 && (vals[0] - vals[vals.length-1]) < 15) {
    return { ...BALANCED_PERSONA, key:'BALANCED', type:'balanced' };
  }

  // ② Dual — 1·2위 차이 5%p 이하
  if (k2 && Math.abs(v1 - v2) <= 5) {
    const dualKey = [k1,k2].sort().join('');
    const dual = DUAL_PERSONA[dualKey] || DUAL_PERSONA[[k2,k1].sort().join('')];
    if (dual) return { ...dual, key: dualKey, type: 'dual' };
  }

  // ① Dominant — 1위 40%+ 이며 2위보다 10%p 이상
  if (v1 >= 40 && (!k2 || v1 - v2 >= 10)) {
    return { ...SINGLE_PERSONA[k1], key: k1, type: 'single' };
  }

  // 기본 — 1위 기준 단일
  return { ...SINGLE_PERSONA[k1], key: k1, type: 'single' };
}

/**
 * 모든 Persona 목록 (잘 맞는 Persona 후보용)
 */
export function getAllPersonas() {
  const singles  = Object.entries(SINGLE_PERSONA).map(([k,p])  => ({...p, key:k,         type:'single'}));
  const duals    = Object.entries(DUAL_PERSONA).map(([k,p])    => ({...p, key:k,         type:'dual'}));
  const balanced = { ...BALANCED_PERSONA, key:'BALANCED', type:'balanced' };
  return [...singles, ...duals, balanced];
}

/**
 * Persona 대표 typeRatio — "잘 맞는 Persona" 계산 시 가상 사용자 프로필 생성용
 * key별 중심 성향 비율 반환
 */
export function getPersonaRatio(key) {
  const MAP = {
    A:        { A:65, B:15, C:12, D:8  },
    B:        { A:10, B:65, C:15, D:10 },
    C:        { A:10, B:15, C:65, D:10 },
    D:        { A:10, B:10, C:15, D:65 },
    AB:       { A:40, B:40, C:12, D:8  },
    AC:       { A:40, B:8,  C:42, D:10 },
    AD:       { A:42, B:8,  C:8,  D:42 },
    BC:       { A:8,  B:42, C:40, D:10 },
    BD:       { A:8,  B:42, C:10, D:40 },
    CD:       { A:8,  B:10, C:42, D:40 },
    BALANCED: { A:25, B:25, C:25, D:25 },
  };
  return MAP[key] || { A:25, B:25, C:25, D:25 };
}
