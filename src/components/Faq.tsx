interface Q { q: string; a: string; }

export function Faq({ items }: { items: Q[] }) {
  return (
    <section className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  );
}
