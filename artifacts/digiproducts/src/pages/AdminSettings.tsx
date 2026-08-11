import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useGetSettings({}, { query: { queryKey: getGetSettingsQueryKey() } });
  const update = useUpdateSettings();

  const [form, setForm] = useState({
    sequentialUnlock: false,
    allowManualComplete: false,
    approvalWorkflowEnabled: false,
    uploaderCanGenerate: false,
    managerWeeklyGrantCap: 100,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        sequentialUnlock: settings.sequentialUnlock,
        allowManualComplete: settings.allowManualComplete,
        approvalWorkflowEnabled: settings.approvalWorkflowEnabled,
        uploaderCanGenerate: settings.uploaderCanGenerate,
        managerWeeklyGrantCap: settings.managerWeeklyGrantCap ?? 100,
      });
    }
  }, [settings]);

  const toggle = (key: keyof typeof form) => (val: boolean) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    update.mutate(
      { data: form },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings saved" });
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
      <div className="p-8 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900">Platform Settings</h1>
            <p className="text-ink-500 mt-1">Global flags that control platform behaviour.</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={update.isPending}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white gap-2"
          >
            <Save className="w-4 h-4" /> {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="bg-white border border-ink-200 rounded-2xl shadow-sm divide-y divide-ink-100">
          <SettingRow
            label="Sequential Course Unlock"
            description="Learners must complete each lesson before unlocking the next one."
            checked={form.sequentialUnlock}
            onChange={toggle("sequentialUnlock")}
          />
          <SettingRow
            label="Allow Manual Complete"
            description="Learners can mark lessons complete without watching/reading them."
            checked={form.allowManualComplete}
            onChange={toggle("allowManualComplete")}
          />
          <SettingRow
            label="Approval Workflow"
            description="Products must be submitted for manager review before publishing."
            checked={form.approvalWorkflowEnabled}
            onChange={toggle("approvalWorkflowEnabled")}
          />
          <SettingRow
            label="Uploaders Can Generate"
            description="Users with the Uploader role can run AI generation (costs credits)."
            checked={form.uploaderCanGenerate}
            onChange={toggle("uploaderCanGenerate")}
          />

          {/* Manager weekly grant cap — numeric */}
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-ink-900">Manager Weekly Grant Cap</p>
                <p className="text-sm text-ink-500 mt-0.5">
                  Maximum credits a manager can grant to their team per week (0 = unlimited).
                </p>
              </div>
              <Input
                type="number"
                min={0}
                value={form.managerWeeklyGrantCap}
                onChange={e => setForm(f => ({ ...f, managerWeeklyGrantCap: parseInt(e.target.value) || 0 }))}
                className="rounded-xl w-28 text-right"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SettingRow({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="px-6 py-5 flex items-start justify-between gap-4">
      <div className="flex-1">
        <Label className="font-medium text-ink-900 cursor-pointer">{label}</Label>
        <p className="text-sm text-ink-500 mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
