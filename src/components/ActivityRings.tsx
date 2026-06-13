import React, { useState } from "react";

interface ActivityRingsProps {
  addedToday: number;
  dailyGoal: number;
  totalInterviews: number;
  interviewsWithReminder: number;
  offers: number;
  totalApps: number;
}

export const ActivityRings: React.FC<ActivityRingsProps> = ({
  addedToday,
  dailyGoal,
  totalInterviews,
  interviewsWithReminder,
  offers,
}) => {
  const [hoveredRing, setHoveredRing] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 1. Outer Ring: Daily Goal Progress
  const goalPercent = dailyGoal > 0 ? Math.min((addedToday / dailyGoal) * 100, 100) : 0;
  
  // 2. Middle Ring: Interview reminders schedule rate
  const interviewPercent = totalInterviews > 0 ? Math.min((interviewsWithReminder / totalInterviews) * 100, 100) : 0;

  // 3. Inner Ring: Offer achievement
  const offerPercent = offers > 0 ? 100 : 0;

  // SVG parameters (larger 240px circle)
  const size = 240;
  const center = size / 2;
  const strokeWidth = 14;

  const rings = [
    {
      id: 1,
      name: "Tagesziel",
      desc: "Bewerbungen heute gesendet",
      percent: goalPercent,
      valueText: `${addedToday} von ${dailyGoal}`,
      radius: 96,
      circumference: 2 * Math.PI * 96, // 603.18
      color: "text-rose-450",
      strokeClass: "stroke-rose-500",
      bgStrokeClass: "stroke-rose-950/20",
      glowColor: "rgba(244,63,94,0.35)",
    },
    {
      id: 2,
      name: "Interviews",
      desc: "Termine mit Erinnerung",
      percent: interviewPercent,
      valueText: totalInterviews > 0 ? `${interviewsWithReminder} von ${totalInterviews}` : "0 Interviews",
      radius: 76,
      circumference: 2 * Math.PI * 76, // 477.52
      color: "text-amber-400",
      strokeClass: "stroke-amber-500",
      bgStrokeClass: "stroke-amber-950/20",
      glowColor: "rgba(245,158,11,0.35)",
    },
    {
      id: 3,
      name: "Erfolge",
      desc: "Job-Angebote erhalten",
      percent: offerPercent,
      valueText: offers === 1 ? "1 Angebot erhalten!" : `${offers} Angebote erhalten`,
      radius: 56,
      circumference: 2 * Math.PI * 56, // 351.85
      color: "text-emerald-450",
      strokeClass: "stroke-emerald-500",
      bgStrokeClass: "stroke-emerald-950/20",
      glowColor: "rgba(16,185,129,0.35)",
    },
  ];

  const handleMouseMove = (e: React.MouseEvent) => {
    let x = e.clientX + 15;
    let y = e.clientY + 15;
    
    // Check right edge collision
    if (x + 180 > window.innerWidth) {
      x = e.clientX - 195;
    }
    // Check bottom edge collision
    if (y + 90 > window.innerHeight) {
      y = e.clientY - 105;
    }
    
    setTooltipPos({ x, y });
  };

  return (
    <div className="py-6 flex flex-col items-center justify-center relative overflow-visible group w-full">
      {/* Background radial glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* SVG Rings Visualization Container (Centered) */}
      <div
        className="relative flex items-center justify-center shrink-0 w-[240px] h-[240px] z-10"
        onMouseMove={handleMouseMove}
      >
        <svg className="w-full h-full transform -rotate-90 select-none">
          {rings.map((ring) => {
            const isHovered = hoveredRing === ring.id;
            const strokeOffset = ring.circumference - (ring.percent / 100) * ring.circumference;
            
            return (
              <g
                key={ring.id}
                onMouseEnter={() => setHoveredRing(ring.id)}
                onMouseLeave={() => setHoveredRing(null)}
                className="cursor-pointer transition-all duration-300"
              >
                {/* Background Ring Path */}
                <circle
                  cx={center}
                  cy={center}
                  r={ring.radius}
                  className={`${ring.bgStrokeClass} transition-opacity duration-300`}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                
                {/* Foreground Animated Ring Progress */}
                {ring.percent > 0 && (
                  <circle
                    cx={center}
                    cy={center}
                    r={ring.radius}
                    className={`${ring.strokeClass} transition-all duration-500 ease-out`}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={ring.circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{
                      filter: isHovered
                        ? `drop-shadow(0px 0px 6px ${ring.glowColor})`
                        : "none",
                      opacity: hoveredRing === null || isHovered ? 1 : 0.35,
                      strokeWidth: isHovered ? strokeWidth + 2.5 : strokeWidth,
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Mouse Tooltip (Displays detailed progress info next to cursor) */}
      {hoveredRing !== null && (
        <div
          className="fixed z-[9999] pointer-events-none bg-slate-950/90 border border-white/10 px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-fadeIn"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          {(() => {
            const active = rings.find((r) => r.id === hoveredRing);
            if (!active) return null;
            return (
              <div className="space-y-1 select-none">
                <span className={`block uppercase text-[9px] font-black tracking-widest ${active.color}`}>
                  {active.name}
                </span>
                <span className="block text-white font-extrabold text-sm">
                  {Math.round(active.percent)}% ({active.valueText})
                </span>
                <span className="block text-slate-400 text-[10px] font-semibold">
                  {active.desc}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
