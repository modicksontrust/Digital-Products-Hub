import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetBrandKit, useUpdateBrandKit, getGetBrandKitQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

const FONTS = [
  "Inter", "Georgia", "Playfair Display", "Lato", "Merriweather",
  "Montserrat", "Open Sans", "Raleway", "Roboto", "Source Serif Pro",
];

export default function AdminBrandKit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: brand, isLoading } = useGetBrandKit({ query: { queryKey: getGetBrandKitQueryKey() } });
  const update = useUpdateBrandKit();

  const [form, setForm] = useState({
    logoUrl: "",
    primaryColor: "#6C47FF",
    secondaryColor: "#F5F3FF",
    accentColor: "#22C55E",
    headingFont: "Inter",
    bodyFont: "Inter",
    defaultAuthor: "",
    footerText: "",
    defaultDisclaimer: "",
  });

  useEffect(() => {
    if (brand) {
      setForm({
        logoUrl: brand.logoUrl ?? "",
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        accentColor: brand.accentColor,
        headingFont: brand.headingFont,
        bodyFont: brand.bodyFont,
        defaultAuthor: brand.defaultAuthor ?? "",
        footerText: brand.footerText ?? "",
        defaultDisclaimer: brand.defaultDisclaimer ?? "",
      });
    }
  }, [brand]);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    update.mutate(
      {
        data: {
          logoUrl: form.logoUrl || undefined,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          accentColor: form.accentColor,
          headingFont: form.headingFont,
          bodyFont: form.bodyFont,
          defaultAuthor: form.defaultAuthor || undefined,
          footerText: form.footerText || undefined,
          defaultDisclaimer: form.defaultDisclaimer || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBrandKitQueryKey() });
          toast({ title: "Brand Kit saved" });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center h-64 text-ink-400">Loading…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900">Brand Kit</h1>
            <p className="text-ink-500 mt-1">Global branding applied to generated eBooks and sales pages.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white gap-2"
          >
            <Save className="w-4 h-4" /> {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Logo */}
          <Section title="Logo">
            <Field label="Logo URL">
              <Input
                placeholder="https://…/logo.png"
                value={form.logoUrl}
                onChange={e => set("logoUrl")(e.target.value)}
                className="rounded-xl"
              />
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
              )}
            </Field>
          </Section>

          {/* Colors */}
          <Section title="Colours">
            <div className="grid grid-cols-3 gap-4">
              <ColorField label="Primary" value={form.primaryColor} onChange={set("primaryColor")} />
              <ColorField label="Secondary" value={form.secondaryColor} onChange={set("secondaryColor")} />
              <ColorField label="Accent" value={form.accentColor} onChange={set("accentColor")} />
            </div>
          </Section>

          {/* Fonts */}
          <Section title="Typography">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Heading Font">
                <Select value={form.headingFont} onValueChange={set("headingFont")}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Body Font">
                <Select value={form.bodyFont} onValueChange={set("bodyFont")}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          {/* Defaults */}
          <Section title="Defaults">
            <Field label="Default Author Name">
              <Input placeholder="e.g. Your Brand" value={form.defaultAuthor} onChange={e => set("defaultAuthor")(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label="Default Footer Text">
              <Input placeholder="© 2026 Your Brand. All rights reserved." value={form.footerText} onChange={e => set("footerText")(e.target.value)} className="rounded-xl" />
            </Field>
            <Field label="Default Disclaimer">
              <Textarea placeholder="Results may vary…" value={form.defaultDisclaimer} onChange={e => set("defaultDisclaimer")(e.target.value)} className="rounded-xl resize-none" rows={3} />
            </Field>
          </Section>
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ink-200 rounded-2xl shadow-sm p-6">
      <h2 className="font-semibold text-ink-900 mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-ink-700">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-ink-700">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-ink-200 cursor-pointer p-0.5 bg-white"
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="rounded-xl font-mono text-sm flex-1"
          maxLength={7}
        />
      </div>
    </div>
  );
}
