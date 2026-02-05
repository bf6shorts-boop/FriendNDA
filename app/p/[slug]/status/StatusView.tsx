"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/pact-utils";

interface PactRecord {
  title: string;
  ownerSecret: string;
  slug: string;
  invitedEmails?: string[];
}

interface SignatureRecord {
  id: string;
  signature?: string;
  email?: string | null;
  createdAt?: { toDate: () => Date };
}

interface PactEvent {
  id: string;
  type: "invite" | "agree";
  name?: string;
  email?: string | null;
  createdAt?: { toDate: () => Date };
}

export default function StatusView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string | undefined;
  const key = searchParams?.get("key");
  const [pact, setPact] = useState<PactRecord | null>(null);
  const [signers, setSigners] = useState<SignatureRecord[]>([]);
  const [activityEvents, setActivityEvents] = useState<PactEvent[]>([]);
  const [fadingEventIds, setFadingEventIds] = useState<Record<string, boolean>>({});
  const [dismissedEventIds, setDismissedEventIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const fadeTimers = useRef(new Map<string, number>());
  const dismissTimers = useRef(new Map<string, number>());
  const eventsInitialized = useRef(false);

  useEffect(() => {
    if (!slug) return;
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/p/${slug}`);
    }

    const load = async () => {
      const pactRef = doc(db, "pacts", slug);
      const pactSnap = await getDoc(pactRef);
      if (!pactSnap.exists()) {
        setPact(null);
        setLoading(false);
        return;
      }
      const pactData = pactSnap.data() as PactRecord;
      setPact(pactData);
      if (!key || key !== pactData.ownerSecret) {
        setLoading(false);
        return;
      }

      const signaturesRef = collection(pactRef, "signatures");
      const signatureQuery = query(signaturesRef, orderBy("createdAt", "desc"));
      const unsubscribeSigners = onSnapshot(signatureQuery, (snapshot) => {
        const records = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<SignatureRecord, "id">)
        }));
        setSigners(records);
      });
      setLoading(false);
      return unsubscribeSigners;
    };

    let unsubscribeSigners: (() => void) | undefined;
    load()
      .then((unsubscribe) => {
        unsubscribeSigners = unsubscribe;
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load status.");
        setLoading(false);
      });

    return () => {
      if (unsubscribeSigners) {
        unsubscribeSigners();
      }
    };
  }, [slug, key]);

  const authorized = useMemo(() => {
    if (!pact) return false;
    return Boolean(key && key === pact.ownerSecret);
  }, [pact, key]);

  useEffect(() => {
    if (!slug || !authorized) return;
    eventsInitialized.current = false;
    const pactRef = doc(db, "pacts", slug);
    const eventsRef = collection(pactRef, "events");
    const activityQuery = query(eventsRef, orderBy("createdAt", "desc"), limit(3));

    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      if (!eventsInitialized.current) {
        eventsInitialized.current = true;
        return;
      }
      const additions = snapshot.docChanges().filter((change) => change.type === "added");
      if (additions.length === 0) return;
      const newEvents = additions.map((change) => ({
        id: change.doc.id,
        ...(change.doc.data() as Omit<PactEvent, "id">)
      }));
      setActivityEvents((prev) => [...newEvents, ...prev].slice(0, 3));
    });

    return () => {
      unsubscribeActivity();
    };
  }, [authorized, slug]);

  useEffect(() => {
    activityEvents.forEach((event) => {
      if (dismissedEventIds[event.id] || fadeTimers.current.has(event.id)) {
        return;
      }
      const fadeTimer = window.setTimeout(() => {
        setFadingEventIds((prev) => ({ ...prev, [event.id]: true }));
        const dismissTimer = window.setTimeout(() => {
          setDismissedEventIds((prev) => ({ ...prev, [event.id]: true }));
        }, 700);
        dismissTimers.current.set(event.id, dismissTimer);
      }, 4200);
      fadeTimers.current.set(event.id, fadeTimer);
    });
  }, [activityEvents, dismissedEventIds]);

  useEffect(() => {
    return () => {
      fadeTimers.current.forEach((timer) => window.clearTimeout(timer));
      dismissTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const visibleEvents = useMemo(
    () => activityEvents.filter((event) => !dismissedEventIds[event.id]),
    [activityEvents, dismissedEventIds]
  );
  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("success");
    } catch (copyError) {
      console.error(copyError);
      setCopyStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Loading status...</p>
      </div>
    );
  }

  if (!pact) {
    return (
      <div className="card">
        <h1 className="text-lg font-semibold text-primary">Status not available</h1>
        <p className="mt-2 text-sm text-muted">
          This Trust Pact could not be found.
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="card">
        <h1 className="text-lg font-semibold text-primary">Status not available</h1>
        <p className="mt-2 text-sm text-muted">
          A valid owner key is required to view this page.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {visibleEvents.length > 0 && (
        <div className="flex justify-end">
          <div className="flex w-full max-w-xs flex-col gap-2">
            {visibleEvents.map((event) => {
              const message =
                event.type === "agree"
                  ? `${event.name || "Someone"} is in`
                  : `Invite sent${event.email ? ` to ${event.email}` : ""}`;
              return (
                <div
                  key={event.id}
                  className={`notice notice-info text-xs transition-opacity duration-700 ${
                    fadingEventIds[event.id] ? "opacity-0" : "opacity-100"
                  }`}
                >
                  {message}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 1</p>
          <p className="mt-2 text-primary">Create a Trust Pact to set expectations together</p>
        </div>
        <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 2</p>
          <p className="mt-2 text-primary">Share the link or send email invites</p>
        </div>
        <div className="mini-card step-card-active rounded-2xl px-4 py-5 text-sm text-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 3</p>
          <p className="mt-2 text-primary">Watch who’s in and don’t forget to sign it yourself</p>
        </div>
      </div>
      <div className="card">
        <h1 className="text-2xl font-semibold text-primary">{pact.title} status</h1>
        <p className="mt-2 text-sm text-muted">
          Share this page only with the pact owner. It shows who’s in.
        </p>
        <div className="mt-4 space-y-2">
          <label htmlFor="ownerShareLink">Share link</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="ownerShareLink" className="input flex-1" value={shareUrl} readOnly />
            <button className="btn" type="button" onClick={handleCopy}>
              Copy link
            </button>
          </div>
          {copyStatus === "success" && <p className="helper">Link copied.</p>}
          {copyStatus === "error" && (
            <p className="helper">Copy failed. You can still select and copy the link.</p>
          )}
        </div>
      </div>
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-primary">Who’s in</h2>
        {pact.invitedEmails && pact.invitedEmails.length > 0 && (
          <div className="notice notice-info text-xs">
            Invited emails: {pact.invitedEmails.join(", ")}
          </div>
        )}
        {signers.length === 0 ? (
          <p className="text-sm text-soft">No one is in yet.</p>
        ) : (
          <div className="space-y-3 text-sm text-muted">
            {signers.map((signer) => (
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
