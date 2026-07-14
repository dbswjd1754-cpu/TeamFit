import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GroupEntry        from './pages/GroupEntry';
import JoinRedirect      from './pages/JoinRedirect';
import AlreadyCompleted  from './pages/AlreadyCompleted';
import ProfileResult     from './pages/ProfileResult';
import OnboardingName     from './pages/OnboardingName';
import OnboardingDomain   from './pages/OnboardingDomain';
import OnboardingPriority from './pages/OnboardingPriority';
import OnboardingTest     from './pages/OnboardingTest';
import OnboardingResult   from './pages/OnboardingResult';
import GroupHome         from './pages/GroupHome';
import MyProfile         from './pages/MyProfile';
import FindTeammate      from './pages/FindTeammate';
import RecommendFeed     from './pages/RecommendFeed';
import MatchDetail       from './pages/MatchDetail';
import SupplementCount   from './pages/SupplementCount';
import SupplementSelect  from './pages/SupplementSelect';
import SupplementResult  from './pages/SupplementResult';
import AnalysisLoading   from './pages/AnalysisLoading';
import BalanceCount      from './pages/BalanceCount';
import BalanceSelect     from './pages/BalanceSelect';
import BalanceResult     from './pages/BalanceResult';
import AdminDashboard    from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 진입 */}
        <Route path="/"                       element={<GroupEntry />} />
        <Route path="/group/join/:code"       element={<JoinRedirect />} />
        <Route path="/group/join"             element={<JoinRedirect />} />

        {/* 재접속 */}
        <Route path="/already-completed"      element={<AlreadyCompleted />} />

        {/* 내 프로필 보기 (그룹 무관 — 전역 Persona) */}
        <Route path="/profile"                element={<ProfileResult />} />

        {/* 관리자 전용 — 전체 그룹/멤버 조회 */}
        <Route path="/admin"                  element={<AdminDashboard />} />

        {/* 온보딩 */}
        <Route path="/onboarding/name"        element={<OnboardingName />} />
        <Route path="/onboarding/domain"      element={<OnboardingDomain />} />
        <Route path="/onboarding/priority"    element={<OnboardingPriority />} />
        <Route path="/onboarding/test"        element={<OnboardingTest />} />
        <Route path="/onboarding/result"      element={<OnboardingResult />} />

        {/* 그룹 홈 & 프로필 */}
        <Route path="/group-home"             element={<GroupHome />} />
        <Route path="/my-profile"             element={<MyProfile />} />

        {/* 나와 맞는 팀원 찾기 */}
        <Route path="/find-teammate"          element={<FindTeammate />} />

        {/* 팀 새로 만들기 (레거시) */}
        <Route path="/recommend"              element={<RecommendFeed />} />
        <Route path="/match/:userId"          element={<MatchDetail />} />

        {/* 팀원 보충 */}
        <Route path="/supplement/count"       element={<SupplementCount />} />
        <Route path="/supplement/select"      element={<SupplementSelect />} />
        <Route path="/supplement/loading"     element={<AnalysisLoading mode="supplement" />} />
        <Route path="/supplement/result"      element={<SupplementResult />} />

        {/* 팀 밸런스 */}
        <Route path="/balance/count"          element={<BalanceCount />} />
        <Route path="/balance/select"         element={<BalanceSelect />} />
        <Route path="/balance/loading"        element={<AnalysisLoading mode="balance" />} />
        <Route path="/balance/result"         element={<BalanceResult />} />

        {/* 하위 호환 리다이렉트 */}
        <Route path="/mode-select"            element={<Navigate to="/group-home" replace />} />
        <Route path="/supplement/team-select" element={<Navigate to="/supplement/count" replace />} />
        <Route path="/supplement/balance"     element={<Navigate to="/supplement/count" replace />} />
        <Route path="/team-balance/select"    element={<Navigate to="/balance/count" replace />} />
        <Route path="/team-balance/result"    element={<Navigate to="/balance/count" replace />} />
        <Route path="/landing"                element={<Navigate to="/group-home" replace />} />
        <Route path="*"                       element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
