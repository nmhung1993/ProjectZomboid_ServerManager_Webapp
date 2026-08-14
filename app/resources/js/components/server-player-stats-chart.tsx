import { useId } from 'react';

export type ChartPoint = {
    label: string;
    value: number;
};

type ServerPlayerStatsChartProps = {
    data: ChartPoint[];
    color?: string;
    formatValue?: (value: number) => string;
};

const WIDTH = 600;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 26, left: 44 };

export default function ServerPlayerStatsChart({
    data,
    color = 'hsl(221, 83%, 53%)',
    formatValue = (v) => String(v),
}: ServerPlayerStatsChartProps) {
    const gradientId = useId().replace(/:/g, '');

    if (data.length === 0) {
        return (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                No data available yet
            </div>
        );
    }

    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;

    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);

    const range = max - min || 1;
    const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

    const points = data.map((d, i) => {
        const x = PAD.left + i * stepX;
        const y = PAD.top + innerHeight - ((d.value - min) / range) * innerHeight;
        return { x, y, ...d };
    });

    const pathLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const pathArea = `${pathLine} L${points[points.length - 1].x.toFixed(2)},${(PAD.top + innerHeight).toFixed(2)} L${points[0].x.toFixed(2)},${(PAD.top + innerHeight).toFixed(2)} Z`;

    const yTicks = 4;
    const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
        const value = min + (range / yTicks) * i;
        const y = PAD.top + innerHeight - (innerHeight / yTicks) * i;
        return { value, y };
    });

    const labelStep = Math.max(1, Math.ceil(data.length / 8));

    return (
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {gridLines.map((g, i) => (
                <g key={i}>
                    <line
                        x1={PAD.left}
                        y1={g.y}
                        x2={WIDTH - PAD.right}
                        y2={g.y}
                        stroke="hsl(240, 5%, 88%)"
                        strokeWidth={1}
                    />
                    <text
                        x={PAD.left - 6}
                        y={g.y + 3}
                        textAnchor="end"
                        fontSize={10}
                        fill="hsl(240, 4%, 46%)"
                    >
                        {formatValue(g.value)}
                    </text>
                </g>
            ))}

            <path d={pathArea} fill={`url(#${gradientId})`} />
            <path d={pathLine} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {points.map((p, i) =>
                i % labelStep === 0 || i === points.length - 1 ? (
                    <text key={i} x={p.x} y={HEIGHT - 6} textAnchor="middle" fontSize={10} fill="hsl(240, 4%, 46%)">
                        {p.label}
                    </text>
                ) : null,
            )}

            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
            ))}
        </svg>
    );
}