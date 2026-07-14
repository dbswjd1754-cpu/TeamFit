/**
 * groupDB v6 — Firebase Firestore 기반 공용 저장소
 *
 * Firestore 구조:
 *   groups/{groupCode}                — 그룹 메타 정보 (groupName, createdAt)
 *   groups/{groupCode}/members/{memberId}
 *   groups/{groupCode}/domains/{domainId}
 *   profiles/{name}                   — 그룹과 무관한 전역 사용자 Persona 프로필
 *     .myGroups: [{ groupCode, groupName, joinedAt, lastAccessAt }]
 *
 * 오프라인 fallback:
 *   Firebase 연결 실패 시 localStorage로 자동 전환
 */

import { db } from '../firebase';
import {
  doc, getDoc, setDoc, getDocs, deleteDoc,
  collection, onSnapshot, serverTimestamp,
} from 'firebase/firestore';

const TYPE_NAMES = { A:'추진형', B:'소통형', C:'탐구형', D:'실행형' };

// ── 세션 ─────────────────────────────────────
const SESSION_KEY = 'teamfit_session_v3';
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
}
export function saveSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

// ── Firebase 사용 가능 여부 ───────────────────
function isFirebaseReady() {
  return db !== null && db !== undefined;
}

// ── localStorage: 멤버 ────────────────────────
const LS_KEY = 'teamfit_groups_v5';
function lsReadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function lsWriteAll(d) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
}
function lsGetMembers(groupCode) {
  return Object.values(lsReadAll()[groupCode]?.members || {});
}
function lsSaveMember(groupCode, member) {
  const all = lsReadAll();
  if (!all[groupCode]) all[groupCode] = { members: {} };
  all[groupCode].members[member.id] = member;
  lsWriteAll(all);
}
function lsGetMemberByName(groupCode, name) {
  return lsGetMembers(groupCode).find(m => m.name === name) || null;
}

// ── localStorage: 커스텀 도메인 ──────────────
const LS_DOMAIN_KEY = 'teamfit_domains_v2';

function lsGetDomains(groupCode) {
  try {
    return JSON.parse(localStorage.getItem(LS_DOMAIN_KEY) || '{}')[groupCode] || [];
  } catch { return []; }
}

function lsSaveDomains(groupCode, domains) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_DOMAIN_KEY) || '{}');
    all[groupCode] = domains;
    localStorage.setItem(LS_DOMAIN_KEY, JSON.stringify(all));
  } catch {}
}

// 단일 도메인 추가 (중복 label 방지 — normalize 비교)
function lsAddDomain(groupCode, domain) {
  const norm = s => (s||'').toLowerCase().replace(/\s+/g,'').trim();
  const existing = lsGetDomains(groupCode);
  const isDup = existing.some(d => norm(d.label) === norm(domain.label));
  if (isDup) return existing;
  const updated = [...existing, domain];
  lsSaveDomains(groupCode, updated);
  return updated;
}

// ── Firestore: 멤버 저장 ─────────────────────
export async function saveMemberToDB(groupCode, rawMember) {
  if (!groupCode || !rawMember?.name) return;
  const tr = rawMember.typeRatio || {};
  const member = {
    id:      rawMember.id || `${groupCode}_${rawMember.name}`,
    name:    rawMember.name,
    groupCode,
    profile: {
      type:            TYPE_NAMES[rawMember.dominantType] || rawMember.dominantType,
      typeKey:         rawMember.dominantType,
      scores:          { 추진: tr.A||0, 소통: tr.B||0, 탐구: tr.C||0, 실행: tr.D||0 },
      domains:         rawMember.domains || [],
      priority:        rawMember.priority || '',
      rawAnswerVector: rawMember.rawAnswerVector || [],
      completed:       true,
      completedAt:     Date.now(),
    },
  };

  if (isFirebaseReady()) {
    try {
      await setDoc(
        doc(db, 'groups', groupCode, 'members', member.id),
        { ...member, updatedAt: serverTimestamp() }
      );
      lsSaveMember(groupCode, member);
      return member;
    } catch (e) {
      console.warn('[groupDB] Firestore 저장 실패, localStorage fallback:', e.message);
    }
  }

  lsSaveMember(groupCode, member);
  return member;
}

// ── Firestore: 멤버 삭제 (그룹 나가기 — 해당 그룹에서 내 데이터만 제거) ──
export async function deleteMemberFromDB(groupCode, memberId) {
  if (!groupCode || !memberId) return;

  const all = lsReadAll();
  if (all[groupCode]?.members?.[memberId]) {
    delete all[groupCode].members[memberId];
    lsWriteAll(all);
  }

  if (isFirebaseReady()) {
    try {
      await deleteDoc(doc(db, 'groups', groupCode, 'members', memberId));
    } catch (e) {
      console.warn('[groupDB] 멤버 삭제 실패:', e.message);
    }
  }
}

