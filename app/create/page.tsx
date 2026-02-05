import CreateForm from "./CreateForm";

export default function CreatePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Create a Trust Pact</p>
        <h1 className="text-3xl font-semibold text-primary">Start a Trust Pact</h1>
        <p className="text-sm text-muted">
          Write a quick Trust Pact for your group. You’ll get a shareable link and a private
          status page.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="mini-card step-card-active rounded-2xl px-4 py-5 text-sm text-muted">
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
      <div className="card">
        <CreateForm />
      </div>
    </section>
  );
}
