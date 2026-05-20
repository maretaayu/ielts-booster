"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const XP_PER_BAND = 200;

const ALL_BANDS = [
  { band: 9.0, cefr: "C2 Mastery" },
  { band: 8.5, cefr: "C2 Mastery" },
  { band: 8.0, cefr: "C1 Advanced" },
  { band: 7.5, cefr: "C1 Advanced" },
  { band: 7.0, cefr: "C1 Advanced" },
  { band: 6.5, cefr: "B2 Upper Intermediate" },
  { band: 6.0, cefr: "B2 Upper Intermediate" },
  { band: 5.5, cefr: "B2 Upper Intermediate" },
  { band: 5.0, cefr: "B1 Intermediate" },
  { band: 4.5, cefr: "B1 Intermediate" },
  { band: 4.0, cefr: "B1 Intermediate" },
];

const OFFSETS = [0, -25, -35, -25, 0, 25, 35, 25]; // Tighter horizontal winding

export function LevelLadderCard({
  placementBand,
  targetBand,
  totalExercises,
}: {
  placementBand: number;
  targetBand: number;
  totalExercises: number;
}) {
  const totalXP = totalExercises * 50;
  const bandsGained = Math.floor(totalXP / XP_PER_BAND) * 0.5;
  const currentBand = Math.min(placementBand + bandsGained, 9.0);
  
  const currentLevelXP = totalXP % XP_PER_BAND;
  const progressPct = Math.round((currentLevelXP / XP_PER_BAND) * 100);

  const pathNodes = useMemo(() => {
    // Show exactly 4 nodes max to keep it extremely compact. 
    // Show one node behind (completed), and up to 2 ahead.
    const minBand = Math.max(4.0, currentBand - 0.5);
    const maxBand = Math.min(9.0, Math.min(targetBand, minBand + 1.5));
    // Reverse because we want to render top-down (highest band at top)
    return ALL_BANDS.filter((b) => b.band >= minBand && b.band <= maxBand);
  }, [placementBand, targetBand, currentBand]);

  // We need absolute Y positions to draw the SVG path cleanly
  const NODE_SPACING = 75; // Much tighter vertical spacing
  const totalHeight = (pathNodes.length - 1) * NODE_SPACING;

  return (
    <section className="mt-7 mb-4">
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-soft p-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 z-10 relative">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Your Path to {targetBand.toFixed(1)}</h2>
            <p className="text-[13px] font-semibold text-ink/40 mt-0.5">Every practice compounds your score</p>
          </div>
          <div className="h-10 px-3.5 bg-violet-100 text-violet-700 rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-sm border border-violet-200">
            <Star className="w-4 h-4 fill-violet-700" />
            {totalXP} XP
          </div>
        </div>

        <div 
          className="relative flex justify-center mt-6 mb-4 mx-auto"
          style={{ height: totalHeight + 90, width: "100%" }}
        >
          {/* SQUIGGLY SVG PATH */}
          <svg 
            className="absolute top-0 bottom-0 pointer-events-none" 
            style={{ width: "100%", height: "100%", zIndex: 0 }}
          >
            {pathNodes.map((_, i) => {
              if (i === pathNodes.length - 1) return null;
              
              // We draw from Node i to Node i+1
              const offsetIdx1 = (pathNodes.length - 1 - i) % OFFSETS.length;
              const offsetIdx2 = (pathNodes.length - 1 - (i + 1)) % OFFSETS.length;
              
              const x1 = `calc(50% + ${OFFSETS[offsetIdx1]}px)`;
              const y1 = i * NODE_SPACING + 30;
              const x2 = `calc(50% + ${OFFSETS[offsetIdx2]}px)`;
              const y2 = (i + 1) * NODE_SPACING + 30;
              
              // Determine if this segment is "completed"
              const node1Band = pathNodes[i].band;
              const node2Band = pathNodes[i+1].band;
              // A segment is completed if the lower band (node2) is fully completed
              const isSegmentCompleted = node2Band < currentBand;

              return (
                <g key={`path-${i}`}>
                  {/* Background Track */}
                  <path 
                    d={`M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#f1f5f9" 
                    strokeWidth="20"
                    strokeLinecap="round"
                  />
                  {/* Highlight Track */}
                  {isSegmentCompleted && (
                    <path 
                      d={`M ${x1} ${y1} C ${x1} ${(y1+y2)/2}, ${x2} ${(y1+y2)/2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#a78bfa" 
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* NODES */}
          {pathNodes.map((node, i) => {
            const isCompleted = node.band < currentBand;
            const isActive = node.band === currentBand;
            const isLocked = node.band > currentBand;
            const isTarget = node.band === targetBand;

            const offsetIdx = (pathNodes.length - 1 - i) % OFFSETS.length;
            const xOffset = OFFSETS[offsetIdx];
            const yPos = i * NODE_SPACING;

            return (
              <div 
                key={node.band} 
                className="absolute z-10 flex flex-col items-center justify-center"
                style={{ top: yPos, transform: `translateX(${xOffset}px)` }}
              >
                {/* FLOATING MASCOT (LUMI) */}
                {isActive && (
                  <motion.div 
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[52px] z-20 pointer-events-none"
                  >
                    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-br from-violet-300 via-fuchsia-400 to-violet-500 shadow-[0_8px_16px_rgba(167,139,250,0.4)] flex items-center justify-center relative border-2 border-white/50">
                       <div className="flex gap-1 absolute top-3">
                         <div className="w-1.5 h-1.5 bg-white rounded-full" />
                         <div className="w-1.5 h-1.5 bg-white rounded-full" />
                       </div>
                       <div className="absolute top-6 w-2.5 h-1 border-b-2 border-white rounded-full opacity-90" />
                       <div className="absolute top-4 left-1 w-1 h-1 rounded-full bg-rose-400/60 blur-[1px]" />
                       <div className="absolute top-4 right-1 w-1 h-1 rounded-full bg-rose-400/60 blur-[1px]" />
                    </div>
                  </motion.div>
                )}

                {/* 3D NODE BUTTON */}
                <div className="relative group cursor-pointer">
                  {/* Progress Ring for Active */}
                  {isActive && (
                    <svg className="absolute -inset-[10px] w-[calc(100%+20px)] h-[calc(100%+20px)] -rotate-90 pointer-events-none opacity-50 z-0">
                      <circle cx="50%" cy="50%" r="44%" fill="none" stroke="#ede9fe" strokeWidth="6" />
                      <circle 
                        cx="50%" cy="50%" r="44%" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="6" 
                        strokeDasharray="100 100" 
                        strokeDashoffset={100 - progressPct}
                        strokeLinecap="round" 
                      />
                    </svg>
                  )}

                  <motion.div 
                    whileHover={!isLocked ? { scale: 1.05 } : {}}
                    whileTap={!isLocked ? { scale: 0.95, y: 4, boxShadow: "0 0px 0 0 transparent" } : {}}
                    className={cn(
                      "w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center relative z-10 transition-all",
                      isCompleted 
                        ? "bg-violet-500 border-[3px] border-violet-400 text-white shadow-[0_4px_0_#6d28d9]" 
                        : isActive 
                        ? "bg-white border-[3px] border-violet-200 text-violet-600 shadow-[0_4px_0_#ddd6fe]" 
                        : "bg-slate-100 border-[3px] border-slate-200 text-slate-400 shadow-[0_4px_0_#cbd5e1]"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6" strokeWidth={4} />
                    ) : isTarget && isLocked ? (
                      <Trophy className="w-6 h-6 text-amber-400 fill-amber-100 drop-shadow-sm" />
                    ) : (
                      <div className="text-[18px] font-black tabular-nums tracking-tighter leading-none mt-0.5">
                        {node.band.toFixed(1)}
                      </div>
                    )}
                  </motion.div>
                  
                  {/* CEFR Tooltip */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-ink text-white shadow-xl text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none whitespace-nowrap"
                    style={{ left: xOffset >= 0 ? "-150%" : "auto", right: xOffset < 0 ? "-150%" : "auto" }}
                  >
                    {node.cefr}
                  </div>
                </div>

              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}
