import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetUsers, useUpdateUser, useGrantCredits,
  useGetInvitations, useCreateInvitation, useRevokeInvitation,
  getGetUsersQueryKey, getGetInvitationsQueryKey,
} from "@workspace/api-client-react";
import type { Invitation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, MoreVertical, Coins, ShieldCheck, UserX, Copy, Check,
  UserPlus, Mail, Clock, XCircle,
} from "lucide-react";
import type { User, UserUpdateRole, UserUpdateStatus } from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  active:      "bg-lime-100 text-lime-800",
  invited:     "bg-blue-100 text-blue-800",
  suspended:   "bg-amber-100 text-amber-800",
  deactivated: "bg-ink-100 text-ink-500",
};

const INVITE_STATUS_COLORS: Record<string, string> = {
  pending:  "bg-blue-100 text-blue-800",
  expired:  "bg-amber-100 text-amber-800",
  revoked:  "bg-ink-100 text-ink-500",
  accepted: "bg-lime-100 text-lime-800",
};

const ROLES = ["creator", "uploader", "marketer", "manager", "admin"] as const;

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useGetUsers({ query: { queryKey: getGetUsersQueryKey() } });
  const { data: invitations, isLoading: invitationsLoading } = useGetInvitations({
    query: { queryKey: getGetInvitationsQueryKey() },
  } as any);
  const updateUser = useUpdateUser();
  const grantCredits = useGrantCredits();
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();

  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Grant credits dialog
  const [creditUser, setCreditUser] = useState<User | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("creator");
  const [inviteResult, setInviteResult] = useState<Invitation | null>(null);

  const filtered = (users ?? []).filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Only show pending/expired invitations in the section
  const pendingInvitations = (invitations ?? []).filter(
    inv => inv.status === "pending" || inv.status === "expired"
  );

  const handleRoleChange = (userId: string, role: string) => {
    updateUser.mutate({ userId, data: { role: role as UserUpdateRole } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        toast({ title: "Role updated" });
      },
      onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleStatusChange = (userId: string, status: string) => {
    updateUser.mutate({ userId, data: { status: status as UserUpdateStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
        toast({ title: "Status updated" });
      },
      onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleGrantCredits = () => {
    if (!creditUser) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount === 0) return;
    grantCredits.mutate(
      { userId: creditUser.id, data: { amount, note: creditNote.trim() || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
          toast({ title: `${amount > 0 ? "+" : ""}${amount} credits applied to ${creditUser.fullName}` });
          setCreditUser(null); setCreditAmount(""); setCreditNote("");
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const copyLink = (id: string, acceptUrl: string | null | undefined) => {
    if (!acceptUrl) return;
    const full = `${window.location.origin}${acceptUrl}`;
    navigator.clipboard.writeText(full);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyInviteLink = (user: User & { inviteLink?: string }) => {
    const link = (user as any).inviteLink;
    if (!link) return;
    copyLink(user.id, link);
  };

  const handleSendInvite = () => {
    if (!inviteEmail.trim() || !inviteRole) return;
    createInvitation.mutate(
      { data: { email: inviteEmail.trim(), role: inviteRole as any } },
      {
        onSuccess: (inv) => {
          queryClient.invalidateQueries({ queryKey: getGetInvitationsQueryKey() });
          setInviteResult(inv);
        },
        onError: (e: Error) => toast({ title: "Invite failed", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleCloseInviteDialog = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("creator");
    setInviteResult(null);
  };

  const handleRevoke = (invitationId: string, email: string) => {
    revokeInvitation.mutate(
      { invitationId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInvitationsQueryKey() });
          toast({ title: `Invite to ${email} revoked` });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900">Users</h1>
            <p className="text-ink-500 mt-1">{users?.length ?? 0} members</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>
            <Button
              onClick={() => setInviteOpen(true)}
              className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white gap-2 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Invite member
            </Button>
          </div>
        </div>

        {/* Active users table */}
        <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-ink-50">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-ink-400">Loading…</TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-ink-400">No users found</TableCell>
                </TableRow>
              )}
              {filtered.map(u => (
                <TableRow key={u.id} className="hover:bg-ink-50/50">
                  <TableCell>
                    <div>
                      <p className="font-medium text-ink-900">{u.fullName}</p>
                      <p className="text-xs text-ink-500">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={v => handleRoleChange(u.id, v)}>
                      <SelectTrigger className="h-8 w-32 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[u.status] ?? "bg-ink-100 text-ink-500"} rounded-full text-xs capitalize border-0`}>
                      {u.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">{u.creditsBalance}</TableCell>
                  <TableCell className="text-sm text-ink-500">
                    {u.lastLoginAt
                      ? formatDistanceToNow(new Date(u.lastLoginAt), { addSuffix: true })
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuItem onClick={() => { setCreditUser(u); setCreditAmount(""); setCreditNote(""); }}>
                          <Coins className="w-4 h-4 mr-2" /> Grant / Adjust Credits
                        </DropdownMenuItem>
                        {u.status === "invited" && (u as any).inviteLink && (
                          <DropdownMenuItem onClick={() => copyInviteLink(u as any)}>
                            {copiedId === u.id ? <Check className="w-4 h-4 mr-2 text-lime-500" /> : <Copy className="w-4 h-4 mr-2" />}
                            Copy Invite Link
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {u.status === "active" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(u.id, "suspended")} className="text-amber-600 focus:bg-amber-50 focus:text-amber-700">
                            <UserX className="w-4 h-4 mr-2" /> Suspend
                          </DropdownMenuItem>
                        )}
                        {u.status === "suspended" && (
                          <DropdownMenuItem onClick={() => handleStatusChange(u.id, "active")}>
                            <ShieldCheck className="w-4 h-4 mr-2" /> Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pending invitations section */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-ink-400" />
            Pending Invitations
            {pendingInvitations.length > 0 && (
              <span className="ml-1 text-sm font-normal text-ink-400">({pendingInvitations.length})</span>
            )}
          </h2>

          {invitationsLoading ? (
            <p className="text-ink-400 text-sm py-6 text-center">Loading…</p>
          ) : pendingInvitations.length === 0 ? (
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm px-6 py-12 text-center text-ink-400 text-sm">
              No pending invitations. Use <strong>Invite member</strong> to onboard new teammates.
            </div>
          ) : (
            <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-ink-50">
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map(inv => (
                    <TableRow key={inv.id} className="hover:bg-ink-50/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-ink-400 shrink-0" />
                          <span className="text-sm font-medium text-ink-900">{inv.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{inv.role}</TableCell>
                      <TableCell>
                        <Badge className={`${INVITE_STATUS_COLORS[inv.status] ?? "bg-ink-100 text-ink-500"} rounded-full text-xs capitalize border-0`}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-ink-500">{inv.invitedByName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-ink-500">
                        {inv.expiresAt
                          ? formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {inv.acceptUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              title="Copy invite link"
                              onClick={() => copyLink(inv.id, inv.acceptUrl)}
                            >
                              {copiedId === inv.id
                                ? <Check className="w-4 h-4 text-lime-500" />
                                : <Copy className="w-4 h-4" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Revoke invitation"
                            disabled={revokeInvitation.isPending}
                            onClick={() => handleRevoke(inv.id, inv.email)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Grant credits dialog */}
      <Dialog open={!!creditUser} onOpenChange={open => !open && setCreditUser(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Credits — {creditUser?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ink-500">Current balance: <strong>{creditUser?.creditsBalance}</strong> credits</p>
            <Input
              type="number"
              placeholder="Amount (positive or negative)"
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              className="rounded-xl"
            />
            <Input
              placeholder="Note (optional)"
              value={creditNote}
              onChange={e => setCreditNote(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setCreditUser(null)}>Cancel</Button>
            <Button
              className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
              disabled={!creditAmount || isNaN(parseInt(creditAmount)) || parseInt(creditAmount) === 0 || grantCredits.isPending}
              onClick={handleGrantCredits}
            >
              {grantCredits.isPending ? "Saving…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite member dialog */}
      <Dialog open={inviteOpen} onOpenChange={open => { if (!open) handleCloseInviteDialog(); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
          </DialogHeader>

          {inviteResult ? (
            /* Success state — show copyable link */
            <div className="space-y-4 py-2">
              <p className="text-sm text-ink-600">
                Invitation sent to <strong>{inviteResult.email}</strong> as <span className="capitalize">{inviteResult.role}</span>.
              </p>
              {inviteResult.acceptUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-ink-500">Invite link (copy to share manually)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}${inviteResult.acceptUrl}`}
                      className="rounded-xl text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 rounded-xl"
                      onClick={() => copyLink(inviteResult.id, inviteResult.acceptUrl)}
                    >
                      {copiedId === inviteResult.id
                        ? <Check className="w-4 h-4 text-lime-500" />
                        : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Form state */
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="rounded-xl"
                  onKeyDown={e => { if (e.key === "Enter") handleSendInvite(); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={handleCloseInviteDialog}>
              {inviteResult ? "Close" : "Cancel"}
            </Button>
            {!inviteResult && (
              <Button
                className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
                disabled={!inviteEmail.trim() || createInvitation.isPending}
                onClick={handleSendInvite}
              >
                {createInvitation.isPending ? "Sending…" : "Send invite"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
