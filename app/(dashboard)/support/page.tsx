"use client";

import * as React from "react";
import { LifeBuoy, Plus, AlertTriangle, Clock, Inbox, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column } from "@/components/data-table/data-table";
import { supportApi, TicketItem, TicketReplyItem, TicketSummary } from "@/lib/api/support";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SupportPage() {
  const [tickets, setTickets] = React.useState<TicketItem[]>([]);
  const [summary, setSummary] = React.useState<TicketSummary | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false);
  const [detailTicket, setDetailTicket] = React.useState<TicketItem | null>(null);
  const [replies, setReplies] = React.useState<TicketReplyItem[]>([]);
  const [repliesLoading, setRepliesLoading] = React.useState(false);

  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [category, setCategory] = React.useState("");

  const [replyMessage, setReplyMessage] = React.useState("");
  const [replyAuthor, setReplyAuthor] = React.useState("");

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([supportApi.listTickets({ perPage: 100 }), supportApi.getSummary()])
      .then(([ticketsRes, summaryRes]) => {
        setTickets(ticketsRes.data ?? []);
        setSummary(summaryRes.data ?? null);
        setLoadError(false);
      })
      .catch((err) => {
        console.warn("Backend support API unavailable", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !customerName || !category) return;

    supportApi
      .createTicket({ subject, description, customerName, priority, category })
      .then(() => {
        loadData();
        setIsNewTicketOpen(false);
        setSubject("");
        setDescription("");
        setCustomerName("");
        setPriority("medium");
        setCategory("");
      })
      .catch((err) => {
        console.warn("Failed to create ticket", err);
      });
  };

  const openDetail = (ticket: TicketItem) => {
    setDetailTicket(ticket);
    setRepliesLoading(true);
    supportApi
      .listReplies(ticket.id)
      .then((res) => setReplies(res.data ?? []))
      .catch((err) => {
        console.warn("Failed to load replies", err);
        setReplies([]);
      })
      .finally(() => setRepliesLoading(false));
  };

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailTicket || !replyMessage || !replyAuthor) return;

    supportApi
      .addReply(detailTicket.id, { authorName: replyAuthor, authorType: "agent", message: replyMessage })
      .then((res) => {
        if (res.data) setReplies((prev) => [...prev, res.data as TicketReplyItem]);
        setReplyMessage("");
      })
      .catch((err) => {
        console.warn("Failed to add reply", err);
      });
  };

  const handleStatusChange = (status: string) => {
    if (!detailTicket) return;
    supportApi
      .updateStatus(detailTicket.id, status)
      .then((res) => {
        if (res.data) setDetailTicket(res.data);
        loadData();
      })
      .catch((err) => {
        console.warn("Failed to update status", err);
      });
  };

  const priorityStyles: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    urgent: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const statusStyles: Record<string, string> = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
    waiting_customer: "bg-purple-50 text-purple-700 border-purple-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const columns: Column<TicketItem>[] = [
    {
      key: "ticketNumber",
      header: "Ticket & Subject",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.ticketNumber}</div>
          <div className="text-[11px] text-muted-foreground">{row.subject}</div>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      render: (row) => <span className="text-xs text-foreground">{row.customerName}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${priorityStyles[row.priority] ?? priorityStyles.medium}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusStyles[row.status] ?? statusStyles.open}`}>
          {row.status.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "slaDueAt",
      header: "SLA Due",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.isOverdue && <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}
          <span className={`text-[11px] ${row.isOverdue ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
            {new Date(row.slaDueAt).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "assignedTo",
      header: "Agent",
      render: (row) => <span className="text-xs text-foreground">{row.assignedTo || "-"}</span>,
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openDetail(row)}
          className="h-7 px-2 text-[11px] gap-1"
        >
          <MessageSquare className="h-3 w-3 text-brand-primary" />
          <span>View</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-brand-primary" />
            <span>Dedicated Support</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kelola tiket dukungan pelanggan, lacak SLA, dan pantau balasan tim.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setIsNewTicketOpen(true)}
          className="h-9 gap-1.5 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Ticket</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Total Tickets</span>
            <div className="text-2xl font-black text-foreground flex items-center gap-1.5">
              <Inbox className="h-5 w-5 text-brand-primary" />
              {summary?.totalTickets ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Open Tickets</span>
            <div className="text-2xl font-black text-brand-dark">{summary?.openTickets ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Overdue (SLA)</span>
            <div className="text-2xl font-black text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5" />
              {summary?.overdueTickets ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-semibold">Avg Resolution</span>
            <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
              <Clock className="h-5 w-5" />
              {(summary?.avgResolutionHours ?? 0).toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden space-y-3 p-4">
        {loadError && (
          <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            Could not load support tickets from the server. Please try again later.
          </div>
        )}
        {!loading && !loadError && tickets.length === 0 && (
          <div className="text-xs text-muted-foreground bg-slate-50 border border-dashed border-border rounded-lg px-3 py-6 text-center">
            No support tickets yet. Create your first ticket to start tracking.
          </div>
        )}
        {(tickets.length > 0 || loading) && <DataTable data={tickets} columns={columns} isLoading={loading} />}
      </div>

      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-primary" />
              <span>Create New Ticket</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs text-left">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Subject *</label>
              <Input
                placeholder="e.g. Cannot access dashboard"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Description</label>
              <Input
                placeholder="Describe the issue"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Customer Name *</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-white text-xs"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-foreground">Category *</label>
              <Input
                placeholder="e.g. Technical, Billing, General Inquiry"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewTicketOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="gradient" size="sm" className="h-9 text-xs font-bold">
                Save Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {detailTicket && (
        <Dialog open={Boolean(detailTicket)} onOpenChange={() => setDetailTicket(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-brand-primary" />
                <span>{detailTicket.ticketNumber} - {detailTicket.subject}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs text-left">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${priorityStyles[detailTicket.priority] ?? priorityStyles.medium}`}>
                  {detailTicket.priority}
                </span>
                <select
                  value={detailTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-border bg-white text-[11px]"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_customer">Waiting Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <p className="text-muted-foreground">{detailTicket.description || "No description provided."}</p>

              <div className="border-t border-border pt-3 space-y-2 max-h-64 overflow-y-auto">
                {repliesLoading && <div className="text-muted-foreground">Loading replies...</div>}
                {!repliesLoading && replies.length === 0 && (
                  <div className="text-muted-foreground">No replies yet.</div>
                )}
                {replies.map((r) => (
                  <div key={r.id} className="bg-slate-50 border border-border rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{r.authorName}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{r.authorType}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{r.message}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleReply} className="space-y-2 border-t border-border pt-3">
                <Input
                  placeholder="Your name"
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                  className="h-9 text-xs"
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button type="submit" variant="gradient" size="sm" className="h-9 px-3 gap-1">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDetailTicket(null)} className="h-9 text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
