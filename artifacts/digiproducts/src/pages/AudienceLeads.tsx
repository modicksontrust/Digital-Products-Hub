import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Download,
  Search,
  Mail,
  Link2,
  BookOpen,
  Calendar,
  MoreVertical,
  Trash2,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadSource = "lead_magnet" | "bio_page";

interface Lead {
  id: string;
  email: string;
  name: string;
  source: LeadSource;
  sourceName: string;
  tags: string[];
  subscribedAt: string;
}

// ─── In-memory leads store ────────────────────────────────────────────────────
// Starts empty; future tasks will wire this to real subscription events.
let _leads: Lead[] = [];

function getLeads() {
  return _leads;
}

type FilterTab = "all" | "lead_magnet" | "bio_page";

const TAB_CONFIG: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: Users },
  { id: "lead_magnet", label: "Lead Magnets", icon: BookOpen },
  { id: "bio_page", label: "Bio Pages", icon: Link2 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AudienceLeads() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(getLeads());
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  // Derived counts
  const counts: Record<FilterTab, number> = {
    all: leads.length,
    lead_magnet: leads.filter((l) => l.source === "lead_magnet").length,
    bio_page: leads.filter((l) => l.source === "bio_page").length,
  };

  // Filtered leads
  const visible = leads.filter((lead) => {
    const matchesFilter =
      activeFilter === "all" || lead.source === activeFilter;
    const matchesSearch =
      !search ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.sourceName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    if (leads.length === 0) {
      toast({ title: "No leads to export yet" });
      return;
    }
    const rows = [
      ["Name", "Email", "Source", "Source Name", "Tags", "Subscribed At"],
      ...leads.map((l) => [
        l.name,
        l.email,
        l.source === "lead_magnet" ? "Lead Magnet" : "Bio Page",
        l.sourceName,
        l.tags.join("; "),
        new Date(l.subscribedAt).toLocaleString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Leads exported as CSV" });
  };

  const handleDelete = (id: string) => {
    _leads = _leads.filter((l) => l.id !== id);
    setLeads(getLeads());
    toast({ title: "Lead removed" });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Leads</h1>
              <p className="text-sm text-ink-500">
                {leads.length} total lead{leads.length !== 1 ? "s" : ""} from bio pages &amp; lead
                magnets.
              </p>
            </div>
          </div>
          <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>

        {/* Filter tabs + search */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-xl border border-ink-200 bg-ink-50 p-1">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                    active
                      ? "bg-white shadow-sm text-ink-900"
                      : "text-ink-500 hover:text-ink-700",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      active ? "bg-brand-100 text-brand-700" : "bg-ink-200 text-ink-500",
                    )}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              className="pl-9 w-full sm:w-64"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Empty state / lead list */}
        {visible.length === 0 ? (
          <Card className="border-dashed border-ink-300">
            <CardContent className="flex flex-col items-center py-20 text-center">
              {activeFilter === "lead_magnet" ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-300">
                    <BookOpen className="h-8 w-8" />
                  </span>
                  <h2 className="mt-5 font-semibold text-ink-700">No lead magnet subscribers yet</h2>
                  <p className="mt-2 max-w-xs text-sm text-ink-400">
                    When someone downloads one of your lead magnets, they'll appear here automatically.
                  </p>
                </>
              ) : activeFilter === "bio_page" ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-300">
                    <Link2 className="h-8 w-8" />
                  </span>
                  <h2 className="mt-5 font-semibold text-ink-700">No bio page subscribers yet</h2>
                  <p className="mt-2 max-w-xs text-sm text-ink-400">
                    Add an email opt-in section to your bio page — subscribers will show up here.
                  </p>
                </>
              ) : search ? (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-300">
                    <Search className="h-8 w-8" />
                  </span>
                  <h2 className="mt-5 font-semibold text-ink-700">No leads match your search</h2>
                  <p className="mt-2 max-w-xs text-sm text-ink-400">
                    Try a different name, email, or clear the search to see all leads.
                  </p>
                </>
              ) : (
                <>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-300">
                    <Users className="h-8 w-8" />
                  </span>
                  <h2 className="mt-5 font-semibold text-ink-700">No leads yet</h2>
                  <p className="mt-2 max-w-xs text-sm text-ink-400">
                    Leads appear here when people subscribe via your bio pages or lead magnets.
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        icon: BookOpen,
                        title: "From Lead Magnets",
                        desc: "People who download your lead magnets are captured as leads automatically.",
                      },
                      {
                        icon: Link2,
                        title: "From Bio Pages",
                        desc: "Email opt-in sections on your bio page feed leads directly here.",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="rounded-xl border border-ink-200 bg-white p-4 text-left"
                        >
                          <div className="mb-2 flex items-center gap-2 text-brand-600">
                            <Icon className="h-4 w-4" />
                            <p className="text-sm font-semibold">{item.title}</p>
                          </div>
                          <p className="text-xs text-ink-500">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-ink-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3 text-left">Lead</th>
                  <th className="px-5 py-3 text-left">Source</th>
                  <th className="px-5 py-3 text-left">Tags</th>
                  <th className="px-5 py-3 text-left">Subscribed</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 bg-white">
                {visible.map((lead) => (
                  <tr key={lead.id} className="hover:bg-ink-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold uppercase">
                          {(lead.name || lead.email)[0]}
                        </div>
                        <div>
                          {lead.name && (
                            <p className="font-medium text-ink-900">{lead.name}</p>
                          )}
                          <p className={cn("text-ink-500", lead.name ? "text-xs" : "font-medium text-ink-900")}>
                            {lead.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        {lead.source === "lead_magnet" ? (
                          <BookOpen className="h-3.5 w-3.5 text-brand-500" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        <span className="text-ink-600">{lead.sourceName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.length > 0 ? (
                          lead.tags.map((tag) => (
                            <span
                              key={tag}
                              className="flex items-center gap-0.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600"
                            >
                              <Tag className="h-2.5 w-2.5" /> {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-ink-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(lead.subscribedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
                            <Mail className="mr-2 h-4 w-4" /> Email <span className="ml-auto text-[9px] font-semibold uppercase tracking-wide text-ink-400">Soon</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => handleDelete(lead.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {leads.length > 0 && (
          <p className="mt-4 text-center text-xs text-ink-400">
            {visible.length} of {leads.length} lead{leads.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </AppLayout>
  );
}
