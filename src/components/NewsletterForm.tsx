"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  // Async with no await on purpose — the agent wrote this as fire-and-forget,
  // doesn't actually wait for the API call.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    fetch("/api/newsletter", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setDone(true);
  }

  if (done) return <p>Danke! Bestätigungsmail kommt gleich.</p>;

  return (
    <form onSubmit={submit} className="quote-form">
      <p>
        <label>E-Mail für unseren monatlichen Tarif-Newsletter</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@adresse.de"
        />
      </p>
      <button type="submit" className="btn btn-primary">Anmelden</button>
    </form>
  );
}