// ── Firestore: 멤버 목록 조회 ────────────────
export async function getMembersFromDB(groupCode) {
  if (!groupCode) return [];

  if (isFirebaseReady()) {
    try {
      const snap = await getDocs(collection(db, 'groups', groupCode, 'members'));
      const members = snap.docs.map(d => d.data());
      members.forEach(m => lsSaveMember(groupCode, m));
      return members;
    } catch (e) {
      console.warn('[groupDB] Firestore 읽기 실패, localStorage fallback:', e.message);
    }
  }

  return lsGetMembers(groupCode);
}

// ── Firestore: 멤버 실시간 구독 ──────────────
export function subscribeMembers(groupCode, callback) {
  if (!groupCode) return () => {};

  if (isFirebaseReady()) {
    try {
      const unsub = onSnapshot(
        collection(db, 'groups', groupCode, 'members'),
        (snap) => {
          const members = snap.docs.map(d => d.data());
          members.forEach(m => lsSaveMember(groupCode, m));
          callback(members);
        },
        (err) => {
          console.warn('[groupDB] 실시간 구독 실패:', err.message);
          callback(lsGetMembers(groupCode));
        }
      );
      return unsub;
    } catch (e) {
      console.warn('[groupDB] 구독 초기화 실패:', e.message);
    }
  }

  callback(lsGetMembers(groupCode));
  return () => {};
}

// ── Firestore: 커스텀 도메인 실시간 구독 ──────
// 같은 그룹 다른 사용자가 등록한 도메인을 실시간으로 수신
export function subscribeDomains(groupCode, callback) {
  if (!groupCode) return () => {};

  if (isFirebaseReady()) {
    try {
      const unsub = onSnapshot(
        collection(db, 'groups', groupCode, 'domains'),
        (snap) => {
          const domains = snap.docs.map(d => d.data());
          // 로컬 캐시 전체 갱신 (Firebase가 source of truth)
          lsSaveDomains(groupCode, domains);
          callback(domains);
        },
        (err) => {
          console.warn('[groupDB] 도메인 구독 실패:', err.message);
          callback(lsGetDomains(groupCode));
        }
      );
      return unsub;
    } catch (e) {
      console.warn('[groupDB] 도메인 구독 초기화 실패:', e.message);
    }
  }

  // Firebase 없을 때: 현재 로컬 상태 즉시 반환
  callback(lsGetDomains(groupCode));
  return () => {};
}

// ── 커스텀 도메인 저장 ────────────────────────
// 1) localStorage 즉시 저장 (동기, 즉각 반영)
// 2) Firebase 비동기 저장 (다른 기기 실시간 공유)
export async function saveCustomDomainToDB(groupCode, domain) {
  // localStorage 먼저 — 즉각 UI 반영
  lsAddDomain(groupCode, domain);

  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'groups', groupCode, 'domains', domain.id), domain);
    } catch (e) {
      console.warn('[groupDB] 도메인 Firebase 저장 실패 (로컬은 저장됨):', e.message);
    }
  }
}

// ── 커스텀 도메인 동기 조회 (초기값용) ────────
export function getCustomDomainsFromDB(groupCode) {
  return lsGetDomains(groupCode);
}

// ── 전역 사용자 Persona 프로필 (그룹 무관) ────
// 한 번 성향검사를 완료하면 이름 기준으로 저장되어,
// 다른 그룹을 만들거나 참여할 때 재사용됩니다.
const LS_PROFILE_KEY = 'teamfit_profile_v1';

function lsGetProfile(name) {
  if (!name) return null;
  try { return JSON.parse(localStorage.getItem(LS_PROFILE_KEY) || '{}')[name] || null; } catch { return null; }
}
// ★ merge — 기존 필드(예: myGroups)를 지우지 않고 부분 갱신
function lsMergeProfile(name, patch) {
  if (!name) return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_PROFILE_KEY) || '{}');
    all[name] = { ...(all[name] || {}), ...patch };
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(all));
  } catch {}
}

// ★ merge:true — typeRatio만 갱신해도 myGroups 등 다른 필드가 지워지지 않음
export async function saveUserProfileToDB(name, profile) {
  if (!name) return;
  lsMergeProfile(name, profile);

  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'profiles', name), { ...profile, name, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('[groupDB] 전역 프로필 Firestore 저장 실패 (로컬은 저장됨):', e.message);
    }
  }
}

