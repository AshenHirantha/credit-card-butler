import { Link } from "wouter";
import { CreditCard, BarChart3, FileUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: CreditCard,
    title: "Smart Card Recommendations",
    description: "CCOS tells you which card to use today based on utilization, due dates, and your spending patterns.",
  },
  {
    icon: BarChart3,
    title: "Utilization Tracking",
    description: "Monitor your credit utilization across all cards and get warned before you hit unsafe thresholds.",
  },
  {
    icon: FileUp,
    title: "AI Statement Import",
    description: "Upload a photo or PDF of any statement — our AI extracts and imports every transaction automatically.",
  },
  {
    icon: Shield,
    title: "Private & Per-User",
    description: "Each account is completely separate. Your cards and transactions are only visible to you.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">CCOS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <CreditCard className="w-3.5 h-3.5" />
            Credit Card Operating System
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Know exactly which{" "}
            <span className="text-primary">card to use</span>, every time.
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed">
            CCOS tracks your cards, balances, and due dates — and tells you the
            optimal card to use right now so you never pay unnecessary interest
            or miss a payment.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="text-base px-8">
              <Link href="/sign-up">Create your account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/20 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 tracking-tight">
            Everything you need to manage credit cards
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex gap-5 p-6 bg-card border rounded-xl hover:shadow-sm transition-shadow"
                >
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to take control?</h2>
          <p className="text-muted-foreground">
            Create a free account and start tracking your cards in minutes.
          </p>
          <Button size="lg" asChild className="text-base px-10">
            <Link href="/sign-up">Get started — it's free</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CCOS — Credit Card Operating System
      </footer>
    </div>
  );
}
