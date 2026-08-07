import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { PartyPopper, ArrowRight, LayoutDashboard } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function LearnComplete() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fire confetti on mount
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#A3D939', '#1FA06B', '#D9A02B']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#A3D939', '#1FA06B', '#D9A02B']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Invalidate getMe query so the layout unlocks the rest of the nav
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  }, [queryClient]);

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-paper">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-lime-400/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-lime-400 to-brand-500 w-32 h-32 rounded-[2rem] rotate-12 flex items-center justify-center shadow-xl">
              <PartyPopper className="w-16 h-16 text-white -rotate-12" />
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-display font-bold text-ink-900 mb-4">
              You're ready to create.
            </h1>
            <p className="text-lg text-ink-500 leading-relaxed">
              Onboarding complete. The full production studio is now unlocked. You can generate eBooks, create lead magnets, and publish assets.
            </p>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-base shadow-soft">
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/create/ebook">
              <Button variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl border-2 border-brand-200 text-brand-700 hover:bg-brand-50 font-bold text-base">
                Create first eBook
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
