import { create } from 'zustand';

/**
 * "팀원 보충" 플로우 전용 상태
 * groupCode는 useGroupStore에서 읽음
 */
const useTeamStore = create((set, get) => ({
  currentTeam: [],
  balanceResult: null,
  supplements: [],

  setTeam: (team) => set({ currentTeam: team }),
  toggleMember: (userId) => {
    const current = get().currentTeam;
    set({
      currentTeam: current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId],
    });
  },
  setBalanceResult: (r) => set({ balanceResult: r }),
  setSupplements: (l) => set({ supplements: l }),
  reset: () => set({ currentTeam: [], balanceResult: null, supplements: [] }),
}));

export default useTeamStore;
