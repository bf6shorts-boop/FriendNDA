"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildSlug, randomString } from "@/lib/pact-utils";
import type { FirebaseError } from "firebase/app";

export default function CreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!title.trim()) return "Please add a title.";
    if (!body.trim()) return "Please describe the pact.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextError = validate();
    if (nextError) {
      setError(nextError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ownerSecret = randomString(24);
      let slug = "";
      let created = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        slug = buildSlug(title);
        const pactRef = doc(db, "pacts", slug);
        const existing = await getDoc(pactRef);
        if (existing.exists()) {
          continue;
        }
        await setDoc(pactRef, {
          title: title.trim(),
          body: body.trim(),
          tone: "friendly",
          durationDays: 0,
          expiresAt: null,
          ownerSecret,
          slug,
          invitedEmails: [],
          allSignedNotified: false,
          createdAt: serverTimestamp()
        });
        created = true;
        break;
      }

      if (!created) {
        throw new Error("Unable to generate a unique link. Please try again.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("frienda_owner_slug", slug);
        window.sessionStorage.setItem("frienda_owner_key", ownerSecret);
      }

      router.push(`/p/${slug}/share`);
    } catch (err) {
      const firebaseError = err as FirebaseError;
      if (firebaseError?.code === "unavailable") {
        setError(
          "Firestore can’t connect right now. Double-check your .env.local values, Firestore rules, and network."
        );
        return;
      }
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          className="input"
          placeholder="e.g. Campfire Stories Trust Pact"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="body">Trust Pact details</label>
        <textarea
          id="body"
          className="input min-h-[140px]"
          placeholder="Describe what should stay private, how to handle screenshots, and any other boundaries."
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      {error && <p className="notice notice-error">{error}</p>}
      <button className="btn-ember" type="submit" disabled={loading}>
        {loading ? "Creating Trust Pact..." : "Create Trust Pact"}
      </button>
    </form>
  );
}
