"use client";

import type { ChartData } from "@ielts/shared";

const FALLBACK_COLORS = [
  "#7c3aed",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#06b6d4",
];

export function PromptChart({ data }: { data: ChartData }) {
  if (data.kind === "line") return <LineChart data={data} />;
  if (data.kind === "bar") return <BarChart data={data} />;
  if (data.kind === "pie") return <PieChart data={data} />;
  if (data.kind === "process") return <ProcessDiagram data={data} />;
  if (data.kind === "map") return <MapPanels data={data} />;
  return null;
}

function chartColor(c: string | undefined, i: number) {
  return c ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
}

function LineChart({ data }: { data: Extract<ChartData, { kind: "line" }> }) {
  const W = 640;
  const H = 280;
  const PAD = { t: 20, r: 16, b: 32, l: 44 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data.series.flatMap((s) => s.values));
  const min = Math.min(0, ...data.series.flatMap((s) => s.values));
  const yScale = (v: number) => PAD.t + innerH * (1 - (v - min) / (max - min || 1));
  const xScale = (i: number) =>
    PAD.l + (innerW * i) / Math.max(1, data.xLabels.length - 1);

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => min + ((max - min) * i) / yTicks);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeDasharray="3 3"
            />
            <text x={PAD.l - 8} y={yScale(v) + 4} textAnchor="end" className="text-[10px] fill-slate-500">
              {v.toFixed(0)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {data.xLabels.map((label, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={H - PAD.b + 16}
            textAnchor="middle"
            className="text-[11px] fill-slate-600"
          >
            {label}
          </text>
        ))}
        {/* lines */}
        {data.series.map((s, idx) => {
          const path = s.values
            .map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(v)}`)
            .join(" ");
          const color = chartColor(s.color, idx);
          return (
            <g key={s.name}>
              <path d={path} fill="none" stroke={color} strokeWidth={2.5} />
              {s.values.map((v, i) => (
                <circle key={i} cx={xScale(i)} cy={yScale(v)} r={3.5} fill={color} />
              ))}
            </g>
          );
        })}
        {/* y axis label */}
        {data.yLabel && (
          <text
            x={PAD.l - 36}
            y={PAD.t + innerH / 2}
            transform={`rotate(-90, ${PAD.l - 36}, ${PAD.t + innerH / 2})`}
            textAnchor="middle"
            className="text-[11px] fill-slate-700 font-medium"
          >
            {data.yLabel}
          </text>
        )}
      </svg>
      <Legend
        items={data.series.map((s, i) => ({ name: s.name, color: chartColor(s.color, i) }))}
      />
    </div>
  );
}

function BarChart({ data }: { data: Extract<ChartData, { kind: "bar" }> }) {
  const W = 640;
  const H = 300;
  const PAD = { t: 20, r: 16, b: 50, l: 44 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data.series.flatMap((s) => s.values));
  const yScale = (v: number) => PAD.t + innerH * (1 - v / (max || 1));
  const groupCount = data.categories.length;
  const groupWidth = innerW / groupCount;
  const barCount = data.series.length;
  const barWidth = (groupWidth * 0.7) / barCount;
  const groupGap = groupWidth * 0.15;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const v = max * p;
          return (
            <g key={i}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={yScale(v)}
                y2={yScale(v)}
                stroke="#e5e7eb"
                strokeDasharray="3 3"
              />
              <text x={PAD.l - 8} y={yScale(v) + 4} textAnchor="end" className="text-[10px] fill-slate-500">
                {v.toFixed(0)}
              </text>
            </g>
          );
        })}
        {data.categories.map((cat, gi) => (
          <g key={cat}>
            {data.series.map((s, si) => {
              const x = PAD.l + gi * groupWidth + groupGap + si * barWidth;
              const y = yScale(s.values[gi] ?? 0);
              const h = innerH - (yScale(s.values[gi] ?? 0) - PAD.t);
              const color = chartColor(s.color, si);
              return (
                <rect
                  key={s.name}
                  x={x}
                  y={y}
                  width={barWidth * 0.9}
                  height={Math.max(0, h)}
                  fill={color}
                  rx={3}
                />
              );
            })}
            <text
              x={PAD.l + gi * groupWidth + groupWidth / 2}
              y={H - PAD.b + 16}
              textAnchor="middle"
              className="text-[11px] fill-slate-700"
            >
              {cat}
            </text>
          </g>
        ))}
        {data.yLabel && (
          <text
            x={PAD.l - 36}
            y={PAD.t + innerH / 2}
            transform={`rotate(-90, ${PAD.l - 36}, ${PAD.t + innerH / 2})`}
            textAnchor="middle"
            className="text-[11px] fill-slate-700 font-medium"
          >
            {data.yLabel}
          </text>
        )}
      </svg>
      <Legend items={data.series.map((s, i) => ({ name: s.name, color: chartColor(s.color, i) }))} />
    </div>
  );
}

function PieChart({ data }: { data: Extract<ChartData, { kind: "pie" }> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {data.panels.map((panel, pi) => {
        const total = panel.slices.reduce((s, x) => s + x.value, 0) || 1;
        let cum = 0;
        const R = 80;
        const CX = 100;
        const CY = 100;
        return (
          <div key={pi} className="flex flex-col items-center">
            <div className="text-sm font-semibold text-ink mb-2">{panel.title}</div>
            <svg viewBox="0 0 200 200" className="w-44 h-44">
              {panel.slices.map((s, i) => {
                const startAngle = (cum / total) * 2 * Math.PI;
                cum += s.value;
                const endAngle = (cum / total) * 2 * Math.PI;
                const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
                const x1 = CX + R * Math.sin(startAngle);
                const y1 = CY - R * Math.cos(startAngle);
                const x2 = CX + R * Math.sin(endAngle);
                const y2 = CY - R * Math.cos(endAngle);
                const color = chartColor(s.color, i);
                return (
                  <path
                    key={i}
                    d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={color}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              })}
            </svg>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center max-w-xs">
              {panel.slices.map((s, i) => (
                <div key={i} className="inline-flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: chartColor(s.color, i) }}
                  />
                  <span className="text-ink/80">
                    {s.label} <span className="text-ink/50">{Math.round((s.value / total) * 100)}%</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcessDiagram({ data }: { data: Extract<ChartData, { kind: "process" }> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {data.steps.map((step, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white/70 backdrop-blur border border-white/70 p-4 flex gap-3"
        >
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 text-white font-bold flex items-center justify-center text-sm">
            {i + 1}
          </div>
          <div>
            <div className="font-semibold text-ink">{step.label}</div>
            <p className="mt-0.5 text-sm text-ink/65 leading-relaxed">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MapPanels({ data }: { data: Extract<ChartData, { kind: "map" }> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {data.panels.map((panel, i) => (
        <div
          key={i}
          className="rounded-2xl bg-white/70 backdrop-blur border border-white/70 p-4"
        >
          <div className="text-sm font-semibold uppercase tracking-wider text-violet-600">
            {panel.title}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-ink/75">
            {panel.features.map((f, j) => (
              <li key={j} className="flex gap-2">
                <span className="text-ink/30">·</span> {f}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: Array<{ name: string; color: string }> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
      {items.map((it) => (
        <div key={it.name} className="inline-flex items-center gap-1.5 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: it.color }} />
          <span className="text-ink/80">{it.name}</span>
        </div>
      ))}
    </div>
  );
}
