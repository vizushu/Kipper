"use client";
import { useState } from 'react';

export const CONCEPT_INITIAL_TEMPERATURE = 72;
export function adjustConceptTemperature(current: number, change: -1 | 1) {
  return Math.max(60, Math.min(85, current + change));
}
/** Local-only design demonstration: no device adapter, storage, telemetry or network. */
export default function SmartHomeConcept() {
  const [temperature, setTemperature] = useState(CONCEPT_INITIAL_TEMPERATURE);
  const [lights, setLights] = useState(false);
  return <details className="mt-5 rounded-xl border border-line bg-panel px-4 py-1 text-ink">
    <summary className="min-h-11 cursor-pointer py-3 text-sm">Smart-home concept <span className="ml-1 text-xs text-moss">· local demo</span></summary>
    <div className="pb-4">
      <p className="text-xs leading-6 text-moss">Local simulation only. No devices are connected.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>Example temperature</span>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Decrease simulated temperature" disabled={temperature <= 60} onClick={() => setTemperature(value => adjustConceptTemperature(value, -1))} className="flex h-11 w-11 items-center justify-center rounded-md border border-moss/60 disabled:opacity-40">−</button>
          <output aria-label="Simulated temperature" aria-live="polite" className="min-w-10 text-center tabular-nums">{temperature}°F</output>
          <button type="button" aria-label="Increase simulated temperature" disabled={temperature >= 85} onClick={() => setTemperature(value => adjustConceptTemperature(value, 1))} className="flex h-11 w-11 items-center justify-center rounded-md border border-moss/60 disabled:opacity-40">+</button>
        </div>
      </div>
      <button type="button" aria-label="Toggle simulated example lights" aria-pressed={lights} onClick={() => setLights(value => !value)} className="mt-4 min-h-11 rounded-md border border-moss/60 px-3 text-sm">Example lights: {lights ? 'on' : 'off'}</button>
      <p className="mt-3 text-xs leading-5 text-moss">Explore a future Kipper idea. These controls do not change the home or describe an included smart-home service.</p>
    </div>
  </details>;
}
