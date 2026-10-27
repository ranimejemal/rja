export function LoadingSkeleton() {
  return (
    <section className="section" aria-busy="true" aria-label="Loading">
      <div className="container stack" style={{ "--gap": "1.25rem" } as React.CSSProperties}>
        <div className="skeleton" style={{ height: "3.5rem", width: "60%" }} />
        <div className="grid">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: "22rem" }} />)}
        </div>
      </div>
    </section>
  );
}
