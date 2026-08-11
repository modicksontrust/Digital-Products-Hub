import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetAuditLogs, useGetUsers, getGetUsersQueryKey, getGetAuditLogsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  "product.approved":              "bg-lime-100 text-lime-800",
  "product.changes_requested":     "bg-amber-100 text-amber-800",
  "product.submitted_for_review":  "bg-blue-100 text-blue-800",
  "user.invited":                  "bg-violet-100 text-violet-800",
  "user.role_changed":             "bg-violet-100 text-violet-800",
  "user.suspended":                "bg-rose-100 text-rose-800",
  "credits.granted":               "bg-brand-100 text-brand-800",
};

export default function AdminAudit() {
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: users } = useGetUsers({}, { query: { queryKey: getGetUsersQueryKey() } });
  const { data: logs, isLoading, refetch } = useGetAuditLogs(
    {
      action: actionFilter.trim() || undefined,
      actorId: actorFilter === "all" ? undefined : actorFilter,
    },
    { query: { queryKey: [...getGetAuditLogsQueryKey(), actionFilter, actorFilter] } }
  );

  const filteredLogs = (logs ?? []).filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.actorName ?? "").toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.entityType ?? "").toLowerCase().includes(q) ||
      (l.summary ?? "").toLowerCase().includes(q)
    );
  });

  const clearFilters = () => {
    setActionFilter("");
    setActorFilter("all");
    setSearch("");
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink-900">Audit Log</h1>
            <p className="text-ink-500 mt-1">
              {isLoading ? "Loading…" : `${filteredLogs.length} event${filteredLogs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => refetch()}>
            <RotateCcw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <Input
              placeholder="Search actor, action, summary…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          <Select value={actorFilter} onValueChange={setActorFilter}>
            <SelectTrigger className="rounded-xl w-48">
              <SelectValue placeholder="All actors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              {users?.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Filter by action…"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="rounded-xl w-48"
          />

          {(actionFilter || actorFilter !== "all" || search) && (
            <Button variant="ghost" className="rounded-xl" onClick={clearFilters}>Clear</Button>
          )}
        </div>

        <div className="bg-white border border-ink-200 rounded-2xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-ink-50">
                <TableHead className="w-44">Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-ink-400">Loading…</TableCell>
                </TableRow>
              )}
              {!isLoading && filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-ink-400">No events found</TableCell>
                </TableRow>
              )}
              {filteredLogs.map(log => (
                <TableRow key={log.id} className="hover:bg-ink-50/50 align-top">
                  <TableCell className="text-xs text-ink-400 whitespace-nowrap pt-4">
                    {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-ink-700 pt-4">
                    {log.actorName ?? "System"}
                  </TableCell>
                  <TableCell className="pt-4">
                    <Badge
                      className={`${ACTION_COLORS[log.action] ?? "bg-ink-100 text-ink-600"} rounded-full text-xs border-0 font-mono`}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-ink-500 pt-4">
                    {log.entityType ? (
                      <span className="capitalize">
                        {log.entityType}
                        {log.entityId && (
                          <span className="font-mono text-xs text-ink-400 ml-1">
                            #{log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-ink-600 pt-4 max-w-xs">
                    {log.summary ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
