/**
 * 공통 페이지 레이아웃
 * 브랜드 배경 그라디언트 + max-width 고정
 */
export default function PageLayout({ children, className = '', noBg = false }) {
  return (
    <div
      className={`min-h-screen flex flex-col ${className}`}
      style={noBg ? {} : { background: 'linear-gradient(160deg, #F0FDF9 0%, #EFF6FF 55%, #F5F3FF 100%)' }}
    >
      <div className="flex-1 w-full max-w-md mx-auto px-5 py-8 flex flex-col">
        {children}
      </div>
    </div>
  );
}
