/**
 * groupDB v6 — Firebase Firestore 기반 공용 저장소
 *
 * Firestore 구조:
 *   groups/{groupCode}/members/{memberId}
 *   groups/{groupCode}/domains/{domainId}
 *
 * 오프라인 fallback:
 *   Firebase 연결 실패 시 localStorage로 자동 전환
 */

import { db } from '../firebase';
import {
  doc, getDoc, setDoc, getDocs,
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
