import { useGetDashboard } from "@workspace/api-client-react";
import { formatCurrency, formatDate, getUtilizationColor } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  AlertCircle,
  Info,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px] rounded-xl" />
          <Skeleton className="col-span-3 h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <p>Failed to load dashboard data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Here is your financial status today.</p>
        </div>
      </div>

      {/* Warnings */}
      {dashboard.warnings && dashboard.warnings.length > 0 && (
        <div className="space-y-2">
          {dashboard.warnings.map((warning, i) => {
            const isCritical = warning.severity === "critical";
            const isWarning = warning.severity === "warning";

            return (
              <div
                key={i}
                className={`
                  flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium
                  ${isCritical
                    ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-300"
                    : isWarning
                    ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-300"
                    : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300"
                  }
                `}
              >
                <span className="shrink-0 mt-0.5">
                  {isCritical && <AlertTriangle className="w-4 h-4" />}
                  {isWarning && <AlertCircle className="w-4 h-4" />}
                  {!isCritical && !isWarning && <Info className="w-4 h-4" />}
                </span>
                <span>{warning.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Best Card Hero */}
      {dashboard.bestCard && (
        <Card className="border-primary/20 bg-primary/5 shadow-md overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
              >
                Top Pick for Today
              </Badge>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground">
                Use <span className="text-primary">{dashboard.bestCard.name}</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl">
                This card has the best score right now ({dashboard.bestCard.score.toFixed(1)})
                considering due dates, current utilization (
                {Math.round(dashboard.bestCard.utilization * 100)}%), and remaining safe spend.
              </p>
            </div>

            <div className="w-full md:w-auto p-5 rounded-2xl bg-card shadow-sm border flex flex-col gap-2 shrink-0 min-w-[180px]">
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Available Safe Spend
              </div>
              <div className="text-3xl font-bold font-mono tracking-tight text-primary">
                {formatCurrency(dashboard.bestCard.safeSpendRemaining)}
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${getUtilizationColor(dashboard.bestCard.utilization)}`}
                  style={{ width: `${Math.min(dashboard.bestCard.utilization * 100, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Safe Spend
            </CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(dashboard.totalSafeSpendRemaining)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all cards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Used</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(dashboard.totalUsed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Of {formatCurrency(dashboard.totalLimit)} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Utilization
            </CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {dashboard.totalLimit > 0
                ? Math.round((dashboard.totalUsed / dashboard.totalLimit) * 100)
                : 0}
              %
            </div>
            <Progress
              value={
                dashboard.totalLimit > 0
                  ? (dashboard.totalUsed / dashboard.totalLimit) * 100
                  : 0
              }
              className="h-1.5 mt-2"
              indicatorClassName={getUtilizationColor(
                dashboard.totalLimit > 0 ? dashboard.totalUsed / dashboard.totalLimit : 0
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Balance
            </CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(dashboard.cashBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available cash</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Cards & Payments */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cards & Payments</CardTitle>
              <CardDescription>Status of your credit cards</CardDescription>
            </div>
            <Link href="/cards" className="text-sm text-primary flex items-center hover:underline">
              View all <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y">
              {dashboard.cards.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No cards added yet.</p>
                  <Link
                    href="/cards"
                    className="text-primary hover:underline mt-2 inline-block"
                  >
                    Add your first card
                  </Link>
                </div>
              ) : (
                dashboard.cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: card.color ? `${card.color}20` : "",
                          borderColor: card.color || "",
                        }}
                      >
                        <CreditCard
                          className="w-5 h-5"
                          style={{ color: card.color || "var(--primary)" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{card.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{card.bank || "Unknown Bank"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due in {card.daysUntilDue}d
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <div className="font-medium font-mono text-sm">
                          {formatCurrency(card.used)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {Math.round(card.utilization * 100)}% used
                        </div>
                      </div>
                      <div
                        className={`w-2 h-8 rounded-full ${
                          card.utilization > 0.4
                            ? "bg-red-500"
                            : card.utilization >= 0.3
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions</CardDescription>
            </div>
            <Link
              href="/transactions"
              className="text-sm text-primary flex items-center hover:underline"
            >
              View all <ChevronRight className="w-4 h-4 ml-0.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 px-0 flex flex-col">
            <div className="divide-y flex-1">
              {dashboard.recentTransactions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                  <p>No recent activity.</p>
                  <Link
                    href="/add"
                    className="text-primary hover:underline mt-2 inline-block"
                  >
                    Add a transaction
                  </Link>
                </div>
              ) : (
                dashboard.recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="px-4 py-3.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === "income"
                            ? "bg-green-500/10 text-green-600"
                            : tx.type === "payment"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-none truncate">
                          {tx.type === "income"
                            ? "Income"
                            : tx.type === "payment"
                            ? `Payment → ${tx.cardName}`
                            : tx.note || "Expense"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div
                      className={`font-medium font-mono text-sm shrink-0 ml-3 ${
                        tx.type === "income"
                          ? "text-green-600"
                          : tx.type === "payment"
                          ? "text-blue-600"
                          : "text-foreground"
                      }`}
                    >
                      {tx.type === "income" || tx.type === "payment" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
