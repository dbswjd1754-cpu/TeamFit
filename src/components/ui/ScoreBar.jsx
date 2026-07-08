import { useState, useEffect } from 'react';

export default function ScoreBar({ label, score, maxScore, color = '#4F6EF7', delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setWidth(Math.round((score / maxScore) * 100));
    }, delay);
    return () => clearTimeout(t);
  }, [score, maxScore, delay]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 font-medium">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {score}
          <span className="text-gray-400 font-normal">/{maxScore}</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
