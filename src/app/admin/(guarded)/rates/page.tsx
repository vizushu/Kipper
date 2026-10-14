"use client";
/**
 * /admin/rates — nightly rate overrides + pricing settings.
 *
 * Settings: cleaning fee, tax rate, min/max stay. Defaults that Renier has
 * not confirmed carry visible SAMPLE badges (they come from the static
 * fallback in src/data/property.ts).
 */
import { useCallback, useEffect, useState } from "react";
import { Button, SampleBadge } from "@/components/ui";
import { IconX } from "@/components/icons";
import { CASA_PACIFICA_ID, PROPERTY } from "@/data/property";
import { formatCents, type RateOverride } from "@/lib/types";

interface Settings {
  cleaningFeeCents: number;
  taxRatePct: number;
  minStayNights: number;
  maxStayNights: number;
  isSample?: boolean;
}

const FALLBACK_SETTINGS: Settings = {
  cleaningFeeCents: PROPERTY.cleaningFeeCents,
  taxRatePct: PROPERTY.taxRatePct,
  minStayNights: PROPERTY.minStayNights,
  maxStayNights: PROPERTY.maxStayNights,
  isSample: true,
};

export default function AdminRatesPage() {
  const [settings, setSettings] = useState<Settings>(FALLBACK_SETTINGS);
  const [draft, setDraft] = useState(FALLBACK_SETTINGS);
  const [overrides, setOverrides] = useState<RateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [ovForm, setOvForm] = useState({ date: "", rate: "" });
  const [ovError, setOvError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const now = new Date();
      const from = now.toISOString().slice(0, 10);
      const toDate = new Date(now.getFullYear(), now.getMonth() + 3, 0);
      const to = toDate.toISOString().slice(0, 10);
      const [sRes, oRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch(
          `/api/admin/rates?propertyId=${CASA_PACIFICA_ID}&from=${from}&to=${to}`,
        ),
      ]);
      if (sRes.ok) {
        const data = (await sRes.json()) as { settings: Settings };
        setSettings(data.settings);
        setDraft(data.settings);
      }
      if (oRes.ok) {
        const data = (await oRes.json()) as { overrides: RateOverride[] };
        setOverrides(data.overrides ?? []);
      }
      if (!sRes.ok && !oRes.ok) setError("Settings API not reachable — showing sample defaults.");
    } catch {
      setError("Settings API not reachable — showing sample defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cleaningFeeCents: Math.round(Number(draft.cleaningFeeCents)),
          taxRatePct: Number(draft.taxRatePct),
          minStayNights: Number(draft.minStayNights),
          maxStayNights: Number(draft.maxStayNights),
        }),
      });
      if (!res.ok) throw new Error("save");
      setSavedMsg("Settings saved.");
      await load();
    } catch {
      setSavedMsg("Couldn't save — is the settings API running?");
    } finally {
      setSaving(false);
    }
  }

  async function addOverride(e: React.FormEvent) {
    e.preventDefault();
    setOvError("");
    if (!ovForm.date || !ovForm.rate || Number(ovForm.rate) <= 0) {
      setOvError("Pick a date and a nightly rate in dollars.");
      return;
    }
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: CASA_PACIFICA_ID,
          date: ovForm.date,
          rateCents: Math.round(Number(ovForm.rate) * 100),
        }),
      });
      if (!res.ok) throw new Error("save");
      setOvForm({ date: "", rate: "" });
      await load();
    } catch {
      setOvError("Couldn't save that override.");
    }
  }

  async function removeOverride(id: string) {
    try {
      const res = await fetch(`/api/admin/rates/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) await load();
    } catch {
      /* non-fatal; list refreshes on next load */
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink">Rates & settings</h1>
      <p className="mt-1 text-sm text-stone-500">Casa Pacifica · nightly overrides and pricing defaults</p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-cream" />
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <form onSubmit={saveSettings} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
            <h2 className="font-display text-lg font-medium text-ink">Pricing settings</h2>
            <div className="mt-4 space-y-4">
              <SettingField
                label="Cleaning fee"
                hint="Flat fee per stay, in dollars."
                sample={settings.isSample}
              >
                <div className="flex items-center gap-2">
                  <span className="text-stone-500">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={(draft.cleaningFeeCents / 100).toFixed(0)}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, cleaningFeeCents: Number(e.target.value) * 100 }))
                    }
                    className="w-28 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                  />
                </div>
              </SettingField>
              <SettingField
                label="Lodging tax rate"
                hint="Percent applied to the stay subtotal."
                sample={settings.isSample}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={draft.taxRatePct}
                    onChange={(e) => setDraft((d) => ({ ...d, taxRatePct: Number(e.target.value) }))}
                    className="w-28 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                  />
                  <span className="text-stone-500">%</span>
                </div>
              </SettingField>
              <SettingField label="Minimum stay" hint="Nights.">
                <input
                  type="number"
                  min={1}
                  value={draft.minStayNights}
                  onChange={(e) => setDraft((d) => ({ ...d, minStayNights: Number(e.target.value) }))}
                  className="w-28 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                />
              </SettingField>
              <SettingField label="Maximum stay" hint="Nights.">
                <input
                  type="number"
                  min={1}
                  value={draft.maxStayNights}
                  onChange={(e) => setDraft((d) => ({ ...d, maxStayNights: Number(e.target.value) }))}
                  className="w-28 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                />
              </SettingField>
            </div>
            {savedMsg && <p className="mt-3 text-sm text-moss">{savedMsg}</p>}
            <Button type="submit" disabled={saving} className="mt-5">
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </form>

          <div className="space-y-6">
            <form onSubmit={addOverride} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
              <h2 className="font-display text-lg font-medium text-ink">Nightly rate override</h2>
              <p className="mt-1 text-sm text-stone-500">
                Set a specific nightly rate for one date (e.g. holidays, events).
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-stone-500">Date</span>
                  <input
                    type="date"
                    value={ovForm.date}
                    onChange={(e) => setOvForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-stone-500">Rate ($)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={ovForm.rate}
                    onChange={(e) => setOvForm((f) => ({ ...f, rate: e.target.value }))}
                    placeholder="425"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                  />
                </label>
              </div>
              {ovError && <p role="alert" className="mt-2 text-sm text-red-600">{ovError}</p>}
              <Button type="submit" variant="secondary" className="mt-4 w-full">
                Add override
              </Button>
            </form>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-card">
              <h2 className="font-display text-lg font-medium text-ink">
                Upcoming overrides ({overrides.length})
              </h2>
              {overrides.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">
                  No overrides in the next 3 months. Base rate {formatCents(PROPERTY.baseNightlyCents)}/night applies.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {overrides.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between rounded-xl bg-cream px-3 py-2.5 text-sm"
                    >
                      <span>
                        <span className="font-medium text-ink">{o.date}</span>
                        <span className="ml-2 text-stone-600">{formatCents(o.rateCents)}/night</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeOverride(o.id)}
                        aria-label={`Remove override for ${o.date}`}
                        className="rounded-full p-1.5 text-stone-500 hover:bg-white hover:text-red-600"
                      >
                        <IconX className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingField({
  label,
  hint,
  sample,
  children,
}: {
  label: string;
  hint: string;
  sample?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          {label} {sample && <SampleBadge />}
        </p>
        <p className="text-xs text-stone-500">{hint}</p>
      </div>
      {children}
    </div>
  );
}
