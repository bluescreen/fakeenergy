"use client";

import { useState } from "react";

interface Q { q: string; a: string; }

export function Faq({ items }: { items: Q[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section className="faq">
      {items.map((item, i) => (
        <div key={item.q} className="faq-item">
          <button className="faq-q" onClick={() => setOpenIndex(openIndex === i ? null : i)}>{item.q}</button>
          {openIndex === i && <p>{item.a}</p>}
        </div>
      ))}
    </section>
  );
}
