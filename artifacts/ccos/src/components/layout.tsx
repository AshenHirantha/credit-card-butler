import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, CreditCard, ArrowRightLeft, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-shrink-0 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="font-bold text-lg tracking-tight">CCOS</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Link 
            href="/add" 
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Add Entry
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10 md:hidden">
          <div className="font-bold text-lg">CCOS</div>
          <Link 
            href="/add" 
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            Add
          </Link>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-4 md:p-8 w-full">
            {children}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden border-t border-border bg-card flex h-16 safe-area-bottom">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
