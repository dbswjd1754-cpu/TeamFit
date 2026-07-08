/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#4F6EF7',
          600: '#3B56E8',
          700: '#2D44D4',
        },
        surface: '#F8F9FE',
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateX(-50%) translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        /* 퍼즐 맞물림 — 최초 1회: 살짝 분리 → 다시 맞물림 + 미세 바운스 */
        'puzzle-assemble': {
          '0%':   { transform: 'scale(1)' },
          '18%':  { transform: 'scale(0.938)' },   /* 분리 (6.2% 축소 = 각 조각 ~6px 바깥 이동 느낌) */
          '38%':  { transform: 'scale(0.938)' },   /* 0.2s 정지 */
          '78%':  { transform: 'scale(1.008)' },   /* 자연스러운 감속 후 맞물림 + 미세 바운스 */
          '100%': { transform: 'scale(1)' },        /* 안정 */
        },
        /* 이후 은은한 반복: 10~12초 주기 (앞 10%만 움직이고 나머지 대기) */
        'puzzle-idle': {
          '0%':           { transform: 'scale(1)' },
          '2%':           { transform: 'scale(0.952)' },   /* 분리 */
          '4%':           { transform: 'scale(0.952)' },   /* 0.2s 정지 */
          '9%':           { transform: 'scale(1.005)' },   /* 맞물림 + 미세 바운스 */
          '11%, 100%':    { transform: 'scale(1)' },       /* 나머지 시간 정지 */
        },
      },
      animation: {
        'fade-in-up':      'fade-in-up 0.25s ease-out',
        'float':           'float 2.8s ease-in-out infinite',
        'puzzle-assemble': 'puzzle-assemble 1.0s cubic-bezier(0.25,0.46,0.45,0.94) 0.3s 1 both',
        'puzzle-idle':     'puzzle-idle 1.05s cubic-bezier(0.25,0.46,0.45,0.94) 0s infinite',
      },
    },
  },
  plugins: [],
};
