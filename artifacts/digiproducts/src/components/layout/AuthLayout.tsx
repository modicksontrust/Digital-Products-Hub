import { Link } from "wouter";

export function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle?: string }) {
  return (
    <div className="min-h-[100dvh] w-full flex bg-paper">
      {/* Left side - content */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-lime-500 flex items-center justify-center text-brand-950 font-bold text-lg">
              D
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-ink-900">DigiProducts</span>
          </Link>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold text-ink-900 mb-2">{title}</h1>
              {subtitle && <p className="text-ink-500">{subtitle}</p>}
            </div>
            {children}
          </div>
        </div>
      </div>
      {/* Right side - decorative */}
      <div className="hidden lg:flex w-1/2 grad-sidebar p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-lime-500/10 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-500/20 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 text-white max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <span className="text-lime-400">✨</span>
            <span className="text-sm font-medium">Internal Production Studio</span>
          </div>
          <h2 className="text-5xl font-display font-bold leading-tight mb-6 text-background">
            Craft premium digital products at volume.
          </h2>
          <p className="text-lg text-brand-100/80 leading-relaxed">
            The complete toolkit for planning, generating, and publishing high-converting eBooks and lead magnets. Exclusively for our team.
          </p>
        </div>
        
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-lime-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Automated Outlines</h3>
            <p className="text-sm text-brand-100/60">Generate structured tables of contents in seconds.</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
              <div className="w-3 h-3 rounded-full bg-lime-400" />
            </div>
            <h3 className="font-semibold text-white mb-2">Beautiful PDFs</h3>
            <p className="text-sm text-brand-100/60">Export ready-to-publish assets instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
