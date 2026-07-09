/**
 * GroupEntry
 *
 * TeamFit 서비스 진입 — 반드시 팀에 속한 후 사용 가능
 *
 * 3가지 진입 방식:
 *   ① 그룹 만들기   — 새 그룹 코드 생성 → 링크 공유
 *   ② 그룹 코드 입력 — 기존 그룹 코드 직접 입력
 *   ③ 초대 링크     — /join/:code 로 자동 처리 (JoinRedirect)
 *                     /?code= 쿼리도 여기서 처리 (하위 호환)
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';
import { getUserProfileFromDB, saveGroupInfo } from '../store/groupDB';
import { buildPersona } from '../utils/persona';
import { routeAfterGroupEntry } from '../utils/profileRouting';
import MyGroupsSheet from '../components/groups/MyGroupsSheet';

const GROUP_NAME_EXAMPLES = ['PM 메이커톤 6조', '0 to 1 메이커톤', '서비스 기획 스터디'];

function generateCode() {
  const prefix = 'TF';
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}${num}`;
}

function buildInviteLink(code) {
  return `${window.location.origin}/group/join/${code}`;
}

export default function GroupEntry() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const setGroupCode   = useGroupStore(s => s.setGroupCode);
  const isEntered      = useGroupStore(s => s.isEntered);
  const currentCode    = useGroupStore(s => s.groupCode);
  const currentName    = useGroupStore(s => s.currentName);

  // 'home' | 'create-name' | 'create' | 'join'
  const [screen, setScreen] = useState('home');
  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [newCode, setNewCode]   = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMyGroups, setShowMyGroups] = useState(false);

  // ★ 이미 성향 분석을 완료한 사용자인지 — 시작 화면 "내 프로필 보기" +
  //   그룹 만들기 완료 화면의 "성향 등록 완료" 카드 노출 여부에 사용
  const [myProfile, setMyProfile] = useState(null);
  useEffect(() => {
    if (!currentName) return;
    getUserProfileFromDB(currentName).then(p => {
      if (p?.dominantType) setMyProfile(p);
    });
  }, [currentName]);
  const myPersona = myProfile ? buildPersona(myProfile.typeRatio) : null;

  /* ── 퍼즐 애니메이션 phase ──
     'assemble' : 최초 1회 맞물림 (1.0s)
     'idle'     : 10초마다 은은한 반복
     'paused'   : 탭 비활성화 시 정지
  ── */
  const [puzzlePhase, setPuzzlePhase] = useState('assemble');
  const [puzzlePaused, setPuzzlePaused] = useState(false);

  useEffect(() => {
    // assemble 완료 후 idle 전환 (0.3s delay + 1.0s duration = 1.3s 후)
    const toIdle = setTimeout(() => setPuzzlePhase('idle'), 1400);

    // 탭 visibility 변경 시 pause/resume
    const handleVisibility = () => {
      setPuzzlePaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(toIdle);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  /* ── /?code= 쿼리 자동 처리 (하위 호환) ── */
  useEffect(() => {
    const qCode = searchParams.get('code')?.trim().toUpperCase();
    if (!qCode) return;
    if (isEntered && currentCode === qCode) {
      routeAfterGroupEntry(navigate, { replace: true });
      return;
    }
    setGroupCode(qCode);
    routeAfterGroupEntry(navigate, { replace: true });
  }, []);

  /* ── ① 팀 만들기 — 그룹 이름부터 입력 ── */
  const handleCreate = () => {
    setScreen('create-name');
  };

  const handleSubmitGroupName = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) { setError('그룹 이름을 입력해주세요'); return; }
    const c = generateCode();
    setNewCode(c);
    await saveGroupInfo(c, { groupName: trimmed });
    await setGroupCode(c, trimmed);
    setError('');
    setScreen('create');
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(buildInviteLink(newCode)).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleStartOnboarding = () => {
    routeAfterGroupEntry(navigate);
  };

  /* ★ 그룹 만들기 완료 화면에서 "성향 다시 분석" — 이름/도메인/우선순위는 유지 */
  const handleRetakeFromCreate = () => {
    const { setName, setDomains, setPriority } = useUserStore.getState();
    setName(currentName);
    setDomains(myProfile?.domains || []);
    setPriority(myProfile?.priority || '');
    navigate('/onboarding/test');
  };

  /* ── ② 코드 입력 ── */
  const handleEnter = () => {
    const upper = code.trim().toUpperCase();
    if (!upper) { setError('그룹 코드를 입력해주세요'); return; }
    setGroupCode(upper);
    routeAfterGroupEntry(navigate);
  };

  /* ════════════════════════════════
     화면 렌더
  ════════════════════════════════ */
  return (
    <>
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}
    >
      <div className="w-full max-w-sm">

        {/* ── 로고 ── */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/teamfit-start-icon-20260709.png"
            alt="TeamFit"
            className="w-[100px] h-auto mx-auto"
            style={{
              animationName:
                puzzlePaused ? 'none'
                : puzzlePhase === 'assemble' ? 'puzzle-assemble'
                : 'puzzle-idle',
              animationDuration:
                puzzlePhase === 'assemble' ? '1.0s' : '11s',
              animationDelay:
                puzzlePhase === 'assemble' ? '0.3s' : '0s',
              animationIterationCount:
                puzzlePhase === 'assemble' ? '1' : 'infinite',
              animationTimingFunction:
                puzzlePhase === 'assemble'
                  ? 'cubic-bezier(0.25,0.46,0.45,0.94)'
                  : 'ease-in-out',
              animationFillMode: 'both',
            }}
          />
          <div className="flex items-baseline gap-0 mb-1">
            <span className="text-[30px] font-black text-gray-900 tracking-tight">Team</span>
            <span className="text-[30px] font-black tracking-tight" style={{ color: '#10B981' }}>Fit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-emerald-300 rounded-full" />
            <p className="text-[11px] text-gray-400 tracking-wide">잘 맞는 팀, 함께 성장하는 프로젝트</p>
            <div className="w-4 h-px bg-emerald-300 rounded-full" />
          </div>
        </div>

        <div className="w-full h-px bg-gray-100/80 mb-6" />

        {/* ════ 홈 — 진입 방식 선택 ════ */}
        {screen === 'home' && (
          <div className="flex flex-col gap-3">

            {/* ★ 내 프로필 보기 — 이미 성향 분석이 완료된 사용자만, 최상단, 카드 느낌으로 차별화 */}
            {myPersona && (
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl border-2
                  text-left mb-1 hover:shadow-md hover:-translate-y-0.5
                  active:scale-[0.98] transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%)',
                  borderColor: '#A7F3D0',
                }}
              >
                <div className="text-3xl flex-shrink-0">{myPersona.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
                    내 프로필 보기
                  </p>
                  <p className="font-black text-sm text-gray-900">{myPersona.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">내 성향 분석 결과 확인하기</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-400 flex-shrink-0">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}

            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              그룹을 선택해 시작하세요
            </p>

            {/* ① 그룹 만들기 */}
            <button
              onClick={handleCreate}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2
                border-blue-100 bg-white text-left
                hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5
                active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <img src="/icon-group-create-20260709.png" alt="" className="w-8 h-8 object-contain"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-900">그룹 만들기</p>
                <p className="text-xs text-gray-400 mt-0.5">새 그룹을 만들고 팀원을 초대해요</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-300 flex-shrink-0">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* ② 코드 입력 */}
            <button
              onClick={() => setScreen('join')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2
                border-emerald-100 bg-white text-left
                hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5
                active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <img src="/icon-group-join-20260709.png" alt="" className="w-8 h-8 object-contain"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-900">그룹 코드 입력</p>
                <p className="text-xs text-gray-400 mt-0.5">그룹 코드로 기존 그룹에 참여해요</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-300 flex-shrink-0">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* ③ 내 그룹 바로가기 */}
            <button
              onClick={() => setShowMyGroups(true)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2
                border-gray-100 bg-white text-left
                hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5
                active:scale-[0.98] transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                <img src="/icon-my-groups-20260709.png" alt="" className="w-8 h-8 object-contain"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-900">내 그룹 바로가기</p>
                <p className="text-xs text-gray-400 mt-0.5">참여했던 그룹으로 빠르게 이동해요</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-300 flex-shrink-0">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

          </div>
        )}

        {/* ════ ① 그룹 이름 입력 ════ */}
        {screen === 'create-name' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-2 tracking-widest uppercase">
                그룹 이름
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={e => { setNewGroupName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmitGroupName()}
                placeholder={GROUP_NAME_EXAMPLES[0]}
                maxLength={30}
                autoFocus
                className={`w-full bg-white border-2 rounded-2xl px-4 py-3.5 text-lg font-black
                  text-gray-800 focus:outline-none transition-all
                  ${error
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-100 focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                  }`}
              />
              {error && <p className="text-xs text-red-400 mt-1.5 ml-0.5">{error}</p>}
              <p className="text-[11px] text-gray-400 mt-2 ml-0.5">
                예: {GROUP_NAME_EXAMPLES.join(' · ')}
              </p>
            </div>

            <button
              onClick={handleSubmitGroupName}
              className="w-full py-3.5 rounded-2xl font-bold text-base text-white
                hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
            >
              다음 →
            </button>

            <button
              onClick={() => { setScreen('home'); setNewGroupName(''); setError(''); }}
              className="text-[11px] text-gray-400 underline underline-offset-2 text-center hover:text-gray-600 transition-colors"
            >
              돌아가기
            </button>
          </div>
        )}

        {/* ════ ① 그룹 만들기 완료 ════ */}
        {screen === 'create' && (
          <div className="flex flex-col gap-3">
            {/* 그룹 코드 카드 */}
            <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 text-center shadow-sm">
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-xl mx-auto mb-3">
                🎉
              </div>
              <p className="text-[10px] font-bold text-emerald-600 mb-1 tracking-widest uppercase">
                그룹 코드 생성 완료
              </p>
              {newGroupName && (
                <p className="text-sm font-bold text-gray-700 mt-1">{newGroupName}</p>
              )}
              <p className="text-4xl font-black text-gray-900 tracking-widest my-3">{newCode}</p>

              {/* 초대 링크 */}
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">초대 링크</p>
                <p className="text-xs text-gray-500 font-mono break-all leading-relaxed">
                  {buildInviteLink(newCode)}
                </p>
              </div>

              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                  text-sm font-semibold transition-all duration-200 ${
                  linkCopied
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {linkCopied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    복사됨!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    초대 링크 복사하기
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-relaxed">
              링크를 받은 팀원은 코드 입력 없이<br />바로 같은 팀으로 연결됩니다.
            </p>

            {/* ★ 이미 성향 분석이 완료된 사용자 — 재검사 없이 기존 Persona로 그룹 생성 */}
            {myPersona ? (
              <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 text-center shadow-sm">
                <p className="text-xs font-bold text-emerald-600 mb-2">✅ 내 성향 등록 완료</p>
                <div className="text-3xl mb-1">{myPersona.emoji}</div>
                <p className="font-black text-base text-gray-900 mb-1">{myPersona.name}</p>
                <p className="text-xs text-gray-400 mb-4">이 성향으로 AI 팀 추천이 진행됩니다.</p>
                <button
                  onClick={handleStartOnboarding}
                  className="w-full py-3.5 rounded-2xl font-bold text-base text-white
                    hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
                >
                  그룹 만들기
                </button>
                <button
                  onClick={handleRetakeFromCreate}
                  className="w-full mt-2.5 text-[11px] text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors"
                >
                  성향 다시 분석
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartOnboarding}
                className="w-full py-4 rounded-2xl font-bold text-base text-white
                  hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
              >
                내 성향 등록하기 →
              </button>
            )}

            <button
              onClick={() => { setScreen('home'); setNewCode(''); setNewGroupName(''); }}
              className="text-[11px] text-gray-400 underline underline-offset-2 text-center hover:text-gray-600 transition-colors"
            >
              돌아가기
            </button>
          </div>
        )}

        {/* ════ ② 코드 입력 ════ */}
        {screen === 'join' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-2 tracking-widest uppercase">
                팀 코드 입력
              </label>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleEnter()}
                placeholder=""
                maxLength={12}
                autoFocus
                className={`w-full bg-white border-2 rounded-2xl px-4 py-3.5 text-xl font-black
                  text-gray-800 focus:outline-none transition-all uppercase tracking-widest
                  ${error
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-gray-100 focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                  }`}
              />
              {error && <p className="text-xs text-red-400 mt-1.5 ml-0.5">{error}</p>}
            </div>

            <button
              onClick={handleEnter}
              className="w-full py-3.5 rounded-2xl font-bold text-base text-white
                hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
            >
              그룹 참여하기 →
            </button>

            <button
              onClick={() => { setScreen('home'); setCode(''); setError(''); }}
              className="text-[11px] text-gray-400 underline underline-offset-2 text-center hover:text-gray-600 transition-colors"
            >
              돌아가기
            </button>
          </div>
        )}

      </div>
    </div>
    {showMyGroups && <MyGroupsSheet onClose={() => setShowMyGroups(false)}/>}
    </>
  );
}
