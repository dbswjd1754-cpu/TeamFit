/**
 * admin — 관리자 계정 판별
 *
 * 별도 권한 시스템 없이, 구글 로그인 이메일이 아래 목록에 있으면
 * 관리자로 인식한다. 화면 단에서만 막는 방식이라 완전한 서버 보안은
 * 아니며, Firestore 보안 규칙까지 잠그려면 별도 작업이 필요하다.
 */
export const ADMIN_EMAILS = ['dbswjd1754@gmail.com'];

export function isAdminUser(user) {
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}
