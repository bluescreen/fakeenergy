"use client";

import { useState } from "react";

interface Q { q: string; a: string; }

export function Faq({ items }: { items: Q[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="faq">
      {items.map((item) => (
        <div key={item.q} className="faq-item">
          <button className="faq-q" onClick={() => setOpen(!open)}>{item.q}</button>
          {open && <p>{item.a}</p>}
        </div>
      ))}
    </section>
  );
}
