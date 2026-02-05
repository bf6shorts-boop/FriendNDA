"use client";

import { useEffect, useState } from "react";

export default function SignOwnPactButton() {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const storedSlug = window.sessionStorage.getItem("frienda_owner_slug");
    if (storedSlug) {
      setSlug(storedSlug);
    }
  }, []);

  if (!slug) return null;

  return (
    <a className="btn-secondary text-sm" href={`/p/${slug}`}>
      Sign your Trust Pact
    </a>
  );
}
