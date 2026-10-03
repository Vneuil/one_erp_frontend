"use client";

import * as React from "react";
import { Target, Plus, TrendingUp, CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { goalApi, GoalItem, GoalSummary } from "@/lib/api/goal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function GoalsPage() {
  const [goals, setGoals] = React.useState<GoalItem[]>([]);
  const [summary, setSummary] = React.useState<GoalSummary | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [isNewGoalOpen, setIsNewGoalOpen] = React.useState(false);
  const [checkInGoal, setCheckInGoal] = React.useState<GoalItem | null>(null);

  const [title, setTitle] = React.useState("");
  const [ownerName, setOwnerName] = React.useState("");
  const [goalType, setGoalType] = React.useState("individual");
  const [category, setCategory] = React.useState("");
  const [targetValue, setTargetValue] = React.useState(100);
  const [unit, setUnit] = React.useState("units");
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");

  const [checkInValue, setCheckInValue] = React.useState(0);
  const [checkInNote, setCheckInNote] = React.useState("");

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([goalApi.listGoals({ perPage: 100 }), goalApi.getSummary()])
      .then(([goalsRes, summaryRes]) => {
        setGoals(goalsRes.data ?? []);
        setSummary(summaryRes.data ?? null);
        setLoadError(false);
      })
      .catch((err) => {
        console.warn("Backend goals API unavailable", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !ownerName || !category || !periodStart || !periodEnd) return;

    goalApi
      .createGoal({
        title,
        ownerName,
        goalType,
        category,
        targetValue: Number(targetValue) || 0,
        unit,
        periodStart,
        periodEnd,
      })
      .then(() => {
        loadData();
        setIsNewGoalOpen(false);
        setTitle("");
        setOwnerName("");
        setCategory("");
        setTargetValue(100);
        setPeriodStart("");
        setPeriodEnd("");
      })
      .catch((err) => {
        console.warn("Failed to create goal", err);
      });
  };

  const handleCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInGoal) return;

    goalApi
      .checkIn(checkInGoal.id, { valueRecorded: Number(checkInValue) || 0, note: checkInNote })
      .then(() => {
        loadData();
        setCheckInGoal(null);
        setCheckInValue(0);
        setCheckInNote("");
      })
      .catch((err) => {
        console.warn("Failed to record check-in", err);
      });
  };

  const statusStyles: Record<string, string> = {
    active: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    missed: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const columns: Column<GoalItem>[] = [
    {
      key: "title",
      header: "Goal & Owner",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.title}</div>
          <div className="text-[11px] text-muted-foreground">{row.ownerName} - {row.goalType}</div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => <span className="text-xs text-foreground">{row.category}</span>,
    },
    {
      key: "progressPercent",
      header: "Target vs Current",
      render: (row) => (
        <div className="space-y-1 min-w-[140px]">
          <div className="text-xs font-semibold text-foreground">
            {row.currentValue.toLocaleString()} / {row.targetValue.toLocaleString()} {row.unit}
          </div>
          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${row.progressPercent >= 100 ? "bg-emerald-500" : "bg-brand-primary"}`}
              style={{ width: `${Math.min(100, row.progressPercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{row.progressPercent.toFixed(1)}%</div>
        </div>
      ),
    },
    {
      key: "periodStart",
      header: "Period",
      render: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.periodStart} - {row.periodEnd}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyles[row.status] ?? statusStyles.active}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "id",
      header: "Check-In",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setCheckInGoal(row);
            setCheckInValue(row.currentValue);
            setCheckInNote("");
          }}
          className="h-7 px-2 text-[11px] gap-1"
        >
          <ListChecks className="h-3 w-3 text-brand-primary" />
          <span>Check In</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-brand-primary" />
            <span>Goal & Target Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tetapkan target individu maupun tim, catat check-in berkala, dan pantau progres pencapaian.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewGoalOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Goal</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Goals</span>
            <div className="text-2xl font-black text-foreground">{summary?.totalGoals ?? 0}</div>
            <span className="text-[11px] text-muted-foreground">{summary?.activeGoals ?? 0} Active</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Average Progress</span>
            <div className="text-2xl font-black text-brand-dark flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
              {(summary?.averageProgress ?? 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Completed Goals</span>
            <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              {summary?.completedGoals ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        {loadError && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            Could not load goals from the server. Please try again later.
          </div>
        )}
        {!loading && !loadError && goals.length === 0 && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No goals yet. Create your first goal to start tracking progress.
          </div>
        )}
        {(goals.length > 0 || loading) && <DataTable data={goals} columns={columns} isLoading={loading} />}
      </div>

      <Dialog open={isNewGoalOpen} onOpenChange={setIsNewGoalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Create New Goal</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGoal} className="space-y-3.5 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Goal Title *</label>
              <Input
                placeholder="e.g. Q3 Regional Sales Growth"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Owner Name *</label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Category *</label>
              <Input
                placeholder="e.g. Sales Revenue, Productivity"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Target Value *</label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Unit</label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Period Start *</label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Period End *</label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewGoalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Save Goal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {checkInGoal && (
        <Dialog open={Boolean(checkInGoal)} onOpenChange={() => setCheckInGoal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-brand-primary" />
                <span>Check In - {checkInGoal.title}</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCheckIn} className="space-y-3 text-xs text-left">
              <div className="space-y-1">
                <label className="font-bold text-foreground">
                  Current Value ({checkInGoal.unit})
                </label>
                <Input
                  type="number"
                  value={checkInValue}
                  onChange={(e) => setCheckInValue(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Note</label>
                <Input
                  placeholder="Optional note"
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckInGoal(null)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                  Record Check-In
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
