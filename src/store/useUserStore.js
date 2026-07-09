import { create } from 'zustand';
import useGroupStore from './useGroupStore';
import {
  saveUserProfileToDB, getUserProfileFromDB,
  saveMemberToDB, getGroupInfo, recordGroupAccess,
} from './groupDB';

const useUserStore = create((set, get) => ({
  name:'', domains:[], priority:'',
  answers:[], rawAnswerVector:[],
  typeRatio:{ A:0, B:0, C:0, D:0 },
  dominantType:null, recommendations:[],

  setName: (name) => {
    set({ name });
    useGroupStore.getState().setCurrentName(name);
  },
  setDomains:  (d) => set({ domains:d }),
  setPriority: (p) => set({ priority:p }),

  addAnswer: (answer) => {
    const prev = get().answers.filter(a => a.questionId !== answer.questionId);
    set({ answers:[...prev, answer] });
  },

  finalizeTest: async () => {
    const { answers, name, domains, priority } = get();
    const sorted = [...answers].sort((a,b)=>a.questionId-b.questionId);
    const rawAnswerVector = sorted.map(a=>a.selectedKey);
    const counts = { A:0, B:0, C:0, D:0 };
    sorted.forEach(a=>{ counts[a.type]=(counts[a.type]||0)+1; });
    const total = sorted.length || 1;
    const typeRatio = {
      A: Math.round((counts.A/total)*100),
      B: Math.round((counts.B/total)*100),
      C: Math.round((counts.C/total)*100),
      D: Math.round((counts.D/total)*100),
    };
    const dominantType = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
    set({ rawAnswerVector, typeRatio, dominantType });

    const groupCode = useGroupStore.getState().groupCode;

    if (name) {
      // ★ 이 사용자가 지금까지 참여한 모든 그룹 — 재검사 전 기존 프로필 기준
      const prevProfile = await getUserProfileFromDB(name);
      const groupCodes = new Set((prevProfile?.myGroups || []).map(g => g.groupCode));
      if (groupCode) groupCodes.add(groupCode);

      // ★ 전역 Persona 프로필 갱신 — myGroups 등 기존 필드는 유지(merge)
      await saveUserProfileToDB(name, {
        dominantType, typeRatio, rawAnswerVector, domains, priority,
        completedAt: Date.now(),
      });

      // ★ 참여 중인 모든 그룹의 멤버 데이터를 동일한 최신 결과로 갱신
      //   (기존 결과와 새 결과가 혼재되지 않도록 — 항상 최신 typeRatio/dominantType로 덮어씀)
      for (const code of groupCodes) {
        const payload = {
          id:`${code}_${name}`, name, groupCode:code,
          dominantType, typeRatio, rawAnswerVector, domains, priority,
        };
        if (code === groupCode) {
          // 현재 활성 그룹 — store를 통해 저장해야 members 상태가 즉시 갱신됨
          await useGroupStore.getState().saveMember(payload);
        } else {
          await saveMemberToDB(code, payload);
        }
      }

      if (groupCode) {
        const info = await getGroupInfo(groupCode);
        await recordGroupAccess(name, { groupCode, groupName: info?.groupName || '' });
      }
    }
  },

  /* ★ 기존 전역 Persona 프로필을 그대로 적용 (재검사 없이 재사용) */
  hydrateFromProfile: (profile) => set({
    domains:         profile.domains || [],
    priority:        profile.priority || '',
    rawAnswerVector: profile.rawAnswerVector || [],
    typeRatio:       profile.typeRatio || { A:0, B:0, C:0, D:0 },
    dominantType:    profile.dominantType || null,
  }),

  setRecommendations: (recs) => set({ recommendations:recs }),

  asUser: (groupCode) => {
    const s = get();
    return {
      id:`${groupCode}_${s.name}`, name:s.name,
      groupCode, projectCode:groupCode,
      dominantType:s.dominantType, typeRatio:s.typeRatio,
      rawAnswerVector:s.rawAnswerVector, domains:s.domains, priority:s.priority,
    };
  },

  reset: () => set({
    name:'', domains:[], priority:'',
    answers:[], rawAnswerVector:[],
    typeRatio:{ A:0,B:0,C:0,D:0 },
    dominantType:null, recommendations:[],
  }),
}));

export default useUserStore;
