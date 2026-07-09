import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';
import { TYPES }     from '../data/questions';
import { buildPersona } from '../utils/persona';

const TRAITS = {
  A: ['목표를 명확히 정하고 바로 실행해요','불확실한 상황에서도 빠르게 방향을 잡아요','팀을 이끌고 추진하는 역할을 선호해요','결과를 빠르게 만드는 데 강점이 있어요'],
  B: ['팀원 간 의견을 자연스럽게 조율해요','갈등 상황에서 중재자 역할을 잘해요','협업 분위기를 따뜻하게 만들어요','모두가 참여하는 의사결정을 선호해요'],
  C: ['데이터와 근거를 먼저 확인해요','원인을 깊게 파악하고 분석해요','다양한 가능성을 검토해요','장기적인 방향을 중요하게 생각해요'],
  D: ['아이디어를 빠르게 실물로 만들어요','완벽함보다 실행 속도를 우선해요','데드라인 안에 결과물을 만드는 능력이 있어요','반복적인 검증으로 빠르게 개선해요'],
};
const AFFINITY = {
  A: ['실행형','탐구형'], B: ['소통형','실행형'],
  C: ['탐구형','소통형'], D: ['실행형','추진형'],
};
const COMPLEMENT = {
  A: '팀원의 의견을 충분히 듣는 시간이 필요해요. 빠른 실행 이전에 방향 점검을 추천드려요.',
  B: '때로는 빠른 결정이 필요한 순간도 있어요. 합의에 너무 많은 시간을 쓰지 않도록 주의해요.',
  C: '분석 후 빠르게 실행으로 이어가는 연습이 도움이 돼요. 완벽한 분석보다 충분한 분석이 중요해요.',
  D: '방향 점검 없이 달리다 보면 수정 비용이 커질 수 있어요. 주기적인 방향 확인을 추천드려요.',
};