export async function getUserProfileFromDB(name) {
  if (!name) return null;

  if (isFirebaseReady()) {
    try {
      const snap = await getDoc(doc(db, 'profiles', name));
      if (snap.exists()) {
        const data = snap.data();
        lsMergeProfile(name, data);
        return data;
      }
      // ★ self-heal — Firestore엔 없지만 로컬 캐시에 있으면 즉시 복구해 저장
      //   (그렇지 않으면 이후 부분 필드만 merge 저장할 때 나머지 필드가 없는
      //    불완전한 문서가 그대로 생성되어버림)
      const cached = lsGetProfile(name);
      if (cached) {
        try {
          await setDoc(doc(db, 'profiles', name), { ...cached, name, updatedAt: serverTimestamp() }, { merge: true });
        } catch (e2) {
          console.warn('[groupDB] 전역 프로필 복구 저장 실패:', e2.message);
        }
        return cached;
      }
      return null;
    } catch (e) {
      console.warn('[groupDB] 전역 프로필 Firestore 읽기 실패, localStorage fallback:', e.message);
    }
  }

  return lsGetProfile(name);
}

// ── 그룹 메타 정보 (그룹 이름) ────────────────
// 기존 groupCode 로직은 그대로 유지 — groupName은 groups/{code} 루트 문서에 추가 저장
const LS_GROUPINFO_KEY = 'teamfit_groupinfo_v1';

function lsGetGroupInfo(code) {
  if (!code) return null;
  try { return JSON.parse(localStorage.getItem(LS_GROUPINFO_KEY) || '{}')[code] || null; } catch { return null; }
}
function lsSaveGroupInfo(code, info) {
  if (!code) return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_GROUPINFO_KEY) || '{}');
    all[code] = { ...(all[code] || {}), ...info };
    localStorage.setItem(LS_GROUPINFO_KEY, JSON.stringify(all));
  } catch {}
}

// 그룹 생성 시 1회 호출 — groupName + createdAt 저장
export async function saveGroupInfo(code, { groupName }) {
  if (!code) return;
  const info = { groupCode: code, groupName: groupName || '' };
  lsSaveGroupInfo(code, { ...info, createdAt: Date.now() });

  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'groups', code), { ...info, createdAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn('[groupDB] 그룹 메타 Firestore 저장 실패 (로컬은 저장됨):', e.message);
    }
  }
}

export async function getGroupInfo(code) {
  if (!code) return null;

  if (isFirebaseReady()) {
    try {
      const snap = await getDoc(doc(db, 'groups', code));
      if (snap.exists()) {
        const data = snap.data();
        lsSaveGroupInfo(code, data);
        return data;
      }
    } catch (e) {
      console.warn('[groupDB] 그룹 메타 Firestore 읽기 실패, localStorage fallback:', e.message);
    }
  }

  // ★ 기존(그룹 이름 필드 도입 전) 그룹과의 호환 — 문서 없으면 null 반환, 호출부에서 groupCode로 대체 표시
  return lsGetGroupInfo(code);
}

// ── 로그인 계정 ↔ 기존 이름(name) 연결 ─────────
// authLinks/{uid} = { name, linkedAt }                (uid → name, 로그인 시 자동으로 어떤 이름인지 찾는 용도)
// profiles/{name}.linkedUid = uid                      (name → uid, 다른 계정이 같은 이름을 가로채지 못하게 막는 용도)
const LS_AUTHLINK_KEY = 'teamfit_authlink_v1';

function lsGetAuthLink(uid) {
  if (!uid) return null;
  try { return JSON.parse(localStorage.getItem(LS_AUTHLINK_KEY) || '{}')[uid] || null; } catch { return null; }
}
function lsSaveAuthLink(uid, link) {
  if (!uid) return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_AUTHLINK_KEY) || '{}');
    all[uid] = link;
    localStorage.setItem(LS_AUTHLINK_KEY, JSON.stringify(all));
  } catch {}
}

// 이 로그인 계정(uid)이 이미 어떤 이름과 연결되어 있는지 조회
export async function getLinkedNameForUid(uid) {
  if (!uid) return null;

  if (isFirebaseReady()) {
    try {
      const snap = await getDoc(doc(db, 'authLinks', uid));
      if (snap.exists()) {
        const data = snap.data();
        lsSaveAuthLink(uid, data);
        return data.name || null;
      }
      return null;
    } catch (e) {
      console.warn('[groupDB] 계정 연결 조회 실패, localStorage fallback:', e.message);
    }
  }

  return lsGetAuthLink(uid)?.name || null;
}

// 이 이름이 이미 "다른" 계정에 연결되어 있는지 확인 (있으면 그 uid 반환)
export async function getLinkedUidForName(name) {
  if (!name) return null;
  const profile = await getUserProfileFromDB(name);
  return profile?.linkedUid || null;
}

