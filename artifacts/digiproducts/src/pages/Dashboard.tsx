import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetDashboardStats, useGetProducts, useGetRecentActivity, useGetCreditTransactions, useGetMe, useGetLearnModules,
  getGetDashboardStatsQueryKey, getGetProductsQueryKey, getGetRecentActivityQueryKey, getGetCreditTransactionsQueryKey
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, format } from "date-fns";
import { 
  FileText, PenTool, LayoutTemplate, Clock, 
  CheckCircle, Download, FileUp, Sparkles, AlertCircle, ChevronRight,
  CreditCard, History, GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: products } = useGetProducts({ sort: '-createdAt' }, { query: { queryKey: getGetProductsQueryKey({ sort: '-createdAt' }) } });
  const { data: activity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: creditTransactions } = useGetCreditTransactions({ query: { queryKey: getGetCreditTransactionsQueryKey() } });
  const { data: user } = useGetMe();
  const { data: learnModules } = useGetLearnModules();
  const [historyOpen, setHistoryOpen] = useState(false);

  const allLessons = learnModules?.flatMap(m => m.lessons) ?? [];
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter(l => l.progress?.status === 'completed').length;
  const academyComplete = user?.onboardingComplete ?? (totalLessons > 0 && completedLessons >= totalLessons);
  const academyProgressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const statTiles = [
    { label: "Products Created", value: stats?.productsCreated || 0, icon: FileText, bg: "grad-tile-emerald" },
    { label: "Drafts In Progress", value: stats?.draftsInProgress || 0, icon: Clock, bg: "grad-tile-teal" },
    { label: "Awaiting Review", value: stats?.awaitingReview || 0, icon: AlertCircle, bg: "grad-tile-gold" },
    { label: "Approved", value: stats?.approved || 0, icon: CheckCircle, bg: "grad-tile-lime" },
    { label: "Total PDF Exports", value: stats?.totalExports || 0, icon: Download, bg: "grad-tile-deep-emerald" },
    { label: "AI Credits", value: stats?.creditsRemaining || 0, icon: Sparkles, bg: "grad-tile-pine" },
  ];

  return (
    <AppLayout headerVariant="transparent">
      <div className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="grad-hero px-8 pt-28 pb-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 max-w-4xl">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur mb-4">
              Welcome back
            </Badge>
            <h1 className="text-4xl font-display font-bold tracking-tight mb-2 text-background">
              {user?.fullName ? `What are we building today, ${user.fullName.split(" ")[0]}?` : "What are we building today?"}
            </h1>
            <p className="text-brand-100 text-lg opacity-90 max-w-xl">
              Create high-converting eBooks, guides, and lead magnets using our fine-tuned AI engines.
            </p>
          </div>
        </div>

        <div className="p-8 max-w-7xl mx-auto space-y-10 relative z-20 mt-[0px]">
          {/* Start Creating Row */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-soft overflow-hidden group">
              <div className="grad-create h-2" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-brand-600 border-brand-200">Full generator</Badge>
                </div>
                <h3 className="text-xl font-display font-bold text-ink-900 mb-2 group-hover:text-brand-600 transition-colors">eBook & PDF Guide</h3>
                <p className="text-ink-500 mb-6 text-sm">
                  Generate a complete 3-20 chapter book with automated outlines, writing, and formatting.
                </p>
                <Link href="/create/ebook">
                  <Button className="w-full bg-brand-500 hover:bg-brand-600 rounded-xl h-11 text-base font-semibold shadow-sm">
                    Create eBook
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft overflow-hidden group">
              <div className="grad-dark h-2" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-ink-50 text-ink-700 flex items-center justify-center">
                    <LayoutTemplate className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-ink-500 border-ink-200">Fast track</Badge>
                </div>
                <h3 className="text-xl font-display font-bold text-ink-900 mb-2 group-hover:text-brand-600 transition-colors">Lead Magnet</h3>
                <p className="text-ink-500 mb-6 text-sm">
                  Create a short, focused 1-3 page asset like a checklist, cheat sheet, or quick guide.
                </p>
                <Link href="/create/lead-magnet">
                  <Button variant="outline" className="w-full border-ink-200 hover:bg-ink-50 rounded-xl h-11 text-base font-semibold text-ink-700">
                    Create Lead Magnet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft overflow-hidden group">
              <div className="grad-tile-gold h-2" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-gold-500 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className={cn(
                    academyComplete ? "text-lime-700 border-lime-200" : "text-gold-500 border-amber-200"
                  )}>
                    {academyComplete ? "Completed" : "Onboarding"}
                  </Badge>
                </div>
                <h3 className="text-xl font-display font-bold text-ink-900 mb-2 group-hover:text-brand-600 transition-colors">Academy</h3>
                <p className="text-ink-500 mb-4 text-sm">
                  {academyComplete
                    ? "You've completed the onboarding curriculum. Revisit any lesson anytime."
                    : "Complete the onboarding curriculum to unlock the full production studio."}
                </p>
                {!academyComplete && totalLessons > 0 && (
                  <div className="mb-4">
                    <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                      <div
                        className="h-full bg-gold-500 rounded-full transition-all"
                        style={{ width: `${academyProgressPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-500 mt-1.5">
                      {completedLessons} of {totalLessons} lessons complete
                    </p>
                  </div>
                )}
                <Link href="/learn">
                  <Button variant="outline" className="w-full border-ink-200 hover:bg-ink-50 rounded-xl h-11 text-base font-semibold text-ink-700">
                    {academyComplete ? "View Curriculum" : "Continue Learning"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Grid */}
          <div>
            <h2 className="text-xl font-display font-bold text-ink-900 mb-4">Quick Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statTiles.map((stat, i) => (
                <div key={i} className={cn("p-4 rounded-2xl text-white relative overflow-hidden", stat.bg)}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/3" />
                  <stat.icon className="w-5 h-5 text-white/80 mb-3" />
                  <p className="text-3xl font-display font-bold mb-1">{stat.value}</p>
                  <p className="text-xs font-medium text-white/80 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Your Products */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-ink-900">Your Recent Products</h2>
                <Link href="/products" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center">
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              {products?.slice(0, 5).map(product => (
                <Card key={product.id} className="border-ink-100 shadow-sm hover:shadow-md transition-shadow group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-16 rounded bg-ink-50 border border-ink-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-ink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-ink-900 truncate group-hover:text-brand-600 transition-colors">
                        <Link href={`/products/${product.id}`}>{product.title}</Link>
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-ink-500 mt-1">
                        <span className="capitalize">{product.type.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{product.chapterCount} chapters</span>
                        <span>•</span>
                        <span>Updated {formatDistanceToNow(new Date(product.updatedAt))} ago</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={cn(
                        "capitalize rounded-full",
                        product.status === 'approved' ? "bg-lime-100 text-lime-800" :
                        product.status === 'ready' ? "bg-brand-100 text-brand-700" :
                        "bg-ink-100 text-ink-700"
                      )}>
                        {product.status.replace('_', ' ')}
                      </Badge>
                      <Link href={`/products/${product.id}`}>
                        <Button variant="ghost" size="sm" className="hidden sm:flex">Open</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!products || products.length === 0) && (
                <div className="text-center py-12 bg-ink-50/50 rounded-2xl border border-dashed border-ink-200">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-ink-100 flex items-center justify-center mx-auto mb-4">
                    <FileUp className="w-6 h-6 text-ink-400" />
                  </div>
                  <h3 className="font-semibold text-ink-900 mb-1">No products yet</h3>
                  <p className="text-sm text-ink-500 mb-4 max-w-sm mx-auto">
                    You haven't created any products yet. Start by generating an eBook or lead magnet.
                  </p>
                  <Link href="/create/ebook">
                    <Button variant="outline" className="rounded-xl border-ink-200">Start Creating</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Side Panel: Activity & Credits */}
            <div className="space-y-6">
              <Card className="border-ink-100 shadow-sm">
                <CardContent className="p-5">
                  <h2 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-ink-400" />
                    Recent Activity
                  </h2>
                  <div className="space-y-4">
                    {activity?.slice(0, 6).map((event) => (
                      <div key={event.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                        <div>
                          <p className="text-ink-900">
                            <span className="font-medium">{event.actorName || 'System'}</span>{' '}
                            {event.summary || event.action}
                          </p>
                          <p className="text-xs text-ink-500 mt-0.5">
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!activity || activity.length === 0) && (
                      <p className="text-sm text-ink-500 text-center py-4">No recent activity.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <Card className="border-ink-100 shadow-sm overflow-hidden">
                  <CollapsibleTrigger className="w-full p-5 flex items-center justify-between hover:bg-ink-50/50 transition-colors">
                    <h2 className="font-display font-bold text-ink-900 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gold-500" />
                      Credit History
                    </h2>
                    <ChevronRight className={cn("w-5 h-5 text-ink-400 transition-transform", historyOpen && "rotate-90")} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-5 pb-5 border-t border-ink-100 pt-4 space-y-3">
                      {creditTransactions?.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium text-ink-900">{tx.reason}</p>
                            <p className="text-xs text-ink-500">{format(new Date(tx.createdAt), 'MMM d, h:mm a')}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "font-bold",
                              tx.delta > 0 ? "text-lime-600" : "text-ink-900"
                            )}>
                              {tx.delta > 0 ? '+' : ''}{tx.delta}
                            </span>
                            <p className="text-xs text-ink-500">{tx.balanceAfter} left</p>
                          </div>
                        </div>
                      ))}
                      {(!creditTransactions || creditTransactions.length === 0) && (
                        <p className="text-sm text-ink-500 text-center py-2">No transactions yet.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
