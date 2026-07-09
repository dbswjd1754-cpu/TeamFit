import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import { TeamFitLogo } from '../components/ui/PuzzleCharacters';
import { routeAfterGroupEntry } from '../utils/profileRouting';

export default function JoinRedirect() {
  const navigate      = useNavigate();
  const { code: pathCode } = useParams();
  const [searchParams] = useSearchParams();
  const setGroupCode   = useGroupStore(s => s.setGroupCode);
  const currentName    = useGroupStore(s => s.currentName);
  const isCurrentMemberCompleted = useGroupStore(s => s.isCurrentMemberCompleted);

  useEffect(() => {
    const raw  = pathCode || searchParams.get('code') || '';
    const code = raw.trim().toUpperCase();
    if (!code) { navigate('/', { replace:true }); return; }

    // 그룹 코드 설정 (기존 멤버 데이터 로드 포함)
    setGroupCode(code);

    // 이미 이름이 있고 해당 그룹에서 완료한 경우 → 재접속 화면
    if (currentName && isCurrentMemberCompleted()) {
      navigate('/already-completed', { replace:true });
    } else {
      // ★ 다른 그룹에서 이미 Persona를 완료했다면 재사용 — 성향검사 스킵
      routeAfterGroupEntry(navigate, { replace:true });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)' }}>
      <div className="flex flex-col items-center gap-4">
        <TeamFitLogo size={80}/>
        <p className="text-sm text-gray-400">그룹에 연결하는 중입니다</p>
        <div className="flex gap-1.5">
          {[0,1,2].map(i=>(
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              style={{animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>
          ))}
        </div>
      </div>
    </div>
  );
}