// 로그인 계정과 이름을 연결(claim) — 기존 이름 데이터는 그대로 두고 연결만 추가
export async function linkAuthToName(uid, name) {
  if (!uid || !name) return;
  const link = { name, linkedAt: Date.now() };
  lsSaveAuthLink(uid, link);

  if (isFirebaseReady()) {
    try {
      await setDoc(doc(db, 'authLinks', uid), { ...link, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('[groupDB] 계정 연결 저장 실패 (로컬은 저장됨):', e.message);
    }
  }

  // profiles/{name} 쪽에도 역방향 연결 기록 (다른 계정이 같은 이름을 가로채지 못하도록)
  await saveUserProfileToDB(name, { linkedUid: uid });
}

// 로그인 해제 — 계정↔이름 연결 자체는 유지 (다음에 로그인하면 다시 자동 연결됨)
export function clearAuthLinkCache(uid) {
  if (!uid) return;
  try {
    const all = JSON.parse(localStorage.getItem(LS_AUTHLINK_KEY) || '{}');
    delete all[uid];
    localStorage.setItem(LS_AUTHLINK_KEY, JSON.stringify(all));
  } catch {}
}

// ── 내 그룹 목록 (profiles/{name}.myGroups) ──────
// 그룹 생성/참여/재입장 시마다 호출 — 없으면 추가, 있으면 lastAccessAt만 갱신
export async function recordGroupAccess(name, { groupCode, groupName }) {
  if (!name || !groupCode) return;
  const existing = (await getUserProfileFromDB(name)) || {};
  const groups = Array.isArray(existing.myGroups) ? [...existing.myGroups] : [];
  const now = Date.now();
  const idx = groups.findIndex(g => g.groupCode === groupCode);
  if (idx >= 0) {
    groups[idx] = { ...groups[idx], groupName: groupName || groups[idx].groupName, lastAccessAt: now };
  } else {
    groups.push({ groupCode, groupName: groupName || '', joinedAt: now, lastAccessAt: now });
  }
  await saveUserProfileToDB(name, { myGroups: groups });
}

// 내 그룹 목록에서 특정 그룹 제거
async function removeGroupFromMyGroups(name, groupCode) {
  if (!name || !groupCode) return;
  const existing = (await getUserProfileFromDB(name)) || {};
  const groups = (Array.isArray(existing.myGroups) ? existing.myGroups : [])
    .filter(g => g.groupCode !== groupCode);
  await saveUserProfileToDB(name, { myGroups: groups });
}

// ── 그룹 나가기 — 해당 그룹의 내 멤버 데이터 삭제 + 내 그룹 목록에서 제거 ──
// (그룹 자체나 다른 멤버의 데이터는 건드리지 않음 — 나가는 사람의 흔적만 지움)
export async function leaveGroup(name, groupCode) {
  if (!name || !groupCode) return;
  const memberId = `${groupCode}_${name}`;
  await deleteMemberFromDB(groupCode, memberId);
  await removeGroupFromMyGroups(name, groupCode);
}

// 동기 조회 (캐시 우선) — 시작 화면 등에서 즉시 렌더용
export function getMyGroupsCached(name) {
  return lsGetProfile(name)?.myGroups || [];
}

// ── 동기 조회 (캐시 우선) ────────────────────
export function getMembersCached(groupCode) {
  return lsGetMembers(groupCode);
}

export function getMemberByName(groupCode, name) {
  return lsGetMemberByName(groupCode, name);
}

export function isMemberCompleted(groupCode, name) {
  const m = getMemberByName(groupCode, name);
  return !!(m?.profile?.completed);
}

// ── scoring 포맷 변환 ──────────────────────────
export function memberToScoringFormat(member, groupCode) {
  const p = member.profile || {}, sc = p.scores || {};
  return {
    id:              member.id,
    name:            member.name,
    groupCode,
    projectCode:     groupCode,
    dominantType:    p.typeKey || 'A',
    typeRatio:       { A: sc.추진||0, B: sc.소통||0, C: sc.탐구||0, D: sc.실행||0 },
    rawAnswerVector: p.rawAnswerVector || [],
    domains:         p.domains || [],
    priority:        p.priority || '',
  };
}

// ── 디버그 ────────────────────────────────────
export function debugDump() {
  const all = lsReadAll();
  console.group('[TeamFit DB v6]');
  console.log('Firebase 사용:', isFirebaseReady());
  Object.entries(all).forEach(([code, g]) => {
    const members = Object.values(g.members || {});
    console.group(`Group ${code} (${members.length}명)`);
    members.forEach(m => console.log(`  ${m.name} · ${m.profile?.type}`));
    console.groupEnd();
  });
  const domAll = JSON.parse(localStorage.getItem(LS_DOMAIN_KEY) || '{}');
  Object.entries(domAll).forEach(([code, domains]) => {
    console.log(`Group ${code} 커스텀 도메인:`, domains.map(d => d.label));
  });
  console.groupEnd();
}
