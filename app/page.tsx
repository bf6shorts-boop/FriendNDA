export default function HomePage() {
  return (
    <section className="hero-card relative overflow-hidden rounded-[32px] px-6 py-12 backdrop-blur md:px-10 md:py-16">
      <div className="hero-glow pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full blur-3xl" />
      <div className="hero-glow-alt pointer-events-none absolute -right-10 bottom-6 h-56 w-56 rounded-full blur-3xl" />

      <div className="relative">
        <p className="pill">Trust Pact for friends</p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight text-primary md:text-5xl">
          Keep secrets fun, friendly, and clear.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          FrieNDA makes it easy to share a playful Trust Pact with friends. Set boundaries, invite your
          crew, and celebrate when everyone says “yes, I’m in.”
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn" href="/create">
            Create a Trust Pact
          </a>
        </div>

        <div className="steps-card mt-10 rounded-3xl p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-soft">How it works</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted ring-1 ring-[var(--accent-border)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 1</p>
              <p className="mt-2 text-primary">Create a Trust Pact to set expectations together</p>
            </div>
            <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 2</p>
              <p className="mt-2 text-primary">Share the link or send email invites</p>
            </div>
            <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 3</p>
              <p className="mt-2 text-primary">Watch who’s in and don’t forget to sign it yourself</p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
