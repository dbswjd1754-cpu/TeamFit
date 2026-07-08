import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useUserStore  from '../store/useUserStore';
import useGroupStore from '../store/useGroupStore';
import ProgressBar   from '../components/ui/ProgressBar';

/* ══ Toast ═══════════════════════════════════ */
function Toast({ domain, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up w-[calc(100%-40px)] max-w-sm">
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3">
        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">
            <span className="text-emerald-400">"{domain.label}"</span> 도메인이 등록되었습니다.
          </p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            같은 그룹의 다른 사용자도 이 도메인을 선택할 수 있어요.
          </p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ══ 새 도메인 등록 Bottom Sheet ═════════════ */
function RegisterModal({ onClose, onRegister, allDomains }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef          = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleRegister = () => {
    const trimmed = input.trim();
    if (!trimmed) { setError('도메인명을 입력해주세요'); return; }
    const norm = s => s.toLowerCase().replace(/\s/g, '');
    const dup = allDomains.find(d => norm(d.label) === norm(trimmed));
    if (dup) {
      setError(`이미 등록된 도메인입니다. 목록에서 "${dup.label}"을(를) 선택해주세요.`);
      return;
    }
    onRegister(trimmed);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-md bg-white rounded-t-3xl px-5 pt-4 pb-10 shadow-2xl">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <h3 className="text-lg font-black text-gray-900 mb-0.5">새 도메인 등록</h3>
          <p className="text-xs text-gray-400 mb-4">등록한 도메인은 현재 그룹의 모든 사용자와 공유됩니다.</p>

          <div className="mb-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">도메인명</label>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder="예: 반도체, AI Agent, 블록체인"
              maxLength={20}
              className={`w-full border-2 rounded-2xl px-4 py-3 text-base font-semibold
                text-gray-800 placeholder-gray-300 focus:outline-none transition-all
                ${error
                  ? 'border-red-300 focus:border-red-400 bg-red-50'
                  : 'border-gray-100 focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                }`}
            />
            {error && <p className="text-xs text-red-400 mt-1.5 leading-relaxed">{error}</p>}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 mb-4">
            <p className="text-xs text-blue-600 leading-relaxed">
              ℹ️ 등록한 도메인은 현재 그룹에서만 공유되며, 등록 즉시 자동으로 선택됩니다.
            </p>
          </div>

          <button
            onClick={handleRegister}
            disabled={!input.trim()}
            className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-all duration-200
              hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
          >
            등록하기
          </button>
        </div>
      </div>
    </>
  );
}

/* ══ 도메인 아이템 ════════════════════════════ */
function DomainItem({ domain, isSelected, isDisabled, onToggle }) {
  return (
    <button
      onClick={() => onToggle(domain.id)}
      disabled={isDisabled && !isSelected}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold
        transition-all text-left active:scale-[0.97] ${
        isSelected
          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm'
          : isDisabled
          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
          : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <span className="flex-shrink-0">
        {isSelected ? (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400">
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        ) : (
          <span className="text-sm">{domain.emoji}</span>
        )}
      </span>
      <span className="truncate text-xs">{domain.label}</span>
      {domain.isCustom && (
        <span className="flex-shrink-0 text-[9px] font-bold text-emerald-500 bg-emerald-50
          border border-emerald-200 px-1 py-0.5 rounded-full ml-auto">NEW</span>
      )}
    </button>
  );
}

/* ══ 메인 컴포넌트 ════════════════════════════ */
export default function OnboardingDomain() {
  const navigate        = useNavigate();
  const isEntered       = useGroupStore(s => s.isEntered);
  const getGroupDomains = useGroupStore(s => s.getGroupDomains);
  const addDomain       = useGroupStore(s => s.addDomain);
  // ★ customDomains를 직접 구독 → 새 도메인 등록/실시간 수신 시 즉시 re-render
  const customDomains   = useGroupStore(s => s.customDomains);
  const { domains: savedLabels, setDomains } = useUserStore();

  // ── allDomains: customDomains 배열이 바뀔 때마다 재계산 ──
  const allDomains = useMemo(
    () => getGroupDomains(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customDomains]   // ★ 실제 존재하는 store 상태 구독
  );

  // ── 초기 selected: savedLabels(label 배열) → id 배열로 1회 역산 ──
  const [selected, setSelected]   = useState(() => {
    if (!savedLabels?.length) return [];
    const domains = getGroupDomains();
    return savedLabels
      .map(label => domains.find(d => d.label === label)?.id)
      .filter(Boolean);
  });

  const [query, setQuery]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]         = useState(null);
  const [limitWarn, setLimitWarn] = useState(false);

  // ── 뒤로가기 후 재진입 시 동기화
  // savedLabels가 실제로 변경될 때만 (문자열 비교로 안정화) ──
  const savedLabelsKey = (savedLabels || []).join(',');
  const prevKeyRef     = useRef(savedLabelsKey);

  useEffect(() => {
    if (prevKeyRef.current === savedLabelsKey) return;
    prevKeyRef.current = savedLabelsKey;
    // ★ allDomains(useMemo) 기반으로 id 역산 — 커스텀 도메인 포함
    const ids = (savedLabels || [])
      .map(label => allDomains.find(d => d.label === label)?.id)
      .filter(Boolean);
    setSelected(ids);
  }, [savedLabelsKey, allDomains]); // allDomains 변경 시에도 동기화

  if (!isEntered) { navigate('/'); return null; }

  const filtered = query.trim()
    ? allDomains.filter(d => d.label.toLowerCase().includes(query.trim().toLowerCase()))
    : allDomains;

  // ── 선택/해제 (useCallback 의존성 없음 — setSelected의 함수형 업데이트 사용) ──
  const handleToggle = useCallback((domainId) => {
    setSelected(prev => {
      if (prev.includes(domainId)) {
        setLimitWarn(false);
        return prev.filter(id => id !== domainId);
      }
      if (prev.length >= 3) {
        setLimitWarn(true);
        setTimeout(() => setLimitWarn(false), 2500);
        return prev;
      }
      return [...prev, domainId];
    });
  }, []); // 빈 의존성 — setSelected는 안정적

  const handleRegister = useCallback(async (label) => {
    const result = await addDomain(label);
    if (!result.success && result.duplicate) return;
    if (result.success && result.domain) {
      setShowModal(false);
      setQuery('');
      setSelected(prev => prev.length < 3 ? [...prev, result.domain.id] : prev);
      setToast(result.domain);
    }
  }, [addDomain]);

  const handleNext = () => {
    if (!selected.length) return;
    const labels = selected.map(id => {
      const d = allDomains.find(d => d.id === id);
      return d ? d.label : id;
    });
    setDomains(labels);
    navigate('/onboarding/priority');
  };

  const selectedCount = selected.length;

  return (
    <>
      {/*
        핵심 구조: h-screen 고정 → 절대로 페이지가 늘어나지 않음
        flex flex-col → 상단(헤더+콘텐츠)과 하단(버튼) 영역 분리
      */}
      <div className="h-screen flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}>

        {/* ── 스크롤 가능 콘텐츠 영역 ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto w-full px-5 pt-6">

            <ProgressBar current={2} total={4} showBack onBack={() => navigate(-1)} />

            <div className="mt-4">
              {/* 제목 */}
              <p className="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-2">Step 2 · 관심 도메인</p>
              <h2 className="text-2xl font-black text-gray-900 mb-0.5">관심 도메인을 선택해주세요</h2>
              <p className="text-xs text-gray-400 mb-3">
                최대 3개 선택
                <span className={`ml-2 font-bold ${selectedCount >= 3 ? 'text-emerald-500' : 'text-gray-500'}`}>
                  {selectedCount}/3
                </span>
              </p>

              {/* 검색창 */}
              <div className="relative mb-3">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="도메인 검색..."
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl pl-9 pr-4 py-2.5
                    text-sm text-gray-700 placeholder-gray-300 focus:outline-none
                    focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.08)] transition-all"
                />
                {query && (
                  <button onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* 3개 초과 경고 */}
              {limitWarn && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 mb-2 flex items-center gap-2">
                  <span className="text-amber-400 text-sm">⚠️</span>
                  <p className="text-xs text-amber-700 font-medium">관심 도메인은 최대 3개까지 선택할 수 있습니다.</p>
                </div>
              )}

              {/* ──────────────────────────────────────────────
                  도메인 그리드
                  maxHeight 고정 → 내부에서만 스크롤
                  도메인 추가해도 이 박스 바깥으로 절대 안 넘침
              ────────────────────────────────────────────── */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {query ? `검색 결과 ${filtered.length}개` : '인기 도메인'}
                </p>

                {filtered.length > 0 ? (
                  <div className="relative">
                    <div
                      className="grid grid-cols-2 gap-2 overflow-y-auto"
                      style={{ maxHeight: '360px' }}
                    >
                      {filtered.map(domain => (
                        <DomainItem
                          key={domain.id}
                          domain={domain}
                          isSelected={selected.includes(domain.id)}
                          isDisabled={selectedCount >= 3}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                    {/* 하단 fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
                      style={{ background: 'linear-gradient(to bottom, transparent, rgba(239,246,255,0.97))' }} />
                    {/* 스크롤 힌트 */}
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className="text-emerald-500 text-xs font-bold animate-bounce inline-block">↓</span>
                      <span className="text-xs text-emerald-600 font-semibold">스크롤하면 더 많은 도메인을 볼 수 있어요</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-1">🔍</p>
                    <p className="text-sm text-gray-400">
                      <span className="font-semibold text-gray-600">"{query}"</span>에 해당하는 도메인이 없어요.
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">아래 버튼으로 직접 등록해보세요!</p>
                  </div>
                )}
              </div>

              {/* 새 도메인 등록 */}
              <div className="mt-3 pt-3 border-t border-gray-100 pb-2">
                <p className="text-xs text-gray-400 text-center mb-2">찾는 도메인이 없나요?</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl
                    border-2 border-dashed border-emerald-200 bg-emerald-50/50
                    text-sm font-semibold text-emerald-600
                    hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm
                    active:scale-[0.98] transition-all duration-150"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  새 도메인 등록하기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 다음 버튼 — 항상 화면 하단 고정 ── */}
        <div className="flex-shrink-0 px-5 pb-7 pt-3 max-w-md mx-auto w-full"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(239,246,255,1) 30%)' }}>
          <button
            onClick={handleNext}
            disabled={!selectedCount}
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-200
              hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)' }}
          >
            {selectedCount > 0 ? `${selectedCount}개 선택 · 다음` : '다음'}
          </button>
        </div>
      </div>

      {showModal && (
        <RegisterModal
          onClose={() => setShowModal(false)}
          onRegister={handleRegister}
          allDomains={allDomains}
        />
      )}
      {toast && <Toast domain={toast} onClose={() => setToast(null)} />}
    </>
  );
}
