"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeEmail } from "@/lib/pact-utils";
import { trackEvent } from "@/lib/analytics";

interface PactRecord {
  title: string;
  body: string;
  slug: string;
  ownerSecret: string;
  invitedEmails?: string[];
}

type CopyStatus = "idle" | "success" | "error";
type InviteStatus = "idle" | "sending" | "sent" | "error";

export default function ShareView() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [pact, setPact] = useState<PactRecord | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviterName, setInviterName] = useState("");
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!slug) return;
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/p/${slug}`);
      const storedSlug = window.sessionStorage.getItem("frienda_owner_slug");
      const storedKey = window.sessionStorage.getItem("frienda_owner_key");
      if (storedSlug === slug && storedKey) {
        setOwnerKey(storedKey);
      }
    }
    if (!hasTrackedView.current) {
      trackEvent("step_2_share_view");
      hasTrackedView.current = true;
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      const pactRef = doc(db, "pacts", slug);
      const pactSnap = await getDoc(pactRef);
      if (!pactSnap.exists()) {
        setPact(null);
        setLoading(false);
        return;
      }
      setPact(pactSnap.data() as PactRecord);
      setLoading(false);
    };
    load().catch((err) => {
      console.error(err);
      setPact(null);
      setLoading(false);
    });
  }, [slug]);

  const inviteDescription = useMemo(() => {
    if (!pact?.body) return null;
    const cleaned = pact.body.replace(/\s+/g, " ").trim();
    if (cleaned.length <= 160) return cleaned;
    return `${cleaned.slice(0, 157)}...`;
  }, [pact?.body]);

  const parseInvites = () => {
    const rawEntries = inviteEmails
      .split(/[\n,]+/)
      .map((email) => email.trim())
      .filter(Boolean);
    const normalized = rawEntries.map((email) => normalizeEmail(email));
    const invalid = rawEntries.find((email, index) => !normalized[index]);
    if (invalid) {
      return { emails: [], error: "One or more invite emails look off. Double-check formatting." };
    }
    const unique = Array.from(new Set(normalized.filter(Boolean)));
    return { emails: unique, error: null };
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("success");
      trackEvent("step_2_copy_link");
    } catch (copyError) {
      console.error(copyError);
      setCopyStatus("error");
    }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviteError(null);
    if (!slug || !pact) {
      setInviteError("Missing Trust Pact details.");
      return;
    }
    const { emails, error } = parseInvites();
    if (error) {
      setInviteError(error);
      return;
    }
    if (emails.length === 0) {
      setInviteError("Add at least one email to invite.");
      return;
    }

    setInviteStatus("sending");

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invite",
          to: emails,
          inviterName: inviterName.trim() || null,
          pact: {
            title: pact.title,
            slug,
            description: inviteDescription
          }
        })
      });

      if (!response.ok) {
        throw new Error("Unable to send invites.");
      }

      const pactRef = doc(db, "pacts", slug);
      const currentInvites = (pact.invitedEmails ?? []).map((email) => normalizeEmail(email));
      const mergedInvites = Array.from(new Set([...currentInvites, ...emails])).filter(Boolean);
      await updateDoc(pactRef, {
        invitedEmails: mergedInvites
      });

      const eventsRef = collection(pactRef, "events");
      await Promise.all(
        emails.map((email) =>
          addDoc(eventsRef, {
            type: "invite",
            email,
            inviterName: inviterName.trim() || null,
            createdAt: serverTimestamp()
          })
        )
      );

      setPact({ ...pact, invitedEmails: mergedInvites });
      setInviteEmails("");
      setInviteStatus("sent");
      trackEvent("step_2_send_invites", { count: emails.length });
    } catch (err) {
      console.error(err);
      setInviteError("Unable to send invites right now.");
      setInviteStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-muted">Loading share link...</p>
      </div>
    );
  }

  if (!pact) {
    return (
      <div className="card">
        <h1 className="text-lg font-semibold text-primary">Share not available</h1>
        <p className="mt-2 text-sm text-muted">
          This Trust Pact link is missing or has been removed.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 1</p>
          <p className="mt-2 text-primary">Create a Trust Pact to set expectations together</p>
        </div>
        <div className="mini-card step-card-active rounded-2xl px-4 py-5 text-sm text-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 2</p>
          <p className="mt-2 text-primary">Share the link or send email invites</p>
        </div>
        <div className="mini-card rounded-2xl px-4 py-5 text-sm text-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Step 3</p>
          <p className="mt-2 text-primary">Watch who’s in and don’t forget to sign it yourself</p>
        </div>
      </div>
      <div className="card space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Share</p>
          <h1 className="text-3xl font-semibold text-primary">{pact.title}</h1>
          <p className="text-sm text-muted">
            Your Trust Pact is ready. Copy the link or invite friends by email.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className="btn-secondary text-sm" href={`/p/${slug}`}>
            Sign your Trust Pact
          </a>
        </div>
        <div className="space-y-3">
          <label htmlFor="shareLink">Share link</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="shareLink"
              className="input flex-1"
              value={shareUrl}
              readOnly
            />
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

      <div className="card space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Invite by email
          </p>
          <p className="text-sm text-muted">
            Optional. Invite specific friends to keep this private.
          </p>
        </div>
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label htmlFor="inviterName">Your name (optional)</label>
            <input
              id="inviterName"
              className="input"
              value={inviterName}
              onChange={(event) => setInviterName(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="inviteEmails">Emails</label>
            <textarea
              id="inviteEmails"
              className="input min-h-[90px]"
              placeholder="alex@example.com, jamie@example.com"
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
            />
            <p className="helper">Separate with commas or new lines.</p>
          </div>
          {inviteError && <p className="notice notice-error">{inviteError}</p>}
          {inviteStatus === "sent" && (
            <p className="notice notice-success">Invites sent.</p>
          )}
          <button className="btn-secondary" type="submit" disabled={inviteStatus === "sending"}>
            {inviteStatus === "sending" ? "Sending..." : "Send invites"}
          </button>
        </form>
      </div>
    </section>
  );
}
