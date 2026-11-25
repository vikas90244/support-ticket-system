"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const categories = ["general", "billing", "technical", "account"] as const;
const priorities = ["low", "medium", "high", "critical"] as const;

const ticketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a subject.")
    .max(200, "Subject must be 200 characters or fewer."),
  description: z.string().trim().min(1, "Please describe the issue."),
  category: z.enum(categories),
  priority: z.enum(priorities),
});

type TicketFormValues = z.infer<typeof ticketSchema>;
type Suggestion = {
  category: (typeof categories)[number];
  priority: (typeof priorities)[number];
};
type Ticket = { 
          title: string; 
          category: string; 
          priority: string 
};

export function CreateTicketForm({ onCreated }: { onCreated?: () => void }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "general",
      priority: "medium",
    },
  });
  const description = watch("description");
  const [suggestionState, setSuggestionState] = useState<
    "idle" | "waiting" | "loading" | "ready" | "unavailable"
  >("idle");
  const [suggestionError, setSuggestionError] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<Ticket | null>(null);
  const categoryEdited = useRef(false);
  const priorityEdited = useRef(false);
  const suggestionRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++suggestionRequestId.current;
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 20) {
      setSuggestionState("idle");
      setSuggestionError("");
      return;
    }

    setSuggestionState("waiting");
    setSuggestionError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (requestId !== suggestionRequestId.current) return;
      setSuggestionState("loading");
      try {
        const response = await fetch("/api/tickets/classify/", {
          method: "POST",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: trimmedDescription }),
          signal: controller.signal,
        });
        if (controller.signal.aborted || requestId !== suggestionRequestId.current) return;
        if (!response.ok) {
          const details = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            details?.error || `Suggestion request failed (${response.status}).`,
          );
        }

        const result = (await response.json()) as {
          category?: string;
          priority?: string;
        };
        if (
          !categories.includes(result.category as Suggestion["category"]) ||
          !priorities.includes(result.priority as Suggestion["priority"])
        ) {
          throw new Error("The suggestions could not be read.");
        }
        if (controller.signal.aborted || requestId !== suggestionRequestId.current)
          return;

        const nextSuggestion = {
          category: result.category as Suggestion["category"],
          priority: result.priority as Suggestion["priority"],
        };
        if (!categoryEdited.current)
          setValue("category", nextSuggestion.category);
        if (!priorityEdited.current)
          setValue("priority", nextSuggestion.priority);
        setSuggestionState("ready");
      } catch (requestError) {
        if (controller.signal.aborted || requestId !== suggestionRequestId.current)
          return;
        setSuggestionError(
          requestError instanceof Error
            ? requestError.message
            : "Could not get suggestions.",
        );
        setSuggestionState("unavailable");
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [description, setValue]);

  async function submitTicket(values: TicketFormValues) {
    setError("");
    try {
      const response = await fetch("/api/tickets/", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const details = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        const firstError = details && Object.values(details).flat()[0];
        throw new Error(
          typeof firstError === "string"
            ? firstError
            : "We could not send your ticket. Please try again.",
        );
      }

      const ticket = (await response.json()) as Ticket;
      setSubmitted(ticket);
      onCreated?.();
      reset();
      setSuggestionError("");
      setSuggestionState("idle");
      categoryEdited.current = false;
      priorityEdited.current = false;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not send your ticket. Please try again.",
      );
    }
  }

  const suggestionMessage = {
    idle: "Add a little detail to get automatic suggestions.",
    waiting: "Preparing suggestions...",
    loading: "Analyzing your description. This may take a little while...",
    ready: "Suggestions added. You can change them below.",
    unavailable: suggestionError
      ? `Suggestions could not be loaded: ${suggestionError}`
      : "Suggestions could not be loaded. You can choose manually.",
  }[suggestionState];

  return (
    <section className="form-card" aria-label="Ticket details">
      {submitted && (
        <div className="success-message" role="status">
          <span className="success-check" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>Your request is on its way.</strong>
            <p>
              &quot;{submitted.title}&quot; was submitted as{" "}
              {submitted.category} · {submitted.priority} priority.
            </p>
          </div>
          <button
            className="dismiss-success"
            type="button"
            onClick={() => setSubmitted(null)}
            aria-label="Dismiss confirmation"
          >
            ×
          </button>
        </div>
      )}

      <form className="ticket-form" onSubmit={handleSubmit(submitTicket)}>
        <label className="field-label" htmlFor="ticket-title">
          Subject <span>*</span>
        </label>
        <input
          {...register("title", { onChange: () => setSubmitted(null) })}
          id="ticket-title"
          className="text-input"
          type="text"
          placeholder="A short summary of the issue"
          maxLength={200}
          aria-invalid={Boolean(errors.title)}
        />
        {errors.title && <p className="field-error">{errors.title.message}</p>}

        <label
          className="field-label description-label"
          htmlFor="ticket-description"
        >
          Description <span>*</span>
        </label>
        <textarea
          {...register("description", {
            onChange: () => {
              categoryEdited.current = false;
              priorityEdited.current = false;
              setSubmitted(null);
            },
          })}
          id="ticket-description"
          className="text-input description-input"
          placeholder="Include what you were trying to do and anything you have already tried..."
          rows={6}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description && (
          <p className="field-error">{errors.description.message}</p>
        )}

        <div
          className="suggestion-status"
          aria-live="polite"
          data-state={suggestionState}
          aria-busy={suggestionState === "loading" || suggestionState === "waiting"}
        >
          <span
            className={`suggestion-indicator ${suggestionState === "loading" || suggestionState === "waiting" ? "is-pulsing" : ""}`}
            aria-hidden="true"
          >
            {suggestionState === "loading" ? "◌" : "✦"}
          </span>
          <span>{suggestionMessage}</span>
        </div>

        <div className="select-grid">
          <div>
            <label className="field-label" htmlFor="ticket-category">
              Category
            </label>
            <select
              {...register("category", {
                onChange: () => {
                  categoryEdited.current = true;
                },
              })}
              id="ticket-category"
              className="text-input select-input"
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="ticket-priority">
              Priority
            </label>
            <select
              {...register("priority", {
                onChange: () => {
                  priorityEdited.current = true;
                },
              })}
              id="ticket-priority"
              className="text-input select-input"
            >
              {priorities.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? "Sending request..." : "Send request"}</span>
            <span aria-hidden="true">{isSubmitting ? "..." : "→"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
