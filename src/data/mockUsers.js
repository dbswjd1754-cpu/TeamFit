/**
 * 테스트용 Mock 유저 데이터
 * priority 필드: OnboardingPriority의 새 선택지로 통일
 *   '빠른 실행력' | '체계적인 진행' | '다양한 아이디어' | '원활한 소통' | '높은 결과물 퀄리티'
 */
export const mockUsers = [
  {
    id: 'user_001', name: '김민준',
    projectCode: 'PM7',
    dominantType: 'A',
    typeRatio: { A: 50, B: 20, C: 20, D: 10 },
    rawAnswerVector: ['A', 'C', 'B', 'C', 'D', 'B', 'A', 'D', 'B', 'B'],
    domains: ['금융/핀테크', '이커머스'],
    priority: '빠른 실행력',
  },
  {
    id: 'user_002', name: '이서연',
    projectCode: 'PM7',
    dominantType: 'B',
    typeRatio: { A: 10, B: 50, C: 30, D: 10 },
    rawAnswerVector: ['B', 'D', 'C', 'A', 'C', 'D', 'C', 'A', 'D', 'A'],
    domains: ['교육', '헬스케어'],
    priority: '원활한 소통',
  },
  {
    id: 'user_003', name: '박지훈',
    projectCode: 'PM7',
    dominantType: 'C',
    typeRatio: { A: 10, B: 20, C: 50, D: 20 },
    rawAnswerVector: ['C', 'A', 'D', 'B', 'B', 'A', 'D', 'C', 'A', 'D'],
    domains: ['헬스케어', '커뮤니티'],
    priority: '높은 결과물 퀄리티',
  },
  {
    id: 'user_004', name: '최수아',
    projectCode: 'PM7',
    dominantType: 'D',
    typeRatio: { A: 20, B: 10, C: 20, D: 50 },
    rawAnswerVector: ['D', 'B', 'A', 'D', 'A', 'C', 'B', 'B', 'C', 'C'],
    domains: ['이커머스', '커뮤니티'],
    priority: '빠른 실행력',
  },
  {
    id: 'user_005', name: '정도윤',
    projectCode: 'PM7',
    dominantType: 'A',
    typeRatio: { A: 40, B: 20, C: 30, D: 10 },
    rawAnswerVector: ['A', 'C', 'C', 'C', 'D', 'B', 'A', 'D', 'B', 'B'],
    domains: ['금융/핀테크', '교육'],
    priority: '체계적인 진행',
  },
  {
    id: 'user_006', name: '한예진',
    projectCode: 'PM7',
    dominantType: 'B',
    typeRatio: { A: 10, B: 40, C: 20, D: 30 },
    rawAnswerVector: ['B', 'D', 'C', 'A', 'A', 'D', 'C', 'A', 'D', 'A'],
    domains: ['교육', '이커머스'],
    priority: '다양한 아이디어',
  },
  {
    id: 'user_007', name: '오승현',
    projectCode: 'PM7',
    dominantType: 'C',
    typeRatio: { A: 20, B: 10, C: 40, D: 30 },
    rawAnswerVector: ['C', 'A', 'D', 'B', 'B', 'A', 'A', 'C', 'A', 'D'],
    domains: ['SaaS', '금융/핀테크'],
    priority: '높은 결과물 퀄리티',
  },
  {
    id: 'user_008', name: '임나영',
    projectCode: 'PM6',
    dominantType: 'D',
    typeRatio: { A: 10, B: 30, C: 20, D: 40 },
    rawAnswerVector: ['D', 'B', 'A', 'D', 'A', 'C', 'D', 'B', 'C', 'C'],
    domains: ['커뮤니티', '헬스케어'],
    priority: '빠른 실행력',
  },
  {
    id: 'user_009', name: '강태양',
    projectCode: 'PM6',
    dominantType: 'A',
    typeRatio: { A: 60, B: 10, C: 20, D: 10 },
    rawAnswerVector: ['A', 'C', 'B', 'C', 'D', 'B', 'A', 'D', 'B', 'B'],
    domains: ['금융/핀테크', 'SaaS'],
    priority: '체계적인 진행',
  },
];

export const PROJECT_CODES = ['PM7', 'PM6', 'PM5', 'PM4'];
export const GROUP_CODES   = PROJECT_CODES;
