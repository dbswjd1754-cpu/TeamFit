/**
 * profileRouting — 그룹 진입 시 기존 Persona 재사용 여부 분기
 *
 * currentName 기준으로 전역 프로필(profiles/{name})을 조회해
 * 이미 성향검사를 완료한 사용자라면 온보딩(이름/도메인/우선순위/검사)을
 * 건너뛰고 곧바로 그룹 홈으로 이동시킨다.
 */
import useUserStore  from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import { getUserProfileFromDB, getGroupInfo, recordGroupAccess } from '../store/groupDB';

export async function routeAfterGroupEntry(navigate, { replace = false } = {}) {
  const { currentName, groupCode, saveMember } = useGroupStore.getState();

  if (!currentName) {
    navigate('/onboarding/name', { replace });
    return;
  }

  const profile = await getUserProfileFromDB(currentName);

  if (profile && profile.dominantType) {
    useUserStore.getState().hydrateFromProfile(profile);
    await saveMember({
      id:              `${groupCode}_${currentName}`,
      name:            currentName,
      groupCode,
      dominantType:    profile.dominantType,
      typeRatio:       profile.typeRatio,
      rawAnswerVector: profile.rawAnswerVector,
      domains:         profile.domains,
      priority:        profile.priority,
    });
    const info = await getGroupInfo(groupCode);
    await recordGroupAccess(currentName, { groupCode, groupName: info?.groupName || '' });
    navigate('/group-home', { replace });
    return;
  }

  navigate('/onboarding/name', { replace });
}
