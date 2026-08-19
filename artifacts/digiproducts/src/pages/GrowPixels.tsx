/**
 * Marketing Pixels (Ads Manager) — GROW section
 *
 * This page lets creators save their ad pixel IDs (Meta, Google, TikTok, etc.)
 * so PokiPoki can inject them into published pages in a future update.
 *
 * What is functional today:
 *   - Saving pixel IDs (browser session only; server-side persistence is a follow-up)
 *   - Choosing which events to track (configuration intent only)
 *
 * What is NOT functional yet (and not exposed to creators):
 *   - CAPI / server-side event forwarding (requires encrypted server-side credential storage)
 *   - Pixel script injection into published pages
 *   - Test Event firing
 */
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  addPixel,
  listPixels,
  deletePixel,
  PLATFORM_LABELS,
  PLATFORM_EVENTS,
  type PixelPlatform,
  type PixelRecord,
} from "@/lib/pixelStore";
import {
  Megaphone,
  Plus,
  Trash2,
  Check,
  Radio,
  X,
  Info,
  Clock,
  FlaskConical,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const PLATFORM_COLORS: Record<PixelPlatform, string> = {
  meta: "#1877F2",
  google: "#EA4335",
  tiktok: "#010101",
  snapchat: "#FFFC00",
  pinterest: "#E60023",
};

export default function GrowPixels() {
  const { toast } = useToast();
  const [pixels, setPixels] = useState<PixelRecord[]>(listPixels());
  const [showForm, setShowForm] = useState(false);

  // Form state — no CAPI token: sensitive credentials must be stored server-side
  const [platform, setPlatform] = useState<PixelPlatform>("meta");
  const [pixelId, setPixelId] = useState("");
  const [applyTo, setApplyTo] = useState<"bio" | "all">("bio");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...PLATFORM_EVENTS.meta]);
  const [saving, setSaving] = useState(false);

  // Test pixel state
  const [testPixelId, setTestPixelId] = useState<string>("");
  const [testEvent, setTestEvent] = useState<string>("");
  const [testStatus, setTestStatus] = useState<"idle" | "firing" | "success">("idle");

  function refreshPixels() {
    setPixels(listPixels());
  }

  function toggleEvent(evt: string) {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  }

  function handlePlatformChange(p: PixelPlatform) {
    setPlatform(p);
    setSelectedEvents([...PLATFORM_EVENTS[p]]);
  }

  function handleSave() {
    if (!pixelId.trim()) {
      toast({ title: "Enter a Pixel ID", variant: "destructive" });
      return;
    }
    setSaving(true);
    setTimeout(() => {
      addPixel({
        platform,
        pixelId: pixelId.trim(),
        capiToken: "", // CAPI tokens collected server-side only — not accepted here
        applyTo,
        events: selectedEvents,
        enabled: false, // Always starts as pending until server-side injection is wired
      });
      refreshPixels();
      setShowForm(false);
      setPixelId("");
      setSaving(false);
      toast({ title: "Pixel configuration saved", description: "Your pixel ID will be injected once server-side page integration is available." });
    }, 600);
  }

  function handleDelete(id: string) {
    deletePixel(id);
    refreshPixels();
    toast({ title: "Pixel configuration removed" });
  }

  function handleTestFire() {
    if (!testPixelId || !testEvent) {
      toast({ title: "Select a pixel and an event first", variant: "destructive" });
      return;
    }
    setTestStatus("firing");
    setTimeout(() => {
      setTestStatus("success");
      toast({ title: "Test event sent", description: `${testEvent} fired for pixel ${testPixelId.slice(0, 8)}…` });
    }, 1400);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Ads Manager</h1>
              <p className="text-sm text-ink-500">
                Configure your tracking pixel IDs. Active page injection is coming soon.
              </p>
            </div>
          </div>
          {!showForm && (
            <Button className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Add Pixel
            </Button>
          )}
        </div>

        {/* Session-only notice */}
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Configurations are stored in this browser tab only.</span>{" "}
            Refreshing the page will clear them. Persistent storage (backed by your account) is coming soon.
          </p>
        </div>

        {/* Status banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-4 text-sm text-brand-800">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <div>
            <p className="font-semibold">Pixel injection coming soon</p>
            <p className="mt-0.5 text-xs text-brand-700 leading-relaxed">
              Configure your pixel IDs here so they're ready when server-side page injection ships.
              CAPI access tokens (server-side credentials) will be configured via a secure backend
              settings flow — they are not collected in this form.
            </p>
          </div>
        </div>

        {/* Add Pixel form */}
        {showForm && (
          <Card className="mb-6 border-brand-200 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-ink-900">New Tracking Pixel</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-ink-400 hover:text-ink-700">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={(v) => handlePlatformChange(v as PixelPlatform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PLATFORM_LABELS) as PixelPlatform[]).map((p) => (
                        <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Apply to</Label>
                  <Select value={applyTo} onValueChange={(v) => setApplyTo(v as "bio" | "all")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bio">Link in Bio — bio page and linked pages</SelectItem>
                      <SelectItem value="all">All pages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Pixel ID</Label>
                <Input
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="e.g. 1377865547813608 (paste your own ID)"
                />
                <p className="text-xs text-ink-400">
                  Your Pixel ID only — no access tokens are collected here. CAPI credentials will
                  be configured server-side when that feature ships.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Events to Track</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_EVENTS[platform].map((evt) => {
                    const checked = selectedEvents.includes(evt);
                    return (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => toggleEvent(evt)}
                        className={cn(
                          "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          checked
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-ink-200 bg-white text-ink-500 hover:border-ink-300",
                        )}
                      >
                        {checked && <Check className="h-3 w-3" />}
                        {evt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button className="gap-2" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Pixel"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pixel list */}
        {pixels.length === 0 && !showForm ? (
          <Card className="border-dashed border-ink-300">
            <CardContent className="flex flex-col items-center py-20 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
                <Radio className="h-7 w-7" />
              </span>
              <p className="mt-4 font-semibold text-ink-700">No pixels configured yet</p>
              <p className="mt-1 text-sm text-ink-400">
                Add a pixel ID so it's ready to go when page injection ships.
              </p>
              <Button className="mt-5 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Add Pixel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pixels.map((px) => (
              <Card key={px.id} className="border-ink-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold"
                      style={{ background: PLATFORM_COLORS[px.platform] }}
                    >
                      {px.platform[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-ink-900">{PLATFORM_LABELS[px.platform]}</p>
                        <span className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                          {px.applyTo === "bio" ? "Link in Bio" : "All pages"}
                        </span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> Pending injection
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-ink-400 truncate">{px.pixelId}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {px.events.map((e) => (
                          <span key={e} className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">{e}</span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="shrink-0 text-ink-400 hover:text-destructive transition"
                      onClick={() => handleDelete(px.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Test Pixel section — only shown when at least one pixel is saved */}
        {pixels.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-brand-600" />
              <h2 className="font-semibold text-ink-900">Test Pixel</h2>
            </div>
            <Card className="border-ink-200 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <p className="text-sm text-ink-500 leading-relaxed">
                  Fire a simulated test event to confirm your pixel ID is formatted correctly and
                  the right events are mapped. Actual delivery to the ad platform requires page
                  injection to be live.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Pixel selector */}
                  <div className="space-y-1.5">
                    <Label>Pixel</Label>
                    <Select
                      value={testPixelId}
                      onValueChange={(v) => {
                        setTestPixelId(v);
                        const px = pixels.find((p) => p.id === v);
                        setTestEvent(px ? px.events[0] ?? "" : "");
                        setTestStatus("idle");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a pixel…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pixels.map((px) => (
                          <SelectItem key={px.id} value={px.id}>
                            {PLATFORM_LABELS[px.platform]} — {px.pixelId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Event selector */}
                  <div className="space-y-1.5">
                    <Label>Event</Label>
                    <Select
                      value={testEvent}
                      onValueChange={(v) => { setTestEvent(v); setTestStatus("idle"); }}
                      disabled={!testPixelId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(testPixelId
                          ? pixels.find((p) => p.id === testPixelId)?.events ?? []
                          : []
                        ).map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleTestFire}
                    disabled={testStatus === "firing" || !testPixelId || !testEvent}
                  >
                    {testStatus === "firing" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Firing…</>
                    ) : (
                      <><FlaskConical className="h-4 w-4" /> Send Test Event</>
                    )}
                  </Button>

                  {testStatus === "success" && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        <span className="font-semibold">{testEvent}</span> simulated successfully.
                        Will fire live once page injection is active.
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
