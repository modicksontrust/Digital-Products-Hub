import { ArrowRight, CheckCircle2, ChevronDown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper font-sans">
      {/* Navigation */}
      <nav className="border-b border-ink-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-lime-500 flex items-center justify-center text-brand-950 font-bold text-lg">
              D
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-ink-900">PokiPoki</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-ink-600 font-medium">Log in</Button>
            </Link>
            <Button className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-soft font-semibold">
              Request access
            </Button>
          </div>
        </div>
      </nav>
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 grad-hero opacity-[0.03] z-0" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-lime-400/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-brand-200">
              <Lock className="w-4 h-4" />
              Private Team Platform
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-ink-900 tracking-tight leading-[1.1] mb-6">
              The internal production studio for <span className="text-transparent bg-clip-text grad-create">digital assets.</span>
            </h1>
            <p className="text-xl text-ink-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Create, generate, and publish high-converting eBooks and lead magnets at scale, with built-in quality control and team approval workflows.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 bg-ink-900 hover:bg-ink-800 text-white rounded-xl text-lg font-semibold shadow-xl">
                  Team Login <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-xl border-ink-200 text-ink-700 hover:bg-ink-50 text-lg font-semibold mt-[0px] mb-[0px]">
                Request Access
              </Button>
            </div>
          </div>

          {/* Abstract App Preview */}
          <div className="mt-20 relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-paper via-transparent to-transparent z-10 h-full" />
            <div className="rounded-2xl border border-ink-200 bg-white shadow-2xl overflow-hidden flex flex-col h-[500px]">
              {/* Fake Topbar */}
              <div className="h-12 border-b border-ink-100 flex items-center px-4 gap-4 bg-ink-50/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-ink-200" />
                  <div className="w-3 h-3 rounded-full bg-ink-200" />
                  <div className="w-3 h-3 rounded-full bg-ink-200" />
                </div>
              </div>
              {/* Fake Layout */}
              <div className="flex flex-1 overflow-hidden">
                <div className="w-64 border-r border-ink-100 grad-sidebar p-4 hidden md:block">
                  <div className="h-6 w-32 bg-white/10 rounded mb-8" />
                  <div className="space-y-3">
                    <div className="h-8 bg-white/20 rounded-lg w-full" />
                    <div className="h-8 bg-white/5 rounded-lg w-[80%]" />
                    <div className="h-8 bg-white/5 rounded-lg w-[90%]" />
                  </div>
                </div>
                <div className="flex-1 p-8">
                  <div className="h-8 w-64 bg-ink-100 rounded-lg mb-6" />
                  <div className="grid grid-cols-3 gap-6">
                    <div className="h-32 rounded-xl grad-tile-emerald opacity-90" />
                    <div className="h-32 rounded-xl grad-tile-teal opacity-90" />
                    <div className="h-32 rounded-xl grad-tile-gold opacity-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Value Props */}
      <section className="py-24 bg-white border-y border-ink-100 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6">
                <span className="text-2xl">⚡️</span>
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-3">AI-Powered Generation</h3>
              <p className="text-ink-600 leading-relaxed">
                Go from a one-sentence brief to a fully structured, written, and formatted 10-chapter eBook in under 10 minutes.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-lime-50 text-lime-600 flex items-center justify-center mb-6">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-3">Print-Ready Exports </h3>
              <p className="text-ink-600 leading-relaxed">
                Beautiful, templated PDFs generated on the fly. No more wrestling with InDesign or waiting for external designers.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center mb-6">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-display font-bold text-ink-900 mb-3">Quality Controlled</h3>
              <p className="text-ink-600 leading-relaxed">
                Built-in approval workflows and a mandatory onboarding gate ensures the team produces on-brand, high-quality assets.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-ink-900 text-ink-400 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold bg-brand-500">
            D
          </div>
          <span className="font-display font-bold text-white tracking-tight">PokiPoki</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} PokiPoki Internal. All rights reserved.</p>
      </footer>
    </div>
  );
}
