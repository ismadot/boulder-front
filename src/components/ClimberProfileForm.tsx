import { useState, useCallback } from 'react';
import { useAppStore } from '../stores/app';
import { saveProfile } from '../lib/profile';

export function ClimberProfileForm() {
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.climberProfile);
  const setClimberProfile = useAppStore((s) => s.setClimberProfile);

  const [height, setHeight] = useState(profile?.height_m?.toString() ?? '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const h = height ? parseFloat(height) : null;
    const w = weight ? parseFloat(weight) : null;
    if ((h !== null && (isNaN(h) || h <= 0 || h > 3)) || (w !== null && (isNaN(w) || w <= 0 || w > 300))) return;

    const updated = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      height_m: h,
      weight_kg: w,
    };
    setSaving(true);
    try {
      await saveProfile(updated);
      setClimberProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [user, height, weight, setClimberProfile]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Perfil del escalador
      </p>
      <p className="text-xs text-gray-500">
        Introduce tus datos para habilitar métricas biomecánicas (potencia, energía, ganancia vertical).
      </p>
      <div className="flex items-end gap-3">
        <label className="flex-1">
          <span className="block text-xs text-gray-400 mb-1">Altura (m)</span>
          <input
            type="number"
            step="0.01"
            min="0.5"
            max="2.5"
            placeholder="1.75"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </label>
        <label className="flex-1">
          <span className="block text-xs text-gray-400 mb-1">Peso (kg)</span>
          <input
            type="number"
            step="0.1"
            min="20"
            max="200"
            placeholder="70"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm rounded-md font-medium transition-colors shrink-0"
        >
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
