import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetCreditCosts, useUpdateCreditCosts, useGetCreditReport,
  useGetUsers, getGetUsersQueryKey,
  getGetCreditCostsQueryKey, getGetCreditReportQueryKey,
  useGrantCredits,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Coins, TrendingDown, User } from "lucide-react";
import type { User as UserType } from "@workspace/api-client-react";

export default function AdminCredits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: costs, isLoading: costsLoading } = useGetCreditCosts({ query: { queryKey: getGetCreditCostsQueryKey() } });
  const { data: report, isLoading: reportLoading } = useGetCreditReport({ query: { queryKey: getGetCreditReportQueryKey() } });
  const { data: users } = useGetUsers({ query: { queryKey: getGetUsersQueryKey() } });

  const updateCosts = useUpdateCreditCosts();
  const grantCredits = useGrantCredits();

  // Local edits for the costs table
  const [editedCosts, setEditedCosts] = useState<Record<string, number>>({});

  // Grant credits dialog
  const [grantUser, setGrantUser] = useState<UserType | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantNote, setGrantNote] = useState("");

  const handleCostChange = (operation: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) setEditedCosts(prev => ({ ...prev, [operation]: num }));
  };

  const handleSaveCosts = () => {
    if (!costs) return;
    const merged = costs.map(c => ({
      operation: c.operation,
      cost: editedCosts[c.operation] ?? c.cost,
      label: c.label,
    }));
    updateCosts.mutate({ data: { costs: merged } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCreditCostsQueryKey() });
        setEditedCosts({});
        toast({ title: "Credit costs updated" });
      },
      onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleGrant = () => {
    if (!grantUser) return;
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount === 0) return;
    grantCredits.mutate(
      { userId: grantUser.id, data: { amount, note: grantNote.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          toast({ title: `${amount > 0 ? "+" : ""}${amount} credits applied to ${grantUser.fullName}` });
          setGrantUser(null); setGrantAmount(""); setGrantNote("");
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const hasPendingEdits = Object.keys(editedCosts).length > 0;

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-ink-900">Credits</h1>
          <p className="text-ink-500 mt-1">Manage credit costs and usage across the platform.</p>
        </div>

        <Tabs defaultValue="costs">
          <TabsList className="bg-ink-100 mb-6">
            <TabsTrigger value="costs" className="gap-1.5"><Coins className="w-3.5 h-3.5" /> Credit Costs</TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5"><TrendingDown className="w-3.5 h-3.5" /> Usage Report</TabsTrigger>
            <TabsTrigger value="grant" className="gap-1.5"><User className="w-3.5 h-3.5" /> Grant Credits</TabsTrigger>
          </TabsList>

          {/* ── Credit Costs ── */}
          <TabsContent value="costs">
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
                <p className="font-semibold text-ink-900">Operation Costs</p>
                <Button
                  size="sm"
                  disabled={!hasPendingEdits || updateCosts.isPending}
                  onClick={handleSaveCosts}
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
                >
                  <Save className="w-4 h-4" /> {updateCosts.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-ink-50">
                    <TableHead>Operation</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right w-36">Cost (credits)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costsLoading && (
                    <TableRow><TableCell colSpan={3} className="text-center py-12 text-ink-400">Loading…</TableCell></TableRow>
                  )}
                  {costs?.map(c => (
                    <TableRow key={c.operation}>
                      <TableCell className="font-mono text-sm text-ink-700">{c.operation}</TableCell>
                      <TableCell className="text-ink-500 text-sm">{c.label ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          value={editedCosts[c.operation] ?? c.cost}
                          onChange={e => handleCostChange(c.operation, e.target.value)}
                          className="h-8 w-24 text-right rounded-lg ml-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Usage Report ── */}
          <TabsContent value="report">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By user */}
              <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-ink-100">
                  <p className="font-semibold text-ink-900">By User</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-ink-50">
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportLoading && (
                      <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400">Loading…</TableCell></TableRow>
                    )}
                    {!reportLoading && report?.byUser.length === 0 && (
                      <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400">No data yet</TableCell></TableRow>
                    )}
                    {report?.byUser.map(row => (
                      <TableRow key={row.userId}>
                        <TableCell className="text-sm">{row.userName}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{row.spent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* By operation */}
              <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-ink-100">
                  <p className="font-semibold text-ink-900">By Operation</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-ink-50">
                      <TableHead>Operation</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportLoading && (
                      <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400">Loading…</TableCell></TableRow>
                    )}
                    {!reportLoading && report?.byOperation.length === 0 && (
                      <TableRow><TableCell colSpan={2} className="text-center py-8 text-ink-400">No data yet</TableCell></TableRow>
                    )}
                    {report?.byOperation.map(row => (
                      <TableRow key={row.operation}>
                        <TableCell className="font-mono text-sm text-ink-700">{row.operation}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{row.spent}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* ── Grant Credits ── */}
          <TabsContent value="grant">
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-ink-50">
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!users && (
                    <TableRow><TableCell colSpan={3} className="text-center py-12 text-ink-400">Loading…</TableCell></TableRow>
                  )}
                  {users?.filter(u => u.status !== "deactivated").map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium text-ink-900">{u.fullName}</p>
                        <p className="text-xs text-ink-500">{u.email}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">{u.creditsBalance}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-1.5"
                          onClick={() => { setGrantUser(u); setGrantAmount(""); setGrantNote(""); }}
                        >
                          <Coins className="w-3.5 h-3.5" /> Grant
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Grant dialog */}
      <Dialog open={!!grantUser} onOpenChange={open => !open && setGrantUser(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Grant Credits — {grantUser?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ink-500">Current balance: <strong>{grantUser?.creditsBalance}</strong></p>
            <Input
              type="number"
              placeholder="Amount (use negative to deduct)"
              value={grantAmount}
              onChange={e => setGrantAmount(e.target.value)}
              className="rounded-xl"
            />
            <Input
              placeholder="Note (optional)"
              value={grantNote}
              onChange={e => setGrantNote(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setGrantUser(null)}>Cancel</Button>
            <Button
              className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
              disabled={!grantAmount || isNaN(parseInt(grantAmount)) || parseInt(grantAmount) === 0 || grantCredits.isPending}
              onClick={handleGrant}
            >
              {grantCredits.isPending ? "Saving…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
