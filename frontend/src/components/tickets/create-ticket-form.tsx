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

export function CreateTicketForm() {
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
  const title = watch("title");
  const description = watch("description");
  const [suggestionState, setSuggestionState] = useState<
    "idle" | "waiting" | "loading" | "ready" | "unavailable"
  >("idle");
  const [suggested, setSuggested] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<Ticket | null>(null);
  const categoryEdited = useRef(false);
  const priorityEdited = useRef(false);

  useEffect(() => {
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 20) {
      setSuggestionState("idle");
      setSuggested(null);
      return;
    }

    setSuggestionState("waiting");
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionState("loading");
      try {
        const response = await fetch("/api/tickets/classify/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: trimmedDescription }),
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("Suggestions are unavailable right now.");

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

        const nextSuggestion = {
          category: result.category as Suggestion["category"],
          priority: result.priority as Suggestion["priority"],
        };
        setSuggested(nextSuggestion);
        if (!categoryEdited.current)
          setValue("category", nextSuggestion.category);
        if (!priorityEdited.current)
          setValue("priority", nextSuggestion.priority);
        setSuggestionState("ready");
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setSuggested(null);
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
      reset();
      setSuggested(null);
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
    idle: "Suggestions appear as you describe the issue",
    waiting: "Getting your suggestions ready...",
    loading: "Finding the right category and priority...",
    ready: "Suggestions added. Adjust them anytime.",
    unavailable: "Suggestions are unavailable right now. You can choose below.",
  }[suggestionState];

  return (
    <section className="form-card" aria-labelledby="form-title">
      <div className="form-card-heading">
        <div>
          <p className="form-kicker">TICKET DETAILS</p>
          <h2 id="form-title">Tell us a little more</h2>
        </div>
        <span className="required-note">
          <span>*</span> Required
        </span>
      </div>

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
        <div className="field-hint">
          <span>Keep it clear and concise</span>
          <span>{title.length}/200</span>
        </div>
        {errors.title && <p className="field-error">{errors.title.message}</p>}

        <label
          className="field-label description-label"
          htmlFor="ticket-description"
        >
          What is happening? <span>*</span>
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
        <div className="field-hint">
          <span>A little context can make all the difference</span>
          <span>{description.length} characters</span>
        </div>
        {errors.description && (
          <p className="field-error">{errors.description.message}</p>
        )}

        <div
          className="suggestion-status"
          aria-live="polite"
          data-state={suggestionState}
        >
          <span
            className={`suggestion-indicator ${suggestionState === "loading" || suggestionState === "waiting" ? "is-pulsing" : ""}`}
            aria-hidden="true"
          >
            *
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
            {suggested && (
              <span className="select-suggestion">
                Suggested: {suggested.category}
              </span>
            )}
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
            {suggested && (
              <span className="select-suggestion">
                Suggested: {suggested.priority}
              </span>
            )}
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <p>We will take a look as soon as we can.</p>
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
