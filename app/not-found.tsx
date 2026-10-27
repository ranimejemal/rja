import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: "40rem" }}>
        <span className="tag">(404)</span>
        <h1 className="h2">This page doesn’t exist, or you don’t have access to it.</h1>
        <div className="row">
          <Link className="btn" href="/explore">Explore automations</Link>
          <Link className="btn ghost" href="/">Home</Link>
        </div>
      </div>
    </section>
  );
}
