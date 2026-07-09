/**
 * GroupHome — 그룹 허브 (탭 구조)
 *
 * 탭: 홈 | AI 추천 | 내 프로필
 * - 기본 진입 탭: AI 추천
 * - 페이지 이동 없이 selectedTab 상태로 섹션 전환
 * - 기존 컴포넌트·로직·라우터 변경 없음
 */
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useGroupStore from '../store/useGroupStore';
import useUserStore  from '../store/useUserStore';
import { TYPES }     from '../data/questions';
import { buildPersona, getAllPersonas, getPersonaRatio } from '../utils/persona';
import { buildTabRecommendations as _btr } from '../utils/balanceScoring';
import { sumRatios, calcTeamBalanceScore, getTeamScoreLabel } from '../utils/balanceScoring';
import {
  NewTeamPuzzle, FillTeamPuzzle, TeamBalancePuzzle,
} from '../components/ui/PuzzleCharacters';

/* InlineMyProfile: Persona 기반 내 프로필 (OnboardingResult와 동일) */
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

/* ── MiniDonut: 홈 탭 그룹 밸런스용 소형 도넛 — 팀원 평균 typeRatio(%) 기반 ── */
function MiniDonut({ ratioPct, score, color }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setAnimated(true),120); return ()=>clearTimeout(t); },[]);
  const KEYS = ['A','B','C','D'];
  const COLS = { A:'#EF4444', B:'#10B981', C:'#8B5CF6', D:'#F59E0B' };
  const SIZE=80, STROKE=12, R=(SIZE-STROKE)/2, CIRC=2*Math.PI*R;
  let offset=0;
  const segs = KEYS.map(k=>{
    const pct = (ratioPct[k]||0)/100;
    const len = animated ? pct*CIRC : 0;
    const seg = { k, offset:CIRC-offset, len, color:COLS[k] };
    offset += pct*CIRC;
    return seg;
  }).filter(s=>s.len>0);
  return (
    <div className="relative flex-shrink-0" style={{width:SIZE,height:SIZE}}>
      <svg width={SIZE} height={SIZE} style={{transform:'rotate(-90deg)'}}>
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE}/>
        {segs.map((s,i)=>(
          <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke={s.color} strokeWidth={STROKE}
            strokeDasharray={`${s.len} ${CIRC-s.len}`} strokeDashoffset={s.offset}
            style={{transition:'stroke-dasharray 0.8s ease-out'}}/>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-sm font-black leading-none" style={{color}}>{score}</p>
        <p className="text-[8px] text-gray-400">점</p>
      </div>
    </div>
  );
}

function ProfileDonutChart({ scores }) {
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
    (scores?.[labels.find((_,i)=>keys[i]===a)]||0)>=(scores?.[labels.find((_,i)=>keys[i]===b)]||0)?a:b,'A');

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{width:SIZE,height:SIZE}}>
        <svg width={SIZE} height={SIZE} style={{transform:'rotate(-90deg)'}}>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#F3F4F6" strokeWidth={STROKE}/>
          {segs.map((s,i)=>(
            <circle key={i} cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
              stroke={s.color} strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${CIRC-s.len}`} strokeDashoffset={s.offset}
              style={{transition:'stroke-dasharray 0.8s ease-out'}}/>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{TYPES[dominant]?.emoji}</span>
          <p className="text-[9px] text-gray-400 mt-0.5">주요 성향</p>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {keys.map((k,i)=>{
          const val = scores?.[labels[i]] || 0;
          return (
            <div key={k}>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-gray-500">{TYPES[k]?.emoji} {TYPES[k]?.name}</span>
                <span className="text-xs font-bold" style={{color:colors[k]}}>{val}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${val}%`,backgroundColor:colors[k]}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
/* ── 나의 Persona 산출 근거 설명 (실제 typeRatio 기반) ── */
function describeMyPersona(persona, typeRatio) {
  const sorted = Object.entries(typeRatio).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const [k1, v1] = sorted[0] || ['A', 0];
  const [k2, v2] = sorted[1] || [null, 0];
  const n1 = TYPES[k1]?.name;
  const n2 = k2 ? TYPES[k2]?.name : null;

  if (persona.type === 'balanced') {
    return `당신은 네 가지 성향이 비슷한 비율로 균형을 이루고 있으며, 그중 ${n1}(${v1}%)이 가장 높게 나타났습니다.`;
  }
  if (persona.type === 'dual') {
    return `당신은 ${n1} ${v1}%, ${n2} ${v2}%로 두 성향이 비슷하게 나타났습니다.`;
  }
  return `당신은 ${n1} 성향이 ${v1}%로 가장 높게 나타났습니다.`;
}

function InlineMyProfile({ member }) {
  const navigate = useNavigate();
  const [showPI, setShowPI] = useState(false);
  const [showCI, setShowCI] = useState(false);

  if (!member) return (
    <div className="text-center py-12">
      <p className="text-gray-400 text-sm">프로필 정보를 찾을 수 없어요.</p>
      <p className="text-gray-300 text-xs mt-1">성향 검사를 완료해주세요.</p>
    </div>
  );

  const p      = member.profile || {};
  const sc     = p.scores || {};
  const ratio  = { A:sc.추진||0, B:sc.소통||0, C:sc.탐구||0, D:sc.실행||0 };
  const myPersona = buildPersona(ratio);
  const type   = TYPES[p.typeKey];

  // 잘 맞는 Persona (OnboardingResult와 동일 로직)
  const me2 = {
    id: `gh_${member.name}`, name: member.name,
    groupCode: p.groupCode||'', projectCode: p.groupCode||'',
    dominantType: p.typeKey||'A',
    typeRatio: ratio,
    rawAnswerVector: p.rawAnswerVector||[],
    domains: p.domains||[], priority: p.priority||'',
  };
  // ★ useMemo로 변경 — 렌더 중 블로킹 방지 (IIFE→메모이제이션)
  const matchedPersonas = useMemo(() => {
    if (!member) return [];
    const all = getAllPersonas().filter(q=>q.key!==myPersona.key);
    const cands = all.map(q=>({
      id:`p_${q.key}`, name:q.name, groupCode:me2.groupCode, projectCode:me2.projectCode,
      dominantType: Object.entries(getPersonaRatio(q.key)).sort((a,b)=>b[1]-a[1])[0][0],
      typeRatio: getPersonaRatio(q.key),
      rawAnswerVector: me2.rawAnswerVector, domains: me2.domains, priority: me2.priority,
      _persona: q,
    }));
    return _btr('ai', me2, cands, []).slice(0,2).map(r=>({ persona:r.user._persona, score:r.score }));
  }, [member?.name, myPersona.key]); // member와 myPersona가 바뀔 때만 재계산

  const sortedRatio = Object.entries(ratio).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>0);
  const completedDate = p.completedAt
    ? new Date(p.completedAt).toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
    : '-';

  return (
    <div className="space-y-3">

      {/* ⓘ 시트 상태 */}
      {showPI && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={()=>setShowPI(false)}/>
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
            style={{animation:'sheetUp .25s cubic-bezier(.32,.72,0,1)'}}>
            <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl" style={{maxHeight:'80vh',overflowY:'auto'}}>
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
              <p className="text-base font-black text-gray-900 mb-4">Persona는 어떻게 결정되나요?</p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">TeamFit Persona는 성향검사 10문항의 응답 결과를 기반으로 생성됩니다.</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[{emoji:'🚀',name:'추진형',color:'#EF4444',bg:'#FEF2F2'},{emoji:'🤝',name:'소통형',color:'#10B981',bg:'#ECFDF5'},{emoji:'🔍',name:'탐구형',color:'#8B5CF6',bg:'#F5F3FF'},{emoji:'⚡',name:'실행형',color:'#F59E0B',bg:'#FFFBEB'}].map(t=>(
                  <div key={t.name} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{backgroundColor:t.bg}}>
                    <span className="text-lg">{t.emoji}</span><span className="text-sm font-bold" style={{color:t.color}}>{t.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">가장 높은 성향과 두 번째 성향의 조합을 기반으로 TeamFit Persona가 생성됩니다.</p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-1">나의 경우</p>
                <p className="text-sm text-gray-700 leading-relaxed mb-1">{describeMyPersona(myPersona, ratio)}</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  그 결과 <span className="font-black">{myPersona.emoji} {myPersona.name} ({myPersona.en})</span> Persona가 부여됐습니다.
                </p>
              </div>
              <button onClick={()=>setShowPI(false)} className="w-full mt-2 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">닫기</button>
            </div>
          </div>
        </>
      )}
      {showCI && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={()=>setShowCI(false)}/>
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
            style={{animation:'sheetUp .25s cubic-bezier(.32,.72,0,1)'}}>
            <div className="bg-white rounded-t-3xl pt-3 pb-10 px-5 shadow-2xl" style={{maxHeight:'80vh',overflowY:'auto'}}>
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"/>
              <p className="text-base font-black text-gray-900 mb-4">잘 맞는 Persona는 어떻게 선정되나요?</p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">잘 맞는 Persona는 내 성향 비율과 팀 선호 스타일을 기준으로, 함께 협업했을 때 시너지가 날 가능성이 높은 Persona를 추천한 결과입니다.</p>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">내가 강하게 가진 성향과 보완이 필요한 성향을 함께 고려하여 협업 방식이 잘 맞거나 서로의 부족한 부분을 채워줄 수 있는 Persona를 우선 추천합니다.</p>
              <p className="text-xs text-gray-500 leading-relaxed">이 결과는 실제 팀원 추천 시 Persona 궁합을 판단하는 참고 기준으로 사용됩니다.</p>
              <button onClick={()=>setShowCI(false)} className="w-full mt-4 py-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-600">닫기</button>
            </div>
          </div>
        </>
      )}

      {/* ① 나의 Persona 카드 */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 text-center">
        {/* ⓘ 버튼 */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">나의 Persona</p>
          <button onClick={()=>setShowPI(true)}
            className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center
              text-[9px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors"
            aria-label="Persona 선정 기준">ⓘ</button>
        </div>
        <div className="text-4xl mb-1">{myPersona.emoji}</div>
        <h2 className="text-xl font-black text-gray-900 mb-0.5">{myPersona.name}</h2>
        <p className="text-xs text-gray-400 mb-2">{myPersona.en}</p>
        <p className="text-xs text-gray-600 leading-relaxed">{myPersona.desc}</p>
      </div>

      {/* ② 나의 강점 */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">💪 나의 강점</p>
        <div className="grid grid-cols-2 gap-2">
          {myPersona.strengths.map((s,i)=>(
            <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-xs font-bold" style={{color:type?.color||'#10B981'}}>✔</span>
              <span className="text-xs text-gray-700 font-medium">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ③ 성향 비율 */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">나의 성향 비율</p>
        <div className="space-y-2">
          {sortedRatio.map(([k,v])=>{
            const t2=TYPES[k];
            return (
              <div key={k} className="flex items-center gap-2.5">
                <span className="text-sm w-14 flex items-center gap-1 flex-shrink-0">
                  <span>{t2.emoji}</span>
                  <span className="text-gray-500 font-medium text-xs">{t2.name}</span>
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${v}%`,backgroundColor:t2.color}}/>
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{color:v>0?t2.color:'#D1D5DB'}}>{v}%</span>
              </div>
            );
          })}
        </div>
      </div>



      {/* ④ 협업 팁 (잘 맞는 Persona 앞) */}
      <div className="rounded-2xl p-3.5" style={{backgroundColor:(type?.color||'#10B981')+'12',border:`1.5px solid ${type?.color||'#10B981'}20`}}>
        <p className="text-xs font-bold mb-1" style={{color:type?.color||'#10B981'}}>💡 협업 팁</p>
        <p className="text-xs text-gray-600 leading-relaxed">
          {myPersona.type==='balanced'
            ? '다양한 역할을 소화할 수 있는 강점을 활용해 팀의 빈 역할을 채워주세요.'
            : myPersona.type==='dual'
            ? '두 가지 강점을 상황에 맞게 활용하되, 약한 영역은 팀원에게 위임하는 것이 효과적이에요.'
            : '자신의 핵심 강점에 집중하면서 다른 성향의 팀원과 역할을 나누면 최고의 팀이 됩니다.'}
        </p>
      </div>

      {/* ⑤ 잘 맞는 Persona (협업팁 이후) */}
      {matchedPersonas.length > 0 && (
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
          <div className="flex items-center gap-1.5 mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">🤝 잘 맞는 Persona</p>
            <button onClick={()=>setShowCI(true)}
              className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center
                text-[9px] text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors"
              aria-label="Persona 선정 기준">ⓘ</button>
          </div>
          <div className="space-y-2">
            {matchedPersonas.map(({persona},i)=>(
              <div key={i} className="bg-gray-50 rounded-2xl px-3 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-lg">{persona.emoji}</span>
                  <div>
                    <p className="text-sm font-black text-gray-900">{persona.name}</p>
                    <p className="text-[10px] text-gray-400">{persona.en}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed bg-white rounded-xl px-2.5 py-1.5">
                  {persona.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}      {/* ⑥ 관심 도메인 */}
      {(p.domains||[]).length > 0 && (
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">🏷️ 관심 도메인</p>
          <div className="flex flex-wrap gap-2">
            {p.domains.map(d=>(
              <span key={d} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{backgroundColor:type?.bg||'#F0FDF4',color:type?.color||'#10B981'}}>{d}</span>
            ))}
          </div>
        </div>
      )}

      {/* ⑦ 분석일 */}
      <div className="bg-white rounded-3xl px-5 py-3 shadow-sm border border-gray-50 flex justify-between items-center">
        <span className="text-sm text-gray-400">마지막 분석일</span>
        <span className="text-sm font-bold text-gray-700">{completedDate}</span>
      </div>

      {/* ★ 성향 다시 검사하기 — 이름/도메인/우선순위는 유지한 채 검사만 재시작 */}
      <button
        onClick={() => {
          const { setName, setDomains, setPriority } = useUserStore.getState();
          setName(member.name);
          setDomains(p.domains || []);
          setPriority(p.priority || '');
          navigate('/onboarding/test');
        }}
        className="w-full py-3 rounded-2xl font-bold text-sm text-gray-500
          bg-white border-2 border-gray-100 hover:border-gray-200 hover:shadow-sm
          active:scale-[0.98] transition-all duration-150">
        성향 다시 검사하기
      </button>

    </div>
  );
}
/* GroupHome 메인 */
const TABS = [
  { id: 'home',    label: '홈' },
  { id: 'ai',      label: 'AI 추천' },
  { id: 'profile', label: '내 프로필' },
];

export default function GroupHome() {
  const navigate    = useNavigate();
  const groupCode   = useGroupStore(s => s.groupCode);
  const groupName   = useGroupStore(s => s.groupName);
  const isEntered   = useGroupStore(s => s.isEntered);
  const isLoading   = useGroupStore(s => s.isLoading);  // Firebase 로딩 상태
  const currentName = useGroupStore(s => s.currentName);
  const members     = useGroupStore(s => s.members);
  const getCurrentMember = useGroupStore(s => s.getCurrentMember);

  const [copied, setCopied] = useState(false);
  const location = useLocation();
  // ★ 기본 탭: 홈 / state.tab으로 특정 탭 진입 가능 (AlreadyCompleted 등)
  const [tab, setTab]         = useState(location.state?.tab || 'home');
  const [visible, setVisible] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {









  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 마운트 1회만
  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  useEffect(() => {
    // Firebase hydration 완료 전 isLoading 동안은 redirect 하지 않음
    if (isLoading) return;
    if (!isEntered) {
      navigate('/');
    }
  }, [isEntered, isLoading]); // deps: isEntered, isLoading
  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  // ★ getState() 직접 호출 제거 → members 구독 기반 useMemo 사용
  const scoringMembers = useMemo(() =>
    members
      .filter(m => m.profile?.scores)
      .map(m => {
        const p = m.profile||{}, sc = p.scores||{};
        return {
          id:m.id, name:m.name,
          groupCode, projectCode:groupCode,
          dominantType: p.typeKey||'A',
          typeRatio: { A:sc.추진||0, B:sc.소통||0, C:sc.탐구||0, D:sc.실행||0 },
          rawAnswerVector: p.rawAnswerVector||[],
          domains: p.domains||[], priority: p.priority||'',
        };
      }),
    [members, groupCode]
  );
  // ★ 그룹 전체 밸런스 카드 — 대표 Persona 인원수가 아니라 전 팀원의 typeRatio 평균으로 계산
  //   (calcTeamBalanceScore 등 서비스 전체가 쓰는 sumRatios와 동일한 소스 — 계산 방식 일관성 유지)
  const avgRatioPct = useMemo(() => {
    const sum   = sumRatios(scoringMembers);
    const total = ['A','B','C','D'].reduce((s,k) => s+sum[k], 0) || 1;
    return Object.fromEntries(['A','B','C','D'].map(k => [k, Math.round((sum[k]/total)*100)]));
  }, [scoringMembers]);
  const balanceScore   = useMemo(() => calcTeamBalanceScore(scoringMembers),  [scoringMembers]);
  const scoreLabel     = useMemo(() => getTeamScoreLabel(balanceScore),        [balanceScore]);
  const currentMember  = useMemo(() => getCurrentMember(),                     [members]);
  // ★ 현재 사용자 Persona
  const _csc = currentMember?.profile?.scores || {};
  const _cr  = { A:_csc.추진||0, B:_csc.소통||0, C:_csc.탐구||0, D:_csc.실행||0 };
  const currentPersona = currentMember ? buildPersona(_cr) : null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/group/join/${groupCode}`).catch(()=>{});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleTabChange = (id) => {




    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

    if (id === tab && id !== 'home') return;
    if (id === 'home') {
      // Home 탭: state 초기화 + 즉시 렌더링
      // location.state?.tab 잔존 시 profile 탭으로 돌아가는 것 방지
      navigate('/group-home', { replace: true, state: {} });
      setTab('home');
      setVisible(true);
    } else {
      setVisible(false);
      setTimeout(() => {
        setTab(id);
        setVisible(true);
      }, 160);
    }
  };

  // 멤버 검색 필터 (이름 / 도메인 / 성향)
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => {
      const name = (m.name || '').toLowerCase();
      const domains = (m.profile?.domains || []).join(' ').toLowerCase();
      const typeName = (TYPES[m.profile?.typeKey]?.name || '').toLowerCase();
      return name.includes(q) || domains.includes(q) || typeName.includes(q);
    });
  }, [members, memberSearch]);
  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  // Firebase 초기 로딩 중 — isEntered 판단 전 빈 화면 방지
  if (isLoading && !isEntered) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs text-gray-400">그룹 데이터를 불러오는 중...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{background:'linear-gradient(160deg,#F0FDF9 0%,#EFF6FF 55%,#F5F3FF 100%)'}}>

      {/* 상단 헤더 */}
      <div className="max-w-md mx-auto px-5 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/')}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 -ml-1 flex-shrink-0"
              aria-label="시작 화면으로">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <p className="text-xs text-gray-400">
                안녕하세요, <span className="font-semibold text-gray-700">{currentName}</span>님 👋
              </p>
            {currentPersona && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-sm">{currentPersona.emoji}</span>
                <span className="text-xs font-bold text-gray-700">{currentPersona.name}</span>
                <span className="text-xs text-gray-400">로 분석됐어요</span>
              </div>
            )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {groupName && (
              <span className="text-xs font-bold text-gray-700 max-w-[140px] truncate text-right">
                {groupName}
              </span>
            )}
            <div className="flex items-center gap-1.5 bg-white/80 border border-gray-100
              px-3 py-1.5 rounded-full shadow-sm flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-[10px] font-black text-gray-700 tracking-widest">{groupCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Segmented Tab Bar ── */}
      <div className="max-w-md mx-auto px-4 pb-3">
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                tab === t.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 — fade transition */}
      <div
        className="px-4 pb-8 max-w-md mx-auto"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.16s ease, transform 0.16s ease',
        }}>

        {tab === 'home' && (
          <div className="space-y-3">
            {/* 그룹 정보 카드 */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">그룹 참여 인원</p>
                  <p className="text-2xl font-black text-gray-900">
                    {members.length}
                    <span className="text-sm text-gray-400 font-normal ml-1">명</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                    같은 프로젝트 참여자 목록입니다.<br/>
                    팀은 기능 이용 시 직접 선택해주세요.
                  </p>
                </div>
                <button onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm
                    font-semibold transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}>
                  {copied ? '✅ 복사됨!' : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      초대 링크
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 그룹 밸런스 */}
            {members.length >= 2 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-black text-gray-900">📊 그룹 전체 밸런스</p>
                  <span className="text-[10px] text-gray-400">참고용 · 팀 아님</span>
                </div>
                <div className="flex items-center gap-4">
                  <MiniDonut ratioPct={avgRatioPct}
                    score={balanceScore} color={scoreLabel.color}/>
                  <div className="flex-1 space-y-1.5">
                    {['A','B','C','D'].map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-[10px] w-12 text-gray-500">
                          {TYPES[k].emoji} {TYPES[k].name}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${avgRatioPct[k]||0}%`,
                            backgroundColor: TYPES[k].color,
                          }}/>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 w-7 text-right">
                          {avgRatioPct[k]||0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 등급 라벨 — 다른 결과 화면과 동일한 표현을 재사용해 숫자만으로는 알기 어려운
                    "이 점수가 좋은 편인지"를 바로 알 수 있게 함 */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-500">전체 밸런스</p>
                  <span className="text-sm font-black px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: scoreLabel.color }}>{scoreLabel.label}</span>
                </div>
              </div>
            )}

            {/* 그룹 멤버 — 검색 + 고정 높이 스크롤 */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-900">
                  그룹 멤버
                  <span className="text-xs font-normal text-gray-400 ml-1.5">({members.length}명)</span>
                </p>
              </div>

              {/* 검색창 */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                  width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="이름, 도메인, 성향 검색"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-100
                    text-sm text-gray-700 placeholder-gray-300 focus:outline-none
                    focus:border-emerald-300 focus:bg-white transition-colors"
                />
                {memberSearch && (
                  <button onClick={() => setMemberSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* 고정 높이 스크롤 영역 */}
              {members.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">
                  아직 등록된 멤버가 없어요.
                </p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">
                  "{memberSearch}"와 일치하는 멤버가 없어요.
                </p>
              ) : (
                <div className="overflow-y-auto" style={{maxHeight:'280px'}}>
                  <div className="space-y-1.5 pr-0.5">
                    {[...filteredMembers]
                      .sort((a,b) => (b.profile?.completedAt||0) - (a.profile?.completedAt||0))
                      .map(m => {
                        const t = TYPES[m.profile?.typeKey];
                        // ★ 멤버 Persona 계산
                        const _sc = m.profile?.scores || {};
                        const _r  = { A:_sc.추진||0, B:_sc.소통||0, C:_sc.탐구||0, D:_sc.실행||0 };
                        const mPersona = buildPersona(_r);
                        return (
                          <div key={m.id}
                            className="bg-gray-50 rounded-2xl px-3.5 py-2.5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center
                              font-black text-xs text-white flex-shrink-0"
                              style={{backgroundColor: t?.color || '#CBD5E1'}}>
                              {m.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm text-gray-900">{m.name}</p>
                                {/* ★ 성향 배지 → Persona 배지 */}
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                                  bg-gray-100 text-gray-600">
                                  {mPersona.emoji} {mPersona.name}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {(m.profile?.domains||[]).map(d=>(
                                  <span key={d} className="text-[10px] text-gray-400 bg-white
                                    px-1.5 py-0.5 rounded-full border border-gray-100">{d}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 pt-1">
              무엇을 하고 싶나요?
            </p>

            {/* ① 나와 맞는 팀원 찾기 */}
            <button
              onClick={() => navigate('/find-teammate')}
              className="group w-full text-left bg-white rounded-3xl px-5 py-4 border-2
                border-blue-50 shadow-sm hover:shadow-md hover:-translate-y-0.5
                hover:border-blue-200 active:scale-[0.98] transition-all duration-150">
              <div className="flex items-start gap-4">
                <NewTeamPuzzle size={52}/>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm text-gray-900">나와 맞는 팀원을 찾고 싶어요</p>
                    <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">NEW TEAM</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    아직 소속된 팀이 없어요.<br/>AI가 나와 잘 맞는 그룹원을 추천해드려요.
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  className="text-gray-200 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-2">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>

            {/* ② 팀원 보충 */}
            <button
              onClick={() => navigate('/supplement/count')}
              className="group w-full text-left bg-white rounded-3xl px-5 py-4 border-2
                border-emerald-50 shadow-sm hover:shadow-md hover:-translate-y-0.5
                hover:border-emerald-200 active:scale-[0.98] transition-all duration-150">
              <div className="flex items-start gap-4">
                <FillTeamPuzzle size={52}/>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm text-gray-900">팀원을 더 보충하고 싶어요</p>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">FILL TEAM</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    현재 팀을 직접 선택하면<br/>부족한 성향의 팀원을 AI가 추천해요.
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  className="text-gray-200 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-2">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>

            {/* ③ 팀 밸런스 분석 */}
            <button
              onClick={() => navigate('/balance/count')}
              className="group w-full text-left bg-white rounded-3xl px-5 py-4 border-2
                border-purple-50 shadow-sm hover:shadow-md hover:-translate-y-0.5
                hover:border-purple-200 active:scale-[0.98] transition-all duration-150">
              <div className="flex items-start gap-4">
                <TeamBalancePuzzle size={52}/>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm text-gray-900">현재 팀의 밸런스가 궁금해요</p>
                    <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">TEAM ANALYSIS</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    현재 팀을 직접 선택하면<br/>협업 밸런스 리포트를 드려요.
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  className="text-gray-200 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-2">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
          </div>
        )}

        {tab === 'profile' && (
          <InlineMyProfile member={currentMember}/>
        )}

      </div>
    </div>
  );
}
