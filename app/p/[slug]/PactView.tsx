"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate, normalizeEmail } from "@/lib/pact-utils";
import ConfettiBurst from "./ConfettiBurst";

interface PactRecord {
  title: string;
  body: string;
  tone: "friendly" | "neutral" | "serious";
  durationDays: number;
  slug: string;
  ownerSecret: string;
  invitedEmails?: string[];
  allSignedNotified?: boolean;
  expiresAt?: { toDate: () => Date };
  createdAt?: { toDate: () => Date };
}

interface SignatureRecord {
  id: string;
  signature?: string;
  email?: string | null;
  createdAt?: { toDate: () => Date };
}

export default function PactView() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [pact, setPact] = useState<PactRecord | null>(null);
  const [signers, setSigners] = useState<SignatureRecord[]>([]);
  const [signature, setSignature] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "signed" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentCopy, setSentCopy] = useState(false);
  const [signedLocally, setSignedLocally] = useState(false);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    if (!slug) return;

    if (typeof window !== "undefined") {
      const storedSlug = window.sessionStorage.getItem("frienda_owner_slug");
      const storedKey = window.sessionStorage.getItem("frienda_owner_key");
      if (storedSlug === slug && storedKey) {
        setOwnerKey(storedKey);
      }
      const signedKey = window.localStorage.getItem(`frienda_signed_${slug}`);
      if (signedKey) {
        try {
          const parsed = JSON.parse(signedKey) as { email?: string | null };
          setSignedLocally(true);
          setStatus("signed");
          setSentCopy(Boolean(parsed?.email));
        } catch {
          setSignedLocally(true);
          setStatus("signed");
        }
      }
    }

    const pactRef = doc(db, "pacts", slug);
    const signaturesRef = collection(pactRef, "signatures");
    const signatureQuery = query(signaturesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      signatureQuery,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<SignatureRecord, "id">)
        }));
        setSigners(records);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError("Unable to load this Trust Pact.");
      }
    );

    const load = async () => {
      const pactSnap = await getDoc(pactRef);
      if (!pactSnap.exists()) {
        setPact(null);
        return;
      }
      setPact(pactSnap.data() as PactRecord);
    };

    load().catch((err) => {
      console.error(err);
      setError("Unable to load this Trust Pact.");
    });

    return () => unsubscribe();
  }, [slug]);

  const summary = useMemo(() => {
    if (!pact) return null;
    const durationLabel =
      !pact.durationDays || pact.durationDays <= 0 ? "Indefinite" : `${pact.durationDays} days`;
    return `Friendly tone · ${durationLabel}`;
  }, [pact]);

  const invitedEmails = useMemo(
    () => (pact?.invitedEmails ?? []).map((email) => normalizeEmail(email)).filter(Boolean),
    [pact]
  );
  const inviteOnly = invitedEmails.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!signature.trim()) {
      setError("Please add your signature.");
      return;
    }
    if (!slug) {
      setError("Missing Trust Pact link.");
      return;
    }
    if (signedLocally) {
      setError("Looks like you’re already in.");
      return;
    }
    const trimmedEmail = email.trim();
    const normalizedEmail = normalizeEmail(email);
    if (trimmedEmail && !normalizedEmail) {
      setError("That email doesn’t look right.");
      return;
    }
    const normalizedSignature = signature.trim().toLowerCase();
    if (
      signers.some(
        (signer) => (signer.signature || "").trim().toLowerCase() === normalizedSignature
      )
    ) {
      setError("Looks like you’re already in.");
      return;
    }
    if (
      normalizedEmail &&
      signers.some((signer) => normalizeEmail(signer.email ?? "") === normalizedEmail)
    ) {
      setError("Looks like you’re already in.");
      return;
    }
    if (inviteOnly && !normalizedEmail) {
      setError("Please use the email you were invited with.");
      return;
    }
    if (inviteOnly && !invitedEmails.includes(normalizedEmail)) {
      setError("This Trust Pact is invite-only. Use the email you were invited with.");
      return;
    }

    try {
      setStatus("loading");
      const pactRef = doc(db, "pacts", slug);
      await addDoc(collection(pactRef, "signatures"), {
        signature: signature.trim(),
        email: normalizedEmail || null,
        createdAt: serverTimestamp()
      });
      try {
        await addDoc(collection(pactRef, "events"), {
          type: "agree",
          name: signature.trim(),
          createdAt: serverTimestamp()
        });
      } catch (eventError) {
        console.error(eventError);
      }
      setStatus("signed");
      setSentCopy(Boolean(normalizedEmail));
      setSignedLocally(true);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          `frienda_signed_${slug}`,
          JSON.stringify({ email: normalizedEmail || null, signature: signature.trim() })
        );
      }

      if (normalizedEmail && pact) {
        fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "copy",
            to: [normalizedEmail],
            pact: { title: pact.title, slug }
          })
        }).catch((err) => console.error(err));
      }

      const signaturesRef = collection(pactRef, "signatures");
      const signatureQuery = query(signaturesRef, orderBy("createdAt", "asc"));
      const signaturesSnap = await getDocs(signatureQuery);
      const records = signaturesSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<SignatureRecord, "id">)
      }));
      setSigners(records);

      if (inviteOnly && pact && !pact.allSignedNotified) {
        const signedEmails = new Set(
          records.map((record) => normalizeEmail(record.email ?? "")).filter(Boolean)
        );
        const allSigned = invitedEmails.every((invite) => signedEmails.has(invite));
        if (allSigned && !notifying) {
          setNotifying(true);
          const response = await fetch("/api/email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "complete",
              to: invitedEmails,
              pact: { title: pact.title, slug }
            })
          });
          if (response.ok) {
            await updateDoc(pactRef, {
              allSignedNotified: true,
              completedAt: serverTimestamp()
            });
            setPact({ ...pact, allSignedNotified: true });
          }
          setNotifying(false);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Unable to save your response. Please try again.");
    }
  };

  if (!pact && !error) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Loading Trust Pact...</p>
      </div>
    );
  }

  if (!pact) {
    return (
      <div className="card">
        <h1 className="text-lg font-semibold text-primary">Trust Pact not found</h1>
        <p className="mt-2 text-sm text-muted">
          This Trust Pact link is missing or has been removed.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {ownerKey && (
        <div className="notice notice-success">
          <p>
            You created this Trust Pact. Save your private status link:{" "}
            <a
              className="font-semibold underline"
              href={`/p/${slug}/status?key=${ownerKey}`}
            >
              View trust pact signatures
            </a>
          </p>
        </div>
      )}
      <div className="card space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Trust Pact</p>
          <h1 className="text-3xl font-semibold text-primary">{pact.title}</h1>
          <p className="text-sm text-muted">{summary}</p>
        </div>
        <div className="surface-muted rounded-xl p-4 text-sm text-muted">
          <p className="whitespace-pre-wrap">{pact.body}</p>
        </div>
        <div className="text-xs text-soft">
          Expires{" "}
          {pact.durationDays && pact.durationDays > 0 && pact.expiresAt
            ? formatDate(pact.expiresAt.toDate())
            : "Indefinite"}
        </div>
        {inviteOnly && (
          <div className="notice notice-warning text-xs">
            Invite-only Trust Pact. Use the email you were invited with.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <h2 className="text-lg font-semibold text-primary">Agree to the Trust Pact</h2>
          <p className="mt-2 text-sm text-muted">
            Add your signature to show you agree to keep this private.
          </p>
          {status === "signed" ? (
            <div className="notice notice-success mt-4 space-y-1">
              <p>Thanks for agreeing! You’re in.</p>
              {sentCopy && <p>We’ve sent you a copy by email.</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="signature">Signature</label>
                <input
                  id="signature"
                  className="input"
                  value={signature}
                  onChange={(event) => setSignature(event.target.value)}
                  placeholder="Type your full name"
                />
              </div>
              <div>
                <label htmlFor="email">Email (optional)</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <p className="helper">Get a copy by email (recommended)</p>
              </div>
              {error && <p className="notice notice-error">{error}</p>}
              <button className="btn" type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Saving..." : "I’m in 🤝"}
              </button>
            </form>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-primary">Who’s in</h2>
          <p className="mt-2 text-sm text-muted">
            Names only, shared for clarity.
          </p>
          {inviteOnly && pact?.allSignedNotified && (
            <div className="notice notice-success mt-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden>🎉</span>
                Everyone invited is in. Time to celebrate!
              </div>
              <ConfettiBurst />
            </div>
          )}
          <div className="mt-4 space-y-3 text-sm text-muted">
            {signers.length === 0 ? (
              <p className="text-soft">Be the first to join.</p>
            ) : (
              signers.map((signer) => (
                <div key={signer.id} className="mini-card rounded-xl px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-primary">
                      {signer.signature || "Signed"}
                    </span>
                    <span className="text-xs text-soft">
                      {signer.createdAt ? formatDate(signer.createdAt.toDate()) : "Pending"}
                    </span>
                  </div>
                  {signer.email && (
                    <p className="mt-1 text-xs text-soft">{signer.email}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
