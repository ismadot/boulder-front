import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { JobSummary } from '../lib/api';

// ─── Chart data shape ───────────────────────────────────────────────
interface Metric {
  name: string;
  value: number;     // 0-100 normalised score
  raw: string;       // human-readable raw value
  tip: string;       // tooltip explanation
}

function buildMetrics(s: JobSummary): Metric[] {
  const metrics: Metric[] = [
    {
      name: 'Detección',
      value: s.detection_rate_pct,
      raw: `${s.detection_rate_pct}%`,
      tip: 'Porcentaje de frames donde se detectó al escalador. Mayor = mejor cobertura.',
    },
    {
      name: 'Esqueleto',
      value: s.avg_skeleton_completeness_pct,
      raw: `${s.avg_skeleton_completeness_pct}%`,
      tip: 'Completitud media del esqueleto (17 keypoints). Mayor = menos oclusiones.',
    },
    {
      name: 'Confianza',
      value: Math.round(s.avg_detection_confidence * 100),
      raw: `${(s.avg_detection_confidence * 100).toFixed(1)}%`,
      tip: 'Confianza media del modelo en la detección de pose.',
    },
    {
      name: 'Movimientos',
      value: Math.min(100, Object.values(s.movement_counts).reduce((a, b) => a + b, 0) * 5),
      raw: `${Object.values(s.movement_counts).reduce((a, b) => a + b, 0)}`,
      tip: 'Total de movimientos técnicos detectados (Flag, Heel Hook, Drop Knee…).',
    },
  ];

  if (s.vertical_gain_m != null) {
    metrics.push({
      name: 'Ganancia vert.',
      value: Math.min(100, Math.round(s.vertical_gain_m * 10)),
      raw: `${s.vertical_gain_m.toFixed(2)} m`,
      tip: 'Metros de ascenso vertical neto. Mide cuánto escalaste realmente.',
    });
  }
  if (s.energy_kj != null) {
    metrics.push({
      name: 'Energía',
      value: Math.min(100, Math.round(s.energy_kj * 20)),
      raw: `${s.energy_kj.toFixed(2)} kJ`,
      tip: 'Energía potencial acumulada (m×g×h). Refleja el trabajo total contra la gravedad.',
    });
  }
  if (s.avg_climbing_power_w != null) {
    metrics.push({
      name: 'Potencia media',
      value: Math.min(100, Math.round(s.avg_climbing_power_w / 3)),
      raw: `${s.avg_climbing_power_w.toFixed(1)} W`,
      tip: 'Potencia media de escalada (W = kg × g × velocidad_vertical). Útil para comparar intentos.',
    });
  }
  if (s.max_climbing_power_w != null) {
    metrics.push({
      name: 'Pot. máxima',
      value: Math.min(100, Math.round(s.max_climbing_power_w / 5)),
      raw: `${s.max_climbing_power_w.toFixed(1)} W`,
      tip: 'Pico de potencia — el momento de mayor intensidad en la escalada.',
    });
  }

  return metrics;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Metric }> }) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 max-w-60 shadow-lg">
      <p className="text-sm font-semibold text-emerald-400">{m.name}: {m.raw}</p>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{m.tip}</p>
    </div>
  );
}

// ─── Status summary text ────────────────────────────────────────────
function statusSummary(s: JobSummary): { label: string; color: string; description: string } {
  const score =
    (s.detection_rate_pct + s.avg_skeleton_completeness_pct + s.avg_detection_confidence * 100) / 3;

  if (score >= 80) {
    return {
      label: 'Excelente',
      color: 'text-emerald-400',
      description:
        'La calidad de detección es alta. Las métricas biomecánicas son confiables para analizar la técnica.',
    };
  }
  if (score >= 60) {
    return {
      label: 'Buena',
      color: 'text-yellow-400',
      description:
        'La detección es aceptable. Algunas oclusiones pueden afectar métricas de potencia y energía.',
    };
  }
  return {
    label: 'Baja',
    color: 'text-red-400',
    description:
      'La detección es inconsistente. Revisa ángulo de cámara y visibilidad del escalador para mejorar resultados.',
  };
}

// ─── Component ──────────────────────────────────────────────────────
export function ClimbingStatusChart({ summary }: { summary: JobSummary }) {
  const metrics = buildMetrics(summary);
  const status = statusSummary(summary);
  const hasBio = summary.vertical_gain_m != null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Status de la escalada
        </h3>
        <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              dataKey="value"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{status.description}</p>

      {/* Biomechanics summary cards */}
      {hasBio && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Biomecánica
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ganancia vertical', value: `${summary.vertical_gain_m!.toFixed(2)} m`, tip: 'Metros de ascenso neto' },
              { label: 'Energía total', value: `${summary.energy_kj!.toFixed(2)} kJ`, tip: 'Trabajo contra la gravedad' },
              { label: 'Potencia media', value: `${summary.avg_climbing_power_w!.toFixed(1)} W`, tip: 'W = kg × g × v_vertical' },
              { label: 'Potencia máx', value: `${summary.max_climbing_power_w!.toFixed(1)} W`, tip: 'Pico de intensidad' },
            ].map((c) => (
              <div key={c.label} className="bg-gray-800 rounded-lg px-3 py-2" title={c.tip}>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-sm font-semibold text-gray-100 mt-0.5">{c.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 leading-relaxed">
            Estas métricas se calculan a partir de tu altura y peso usando proporciones antropométricas
            de Winter (2009) y De Leva (1996). La potencia mide tu velocidad de ascenso, la energía
            el trabajo total, y la ganancia vertical cuántos metros subiste realmente.
          </p>
        </div>
      )}
    </div>
  );
}
