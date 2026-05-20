"use client";

import { cn } from "@/lib/utils";

/**
 * Fullscreen classroom scene. The examiner is a compact illustrated character
 * sitting at a desk in the middle of the room — kept deliberately small so the
 * room reads as the focal context, not the character. Text-free.
 */
export function ClassroomScene({ speaking }: { speaking: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f6eee2]">
      {/* Back wall */}
      <div className="absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-[#fff9ec] via-[#f4e7d3] to-[#ead0b8]" />

      {/* Skirting line */}
      <div className="absolute left-0 right-0 top-[58%] h-[5px] bg-[#b99d7f]/45" />

      {/* Floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          background:
            "linear-gradient(to bottom, #f7f0e4 0%, #eee4d5 58%, #dfd2bf 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.10] mix-blend-multiply"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent 0 80px, rgba(84,64,43,0.38) 80px 81px)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] mix-blend-multiply"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent 0 32px, rgba(84,64,43,0.32) 32px 33px)",
          }}
        />
      </div>

      {/* Window — left wall */}
      <div className="absolute left-[7%] top-[16%] w-[12%] aspect-[3/4] max-w-[180px] min-w-[100px]">
        <div className="absolute inset-0 rounded-md border-4 border-amber-900/40 bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 shadow-inner overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="flex-1 border-r-2 border-amber-900/40" />
            <div className="flex-1" />
          </div>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-900/40" />
          <div className="absolute bottom-3 left-2 w-6 h-8 rounded-t-full bg-emerald-500/40" />
          <div className="absolute bottom-3 right-3 w-5 h-6 rounded-t-full bg-emerald-600/40" />
        </div>
        <div className="absolute -inset-y-1 -left-2 w-3 rounded-l bg-rose-300/70 shadow-soft" />
        <div className="absolute -inset-y-1 -right-2 w-3 rounded-r bg-rose-300/70 shadow-soft" />
        <div className="absolute -top-1.5 -left-3 -right-3 h-2 rounded-full bg-amber-900/60" />
      </div>

      {/* Wall clock — right wall */}
      <div className="absolute right-[8%] top-[14%] h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white border-4 border-stone-700 shadow-soft flex items-center justify-center">
        <div className="relative h-full w-full">
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-stone-700">12</span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold text-stone-700">6</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-stone-700">9</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-stone-700">3</span>
          <span className="absolute top-1/2 left-1/2 w-0.5 h-4 -translate-x-1/2 -translate-y-full bg-stone-800 origin-bottom rotate-[40deg]" />
          <span className="absolute top-1/2 left-1/2 w-0.5 h-5 -translate-x-1/2 -translate-y-full bg-stone-800 origin-bottom rotate-[110deg]" />
          <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-800" />
        </div>
      </div>

      {/* Potted plant on the floor */}
      <div className="absolute left-[5%] bottom-[6%]">
        <div className="relative h-20 w-20">
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 h-16 w-3 rotate-[-12deg] origin-bottom rounded-full bg-gradient-to-t from-emerald-700 to-emerald-500" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 h-14 w-3 rotate-[8deg] origin-bottom rounded-full bg-gradient-to-t from-emerald-700 to-emerald-400" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 h-12 w-3 rotate-[-22deg] origin-bottom rounded-full bg-gradient-to-t from-emerald-800 to-emerald-500" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 h-15 w-3 rotate-[22deg] origin-bottom rounded-full bg-gradient-to-t from-emerald-700 to-emerald-400" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-12 h-6 rounded-b-lg bg-gradient-to-b from-amber-700 to-amber-900 shadow-soft" />
          <div className="absolute left-1/2 bottom-5 -translate-x-1/2 w-14 h-1.5 rounded-full bg-amber-800" />
        </div>
      </div>

      {/* Picture frame on the right wall */}
      <div className="absolute right-[6%] top-[36%] w-20 h-16 rounded-md border-[5px] border-amber-900/70 bg-gradient-to-br from-violet-200 via-rose-200 to-amber-100 shadow-soft" />

      {/* Examiner + desk — centre stage, sized to read clearly from across the room */}
      <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-[82vw] max-w-[940px] min-w-[620px] pointer-events-none">
        <ExaminerAtDesk speaking={speaking} />
      </div>

      {/* Bottom shadow */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
}

/**
 * Compact, cartoon-style examiner sitting at a desk. Designed to read at small
 * size — head ~ 60px, full figure ~ 240px tall in the SVG viewBox. Chair is a
 * subtle silhouette behind, not the dominant element.
 */
function ExaminerAtDesk({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-full">
      {speaking && (
        <span
          aria-hidden
          className="absolute left-1/2 top-[10%] -translate-x-1/2 h-32 w-32 rounded-full bg-emerald-300/40 blur-2xl animate-pulse"
        />
      )}
      <svg
        viewBox="0 0 400 320"
        className={cn(
          "block w-full h-auto drop-shadow-lg",
          speaking && "animate-[examinerBob_1.4s_ease-in-out_infinite]",
        )}
        aria-label="Examiner illustration"
      >
        {/* === BODY === */}
        {/* Torso */}
        <path
          d="M132 230 C 132 188, 168 174, 200 174 C 232 174, 268 188, 268 230 L 268 252 L 132 252 Z"
          fill="#20242b"
        />
        {/* Blouse */}
        <path
          d="M184 184 L 216 184 C 214 206, 208 225, 200 236 C 192 225, 186 206, 184 184 Z"
          fill="#fff7ee"
        />
        {/* Blazer lapels */}
        <path d="M164 184 C 176 186, 188 198, 197 236 C 182 224, 169 206, 160 188 Z" fill="#2f3640" />
        <path d="M236 184 C 224 186, 212 198, 203 236 C 218 224, 231 206, 240 188 Z" fill="#2f3640" />
        <path d="M194 188 L 200 202 L 206 188" stroke="#e8d6c2" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Neck */}
        <rect x="192" y="158" width="16" height="20" rx="5" fill="#e9b994" />

        {/* === HEAD === */}
        {/* Friendly compact examiner avatar: simple bob, open face, light expression. */}
        <path
          d="M162 130 C 162 99, 179 81, 200 81 C 222 81, 238 100, 238 131 C 238 153, 226 168, 209 171 L 209 158 C 220 153, 227 141, 227 126 C 227 105, 216 93, 200 93 C 184 93, 173 106, 173 126 C 173 141, 180 153, 191 158 L 191 171 C 174 168, 162 153, 162 130 Z"
          fill="#4f3326"
          stroke="#3e241c"
          strokeWidth="1"
        />

        {/* Ears */}
        <ellipse cx="171" cy="131" rx="4.5" ry="6.5" fill="#efc09f" />
        <ellipse cx="229" cy="131" rx="4.5" ry="6.5" fill="#efc09f" />

        <path
          d="M173 126 C 173 105, 184 93, 200 93 C 216 93, 227 106, 227 127 C 227 147, 216 160, 200 162 C 184 160, 173 147, 173 126 Z"
          fill="#f5c9aa"
        />

        {/* Soft fringe and side locks. */}
        <path
          d="M167 122 C 170 100, 184 87, 203 88 C 221 89, 234 104, 236 126 C 225 116, 211 110, 197 111 C 185 112, 175 116, 167 122 Z"
          fill="#583727"
        />
        <path d="M166 122 C 161 138, 166 156, 183 164 C 177 150, 176 137, 178 124 Z" fill="#4f3326" />
        <path d="M234 122 C 239 138, 234 156, 217 164 C 223 150, 224 137, 222 124 Z" fill="#4f3326" />
        <path d="M184 93 C 198 88, 214 91, 227 103" stroke="#76513d" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.24" />
        <path d="M201 91 C 195 99, 192 108, 190 119" stroke="#3e241a" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.6" />

        {/* Eyes */}
        <path d="M183 127 C 186 124, 192 124, 195 127 C 192 129.5, 186 129.5, 183 127 Z" fill="#fffaf2" />
        <path d="M205 127 C 208 124, 214 124, 217 127 C 214 129.5, 208 129.5, 205 127 Z" fill="#fffaf2" />
        <path d="M183 126.5 Q189 123.5 195 126.5" stroke="#1f1b19" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M205 126.5 Q211 123.5 217 126.5" stroke="#1f1b19" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <circle cx="189" cy="127" r="2" fill="#4b352b" />
        <circle cx="211" cy="127" r="2" fill="#4b352b" />
        <circle cx="189" cy="127" r="1" fill="#15110f" />
        <circle cx="211" cy="127" r="1" fill="#15110f" />
        <circle cx="189.6" cy="126.2" r="0.45" fill="#ffffff" />
        <circle cx="211.6" cy="126.2" r="0.45" fill="#ffffff" />

        {/* Eyebrows */}
        <path d="M181 117 Q188 115 195 117" stroke="#9a6a3f" strokeWidth="1.55" fill="none" strokeLinecap="round" />
        <path d="M205 117 Q212 115 219 117" stroke="#9a6a3f" strokeWidth="1.55" fill="none" strokeLinecap="round" />

        {/* Mouth */}
        {speaking ? (
          <ellipse cx="200" cy="149" rx="4.2" ry="2.4" fill="#a9564f">
            <animate
              attributeName="ry"
              values="1.1;2.6;1.7;2.3;1.1"
              dur="0.7s"
              repeatCount="indefinite"
            />
          </ellipse>
        ) : (
          <path
            d="M193 148 Q200 152 207 148"
            stroke="#934b47"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Cheeks */}
        <ellipse cx="181" cy="139" rx="5" ry="2.5" fill="#eaa29b" opacity="0.32" />
        <ellipse cx="219" cy="139" rx="5" ry="2.5" fill="#eaa29b" opacity="0.32" />

        {/* === DESK (perspective trapezoid) === */}
        <path d="M40 250 L 360 250 L 392 308 L 8 308 Z" fill="#a26a39" />
        <path d="M40 250 L 360 250 L 356 256 L 44 256 Z" fill="#c08550" />
        <path d="M8 308 L 392 308 L 392 320 L 8 320 Z" fill="#6f4521" />

        {/* Hands resting on desk edge */}
        <ellipse cx="118" cy="250" rx="14" ry="6" fill="#e9b994" />
        <ellipse cx="282" cy="250" rx="14" ry="6" fill="#e9b994" />
        <rect x="106" y="240" width="22" height="11" rx="4" fill="#20242b" />
        <rect x="272" y="240" width="22" height="11" rx="4" fill="#20242b" />

        {/* Papers */}
        <rect x="78" y="240" width="30" height="10" rx="2" fill="#f7f3ec" />
        <rect x="76" y="245" width="30" height="10" rx="2" fill="#f7f3ec" />
        <rect x="80" y="243" width="24" height="1.5" fill="#a1a1a1" />
        <rect x="80" y="248" width="20" height="1.5" fill="#a1a1a1" />

        {/* Mug */}
        <rect x="304" y="232" width="22" height="20" rx="3" fill="#f7f3ec" stroke="#c0c0c0" strokeWidth="1.2" />
        <path d="M326 238 Q335 241 326 250" stroke="#c0c0c0" strokeWidth="1.8" fill="none" />
        <ellipse cx="315" cy="233" rx="9" ry="2" fill="#5b3a1f" />

        {/* Pen */}
        <rect x="148" y="247" width="22" height="2" rx="1" fill="#1f3a5f" transform="rotate(-10 159 248)" />
        <circle cx="170" cy="244" r="1.5" fill="#c2402b" />

        {/* Mic */}
        <g transform="translate(218,236)">
          <rect x="0" y="0" width="5" height="9" rx="2.5" fill="#444" />
          <rect x="-2.5" y="9" width="10" height="2" rx="1" fill="#666" />
          <line x1="2.5" y1="11" x2="2.5" y2="16" stroke="#444" strokeWidth="1.3" />
          <line x1="-1.5" y1="16" x2="6.5" y2="16" stroke="#444" strokeWidth="1.3" />
        </g>
      </svg>
      <style jsx global>{`
        @keyframes examinerBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
