import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetDiscountCodes,
  useCreateDiscountCode,
  useUpdateDiscountCode,
  useDeleteDiscountCode,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Tag, Trash2, Percent, DollarSign } from "lucide-react";
import { format } from "date-fns";

type DiscountCode = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses?: number | null;
  useCount: number;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
};

export default function SellDiscounts() {
  const { data: codes, isLoading } = useGetDiscountCodes();
  const createCode = useCreateDiscountCode();
  const updateCode = useUpdateDiscountCode();
  const deleteCode = useDeleteDiscountCode();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as "percent" | "fixed_cents",
    discountValue: 10,
    maxUses: "" as string | number,
    expiresAt: "",
  });

  const handleCreate = async () => {
    if (!form.code.trim()) {
      toast({ title: "Code is required", variant: "destructive" });
      return;
    }
    try {
      await createCode.mutateAsync({
        code: form.code,
        discountType: form.discountType,
        discountValue: form.discountType === "percent" ? form.discountValue : Math.round(Number(form.discountValue) * 100),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      toast({ title: "Discount code created!" });
      setShowCreate(false);
      setForm({ code: "", discountType: "percent", discountValue: 10, maxUses: "", expiresAt: "" });
    } catch {
      toast({ title: "Error creating discount code", variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateCode.mutateAsync({ id, data: { active } });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCode.mutateAsync(deleteId);
      toast({ title: "Discount code deleted" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setDeleteId(null);
  };

  const formatDiscount = (code: DiscountCode) => {
    if (code.discountType === "percent") return `${code.discountValue}% off`;
    return `$${(code.discountValue / 100).toFixed(2)} off`;
  };

  return (
    <AppLayout>
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{(codes ?? []).length} discount code{(codes ?? []).length !== 1 ? "s" : ""}</p>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-brand-700 hover:bg-brand-800 text-white gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" /> Create Code
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-white rounded-lg border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : (codes ?? []).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Tag className="w-7 h-7 text-brand-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No discount codes yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create discount codes to offer special prices to buyers.</p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-brand-700 hover:bg-brand-800 text-white gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" /> Create Code
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Discount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Used</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Expires</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(codes ?? []).map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded text-xs">
                      {code.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1">
                      {code.discountType === "percent" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                      {formatDiscount(code)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {code.useCount}{code.maxUses ? ` / ${code.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {code.expiresAt ? format(new Date(code.expiresAt), "MMM d, yyyy") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={code.active}
                      onCheckedChange={(checked) => handleToggleActive(code.id, checked)}
                      className="data-[state=checked]:bg-brand-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteId(code.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input
                placeholder="e.g. SUMMER20"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Buyers enter this at checkout.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={form.discountType}
                  onValueChange={(v) => setForm({ ...form, discountType: v as "percent" | "fixed_cents" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed_cents">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.discountType === "percent" ? "Percentage (%)" : "Amount ($)"}</Label>
                <Input
                  type="number"
                  min={1}
                  max={form.discountType === "percent" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Uses (optional)</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
              </div>
              <div>
                <Label>Expires At (optional)</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createCode.isPending}
              className="bg-brand-700 hover:bg-brand-800 text-white"
            >
              {createCode.isPending ? "Creating..." : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete discount code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the discount code. Existing orders won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
    </AppLayout>
  );
}