function DonutChart({ scores }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setAnimated(true),100); return ()=>clearTimeout(t); },[]);

  const keys   = ['A','B','C','D'];
  const labels = ['추진','소통','탐구','실행'];
  const colors = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  const total  = Object.values(scores||{}).reduce((s,v)=>s+(v||0),0)||1;
  const SIZE=160, STROKE=22, R=(SIZE-STROKE)/2, CIRC=2*Math.PI*R;

  let offset=0;
  const segs = keys.map(k=>{
    const pct = (scores?.[labels.find((_,i)=>keys[i]===k)||k]||0)/total;
    const len = animated ? pct*CIRC : 0;
    const seg = { key:k, offset:CIRC-offset, len, color:colors[k] };
    offset += pct*CIRC;
    return seg;
  }).filter(s=>s.len>0);

  const dominant = keys.reduce((a,b)=>
    (scores?.[labels.find((_,i)=>keys[i]===a)]||0) >= (scores?.[labels.find((_,i)=>keys[i]===b)]||0) ? a:b, 'A');

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{width:SIZE,height:SIZE}}>
        <svg width={SIZE} height={SIZE} style={{transform:'rotate(-90deg)'}}>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE}/>
          {segs.map((s,i)=>(
            <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
              stroke={s.color} strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${CIRC-s.len}`}
              strokeDashoffset={s.offset}
              style={{transition:'stroke-dasharray 0.8s ease-out, stroke-dashoffset 0.8s ease-out'}}/>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{TYPES[dominant]?.emoji}</span>
          <p className="text-xs text-gray-400 mt-0.5">주요 성향</p>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {keys.map((k,i)=>{
          const label=labels[i];
          const val=scores?.[label]||0;
          return (
            <div key={k}>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-gray-500">{TYPES[k]?.emoji} {TYPES[k]?.name}</span>
                <span className="text-xs font-bold" style={{color:colors[k]}}>{val}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{width:`${val}%`,backgroundColor:colors[k]}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyProfile() {
  const navigate   = useNavigate();
  const groupCode  = useGroupStore(s => s.groupCode);
  const isEntered  = useGroupStore(s => s.isEntered);
  const getCurrentMember = useGroupStore(s => s.getCurrentMember);

  useEffect(() => {
    if (!isEntered) { navigate('/'); return; }
  }, []);

  const member = getCurrentMember();
  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5"
        style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>
        <div className="text-center">
          <p className="text-gray-500 mb-4">프로필을 찾을 수 없어요.</p>
          <button onClick={()=>navigate('/group-home')}
            className="text-emerald-600 font-semibold underline">그룹 홈으로</button>
        </div>
      </div>
    );
  }

  const p      = member.profile || {};
  const type   = TYPES[p.typeKey];
  const traits = TRAITS[p.typeKey] || [];
  const affinity = AFFINITY[p.typeKey] || [];
  const complement = COMPLEMENT[p.typeKey] || '';

  // ★ 성향 다시 검사하기 — 이름/도메인/우선순위는 유지한 채 검사만 재시작
  const handleRetake = () => {
    const { setName, setDomains, setPriority } = useUserStore.getState();
    setName(member.name);
    setDomains(p.domains || []);
    setPriority(p.priority || '');
    navigate('/onboarding/test');
  };

  // ★ Persona 계산 (OnboardingResult와 동일 로직)
  const _sc = p.scores || {};
  const _r  = { A:_sc.추진||0, B:_sc.소통||0, C:_sc.탐구||0, D:_sc.실행||0 };
  const persona = buildPersona(_r);
  const completedDate = p.completedAt
    ? new Date(p.completedAt).toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
    : '-';

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>

      {/* 헤더 */}
      <div className="max-w-md mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={()=>navigate('/group-home')}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <p className="text-base font-black text-gray-900">내 성향 프로필</p>
          <div className="ml-auto flex items-center gap-1.5 bg-white/80 border border-gray-100 px-2.5 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
            <span className="text-[10px] font-black text-gray-700">{groupCode}</span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 max-w-md mx-auto space-y-3">

        {/* ① 프로필 카드 — Persona 중심 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 text-center">
          <div className="text-5xl mb-2">{persona.emoji}</div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            나의 Persona
          </p>
          <h2 className="text-2xl font-black text-gray-900 mb-0.5">{persona.name}</h2>
          <p className="text-xs text-gray-400 mb-1">{persona.en}</p>
          <p className="text-sm text-gray-500">{member.name}</p>
        </div>

        {/* ② 도넛 그래프 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-4">📊 성향 분포</p>
          <DonutChart scores={p.scores}/>
        </div>

        {/* ③ 나의 특징 */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-3">✨ 나의 특징</p>
          <div className="space-y-2">
            {traits.map((t,i)=>(
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{backgroundColor:type?.bg}}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke={type?.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ④ 나의 강점 (Persona 기반) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm font-black text-gray-900 mb-3">💪 나의 강점</p>
          <div className="grid grid-cols-2 gap-2">
            {persona.strengths.map((s,i)=>(
              <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-bold" style={{color:type?.color||'#10B981'}}>✔</span>
                <span className="text-xs text-gray-700 font-medium">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ⑤ 보완 팁 */}
        <div className="rounded-2xl p-4 border border-amber-100 bg-amber-50">
          <p className="text-sm font-black text-amber-800 mb-2">💡 보완하면 좋은 점</p>
          <p className="text-sm text-amber-700 leading-relaxed">{complement}</p>
        </div>

        {/* ⑥ 관심 도메인 */}
        {(p.domains||[]).length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
            <p className="text-sm font-black text-gray-900 mb-3">🏷️ 관심 도메인</p>
            <div className="flex flex-wrap gap-2">
              {p.domains.map(d=>(
                <span key={d} className="px-3 py-1.5 rounded-xl text-sm font-semibold"
                  style={{backgroundColor:type?.bg, color:type?.color}}>{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* ⑦ 분석일 */}
        <div className="bg-white rounded-3xl px-5 py-4 shadow-sm border border-gray-50 flex justify-between items-center">
          <span className="text-sm text-gray-400">마지막 분석일</span>
          <span className="text-sm font-bold text-gray-700">{completedDate}</span>
        </div>

        {/* 하단 버튼 */}
        <button onClick={()=>navigate('/group-home')}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
            hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          style={{background:'linear-gradient(135deg,#10B981 0%,#3B82F6 100%)'}}>
          그룹 홈으로 →
        </button>
        <button onClick={handleRetake}
          className="w-full py-3 rounded-2xl font-bold text-sm text-gray-500
            bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-sm
            active:scale-[0.98] transition-all duration-150">
          성향 다시 검사하기
        </button>
      </div>
    </div>
  );
}
