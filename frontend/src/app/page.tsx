import { CreateTicketForm } from "@/components/tickets/create-ticket-form";
import Link from "next/link";

export default function Home() {
  return (
    <main className="support-page">
      <header className="topbar">
        <Link className="brand" href="/">Support desk</Link>
      </header>

      <section className="page-content" aria-labelledby="page-title">
        <h1 id="page-title">Submit a support ticket</h1>
        <p className="intro-copy">Describe the issue and we’ll get back to you.</p>
        <CreateTicketForm />
      </section>
    </main>
  );
}
