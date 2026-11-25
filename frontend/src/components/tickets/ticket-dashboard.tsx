"use client";

import { useEffect, useState } from "react";
import { CreateTicketForm } from "./create-ticket-form";

type Category = "billing" | "technical" | "account" | "general";
type Priority = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "resolved" | "closed";
type Ticket = {
  id: number;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: Status;
  created_at: string;
};
type Stats = {
  total_tickets: number;
  open_tickets: number;
  avg_tickets_per_day: number;
  priority_breakdown: Record<Priority, number>;
  category_breakdown: Record<Category, number>;
};

const categories: { value: Category; label: string }[] = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical" },
  { value: "account", label: "Account" },
  { value: "general", label: "General" },
];
const priorities: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const statuses: { value: Status; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(date));
}

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const message = body && Object.values(body).flat()[0];
  return typeof message === "string" ? message : `${fallback} (${response.status}).`;
}

export function TicketDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [updatingTicket, setUpdatingTicket] = useState<number | null>(null);
  const [ticketError, setTicketError] = useState("");
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (priority) params.set("priority", priority);
    if (status) params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);

    setIsLoadingTickets(true);
    setTicketError("");
    fetch(`/api/tickets/?${params.toString()}`, {
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "Could not load tickets"));
        return (await response.json()) as Ticket[];
      })
      .then((result) => {
        const ordered = [...result].sort(
          (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
        );
        // Apply priority locally as well, because the current list endpoint ignores that filter.
        setTickets(priority ? ordered.filter((ticket) => ticket.priority === priority) : ordered);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setTicketError(requestError instanceof Error ? requestError.message : "Could not load tickets.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingTickets(false);
      });

    return () => controller.abort();
  }, [category, priority, status, debouncedSearch, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingStats(true);
    setStatsError("");
    fetch("/api/tickets/stats/", {
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response, "Could not load statistics"));
        return (await response.json()) as Stats;
      })
      .then(setStats)
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setStatsError(requestError instanceof Error ? requestError.message : "Could not load statistics.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingStats(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  async function updateStatus(ticket: Ticket, nextStatus: Status) {
    if (ticket.status === nextStatus) return;
    setUpdatingTicket(ticket.id);
    setTicketError("");
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/`, {
        method: "PATCH",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await responseError(response, "Could not update ticket"));
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setTicketError(requestError instanceof Error ? requestError.message : "Could not update ticket.");
    } finally {
      setUpdatingTicket(null);
    }
  }

  return (
    <main className="support-page">
      <header className="topbar">
        <a className="brand" href="/">Support desk</a>
      </header>

      <section className="page-content dashboard-content" aria-labelledby="page-title">
        <h1 id="page-title">Support tickets</h1>
        <p className="intro-copy">Submit a request, review tickets, and track support activity.</p>

        <section className="stats-section" aria-labelledby="stats-title">
          <div className="section-heading">
            <h2 id="stats-title">Overview</h2>
            {isLoadingStats && <span className="subtle-status">Updating...</span>}
          </div>
          {statsError && <p className="inline-error" role="alert">{statsError}</p>}
          <div className="metric-grid">
            <article className="metric-card"><span>Total tickets</span><strong>{stats?.total_tickets ?? "—"}</strong></article>
            <article className="metric-card"><span>Open tickets</span><strong>{stats?.open_tickets ?? "—"}</strong></article>
            <article className="metric-card"><span>Average per day</span><strong>{stats ? stats.avg_tickets_per_day.toFixed(1) : "—"}</strong></article>
          </div>
          <div className="breakdown-grid">
            <Breakdown title="Priority" values={stats?.priority_breakdown} options={priorities} />
            <Breakdown title="Category" values={stats?.category_breakdown} options={categories} />
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="dashboard-panel" aria-labelledby="new-ticket-heading">
            <div className="section-heading"><h2 id="new-ticket-heading">New ticket</h2></div>
            <CreateTicketForm onCreated={() => setRefreshKey((current) => current + 1)} />
          </section>

          <section className="dashboard-panel tickets-panel" aria-labelledby="tickets-heading">
            <div className="section-heading tickets-heading">
              <h2 id="tickets-heading">Tickets <span className="ticket-count">{tickets.length}</span></h2>
            </div>

            <div className="ticket-filters">
              <input className="text-input search-input" type="search" placeholder="Search title or description" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search tickets" />
              <div className="filter-grid">
                <select className="text-input select-input" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
                  <option value="">All categories</option>
                  {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="text-input select-input" value={priority} onChange={(event) => setPriority(event.target.value)} aria-label="Filter by priority">
                  <option value="">All priorities</option>
                  {priorities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="text-input select-input" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            {ticketError && <p className="inline-error" role="alert">{ticketError}</p>}
            {isLoadingTickets ? (
              <p className="list-message">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="list-message">No tickets found. Try changing your filters.</p>
            ) : (
              <div className="ticket-list">
                {tickets.map((ticket) => {
                  const isExpanded = expandedTicket === ticket.id;
                  return (
                    <article className="ticket-item" key={ticket.id}>
                      <button className="ticket-summary" type="button" onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)} aria-expanded={isExpanded}>
                        <span className="ticket-title-block">
                          <strong>{ticket.title}</strong>
                          <span className="ticket-preview">{ticket.description.length > 140 ? `${ticket.description.slice(0, 140)}...` : ticket.description}</span>
                        </span>
                        <span className={`priority-tag priority-${ticket.priority}`}>{ticket.priority}</span>
                      </button>
                      <div className="ticket-meta">
                        <span>{categories.find((option) => option.value === ticket.category)?.label ?? ticket.category}</span>
                        <span className={`status-tag status-${ticket.status}`}>{statuses.find((option) => option.value === ticket.status)?.label ?? ticket.status}</span>
                        <time dateTime={ticket.created_at}>{displayDate(ticket.created_at)}</time>
                      </div>
                      {isExpanded && (
                        <div className="ticket-details">
                          <p>{ticket.description}</p>
                          <label className="status-control">
                            <span>Status</span>
                            <select className="text-input select-input" value={ticket.status} disabled={updatingTicket === ticket.id} onChange={(event) => updateStatus(ticket, event.target.value as Status)}>
                              {statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Breakdown<T extends string>({
  title,
  values,
  options,
}: {
  title: string;
  values?: Record<T, number>;
  options: { value: T; label: string }[];
}) {
  const maximum = Math.max(1, ...options.map((option) => values?.[option.value] ?? 0));
  return (
    <section className="breakdown-card" aria-label={`${title} breakdown`}>
      <h3>{title}</h3>
      {options.map((option) => {
        const count = values?.[option.value] ?? 0;
        return (
          <div className="breakdown-row" key={option.value}>
            <div className="breakdown-label"><span>{option.label}</span><strong>{count}</strong></div>
            <div className="breakdown-track"><span style={{ width: `${(count / maximum) * 100}%` }} /></div>
          </div>
        );
      })}
    </section>
  );
}
