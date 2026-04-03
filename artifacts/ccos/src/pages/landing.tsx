import { Link } from "wouter";
import {
  CreditCard,
  BarChart3,
  FileUp,
  Shield,
  Zap,
  TrendingDown,
  Bell,
  CheckCircle2,
  ArrowRight,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Daily Card Recommendation",
    description:
      "An AI-powered score picks the optimal card each day based on cycle position, utilization, and due dates — no guesswork.",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    icon: BarChart3,
    title: "Utilization Tracking",
    description:
      "See used balance, safe-spend headroom, and utilization % across every card. Stay under 40% effortlessly.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Bell,
    title: "Smart Warnings",
    description:
      "Get alerted when a card is approaching its limit, a payment is due soon, or your cash buffer looks thin.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: FileUp,
    title: "AI Statement Import",
    description:
      "Photograph or upload any statement — Claude AI reads it and extracts every transaction for you to review and import.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: TrendingDown,
    title: "Safe Spend Limit",
    description:
      "CCOS automatically calculates how much you can safely spend on each card before hurting your credit score.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Shield,
    title: "Private & Per-Account",
    description:
      "Every user has a completely isolated account. Your cards and transactions are only ever visible to you.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

const stats = [
  { label: "Safe-spend threshold", value: "40%", sublabel: "of your credit limit" },
  { label: "Scoring factors", value: "4", sublabel: "cycle, util, due date, balance" },
  { label: "Supported file types", value: "5", sublabel: "JPG · PNG · WebP · GIF · PDF" },
];

const benefits = [
  "Know the best card to use every single day",
  "Never accidentally push a card over 40% utilization",
  "Import a full statement in seconds with AI",
  "Get payment-due alerts before it's too late",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">CCOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32 text-center">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-32 left-10 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl" />
        </div>

        <div className="relative max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 shadow-sm">
            <Wallet className="w-3.5 h-3.5" />
            Credit Card Operating System
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Know exactly which{" "}
            <span className="text-primary relative">
              card to use
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 5.5C50 2 100 2 150 5.5C200 9 250 9 299 5.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="text-primary/40"
                />
              </svg>
            </span>
            , every day.
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            CCOS scores your credit cards daily — factoring in billing cycles, due dates, and
            utilization — so you always swipe the right card and keep your credit score healthy.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" asChild className="text-base px-8 gap-2 shadow-md">
              <Link href="/sign-up">
                Create free account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>

          {/* Benefit pills */}
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {benefits.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border rounded-full px-3 py-1"
              >
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-muted/30 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {stats.map((s) => (
            <div key={s.label} className="text-center py-4 sm:py-0 sm:px-8 first:pt-0 last:pb-0">
              <div className="text-4xl font-extrabold text-primary tracking-tight">{s.value}</div>
              <div className="font-semibold mt-1">{s.label}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{s.sublabel}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
              <Star className="w-3 h-3" />
              Everything you need
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Built for serious credit card users
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From daily spending decisions to end-of-month statement imports — CCOS handles the
              complexity so you don't have to.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group flex flex-col gap-4 p-6 bg-card border border-border rounded-2xl hover:border-primary/30 hover:shadow-md transition-all duration-200"
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
                  >
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-muted/20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">How CCOS works</h2>
            <p className="text-muted-foreground">Up and running in under two minutes.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: CreditCard,
                title: "Add your cards",
                desc: "Enter your credit limit, statement date, and due date for each card you own.",
              },
              {
                step: "02",
                icon: BarChart3,
                title: "Log transactions",
                desc: "Add expenses, payments, and income manually — or upload a statement and let AI extract them.",
              },
              {
                step: "03",
                icon: Zap,
                title: "Get your daily pick",
                desc: "CCOS scores every card and surfaces the optimal one to use on the dashboard, updated daily.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {item.step.replace("0", "")}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Start managing smarter today
          </h2>
          <p className="text-muted-foreground">
            Free to use. No credit card required. Add your cards and get your first recommendation
            in minutes.
          </p>
          <Button size="lg" asChild className="text-base px-10 gap-2 shadow-md">
            <Link href="/sign-up">
              Create your free account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CCOS — Credit Card Operating System
      </footer>
    </div>
  );
}
