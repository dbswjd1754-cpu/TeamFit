import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center px-6 pt-16 pb-8 max-w-md mx-auto w-full">

        {/* Brand Icon */}
        <div className="flex justify-center mb-6">
          <img
            src="/teamfit-start-icon-20260707.png"
            alt="TeamFit"
            className="w-[120px] h-auto"
          />
        </div>

        {/* Logo */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-50 px-3 py-1.5 rounded-full mb-6">
            <span className="text-brand-500 text-sm font-semibold">PM 부트캠프 팀 매칭</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
            나와 가장 잘 맞는<br />
            <span className="text-brand-500">팀원</span>을 찾아드릴게요
          </h1>
          <p className="text-gray-500 text-base leading-relaxed">
            협업 스타일, 관심 도메인, 프로젝트 우선순위를
            기반으로 최적의 팀원을 추천해드립니다.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <div className="bg-surface rounded-2xl p-4">
            <p className="text-3xl font-bold text-brand-500 mb-1">85%</p>
            <p className="text-xs text-gray-500 leading-snug">자율 팀 구성이<br />부담스럽다</p>
          </div>
          <div className="bg-surface rounded-2xl p-4">
            <p className="text-3xl font-bold text-brand-500 mb-1">90%</p>
            <p className="text-xs text-gray-500 leading-snug">추천 서비스를<br />사용하고 싶다</p>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3 mb-10">
          {[
            { step: '01', title: '협업 스타일 검사', desc: '10개의 실제 PM 프로젝트 상황에 답하세요' },
            { step: '02', title: '프로필 설정', desc: '관심 도메인과 프로젝트 우선순위를 선택하세요' },
            { step: '03', title: '팀원 추천', desc: 'Match Score와 함께 최적의 팀원을 확인하세요' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-brand-500 text-xs font-bold">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 max-w-md mx-auto w-full">
        <Button onClick={() => navigate('/group-code')}>
          팀원 찾기 시작하기 →
        </Button>
        <p className="text-center text-xs text-gray-400 mt-3">3분이면 충분해요</p>
      </div>
    </div>
  );
}
