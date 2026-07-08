import { create } from 'zustand';
import useGroupStore from './useGroupStore';

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
    if (groupCode && name) {
      // Firebase에 비동기 저장
      await useGroupStore.getState().saveMember({
        id:`${groupCode}_${name}`, name, groupCode,
        dominantType, typeRatio, rawAnswerVector, domains, priority,
      });
    }
  },

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
