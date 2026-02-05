import { NextResponse } from "next/server";

const INVITE_FROM_EMAIL = "FriendNDA <invite@friendnda.app>";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || INVITE_FROM_EMAIL;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type EmailPayload = {
  type: "invite" | "complete" | "copy";
  to: string[];
  pact: {
    title: string;
    slug: string;
    description?: string | null;
  };
  inviterName?: string | null;
};

function buildInviteHtml(
  title: string,
  description: string | null | undefined,
  url: string,
  inviterName: string | null | undefined
) {
  const inviterLine = inviterName
    ? `${inviterName} invited you to join this Trust Pact.`
    : "You’ve been invited to join this Trust Pact.";
  const bodyLine = description ? description : "A quick check-in to keep things clear and kind.";
  return `
    <div style="font-family: 'Trebuchet MS', Arial, sans-serif; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">You’re invited to a Trust Pact</h2>
      <p style="margin: 0 0 8px;">${inviterLine}</p>
      <p style="margin: 0 0 12px; font-weight: 600;">${title}</p>
      <p style="margin: 0 0 16px;">${bodyLine}</p>
      <a href="${url}" style="display: inline-block; padding: 12px 18px; background: #f97316; color: white; border-radius: 999px; text-decoration: none; font-weight: 600;">I’m in 🤝</a>
    </div>
  `;
}

function buildCompleteHtml(title: string, url: string) {
  return `
    <div style="font-family: 'Trebuchet MS', Arial, sans-serif; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Everyone’s in 🎉</h2>
      <p style="margin: 0 0 12px; font-weight: 600;">${title}</p>
      <p style="margin: 0 0 16px;">Everyone invited is in on the Trust Pact. Enjoy the trust glow.</p>
      <a href="${url}" style="display: inline-block; padding: 12px 18px; background: #0f172a; color: white; border-radius: 999px; text-decoration: none; font-weight: 600;">View Trust Pact</a>
    </div>
  `;
}

function buildCopyHtml(title: string, url: string, description?: string | null) {
  const bodyLine = description ? description : "Here’s a copy of the Trust Pact details.";
  return `
    <div style="font-family: 'Trebuchet MS', Arial, sans-serif; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Your Trust Pact copy</h2>
      <p style="margin: 0 0 12px; font-weight: 600;">${title}</p>
      <p style="margin: 0 0 16px;">${bodyLine}</p>
      <a href="${url}" style="display: inline-block; padding: 12px 18px; background: #0f172a; color: white; border-radius: 999px; text-decoration: none; font-weight: 600;">View Trust Pact</a>
    </div>
  `;
}

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
  }
  if (!FROM_EMAIL) {
    return NextResponse.json({ error: "Missing RESEND_FROM_EMAIL" }, { status: 500 });
  }
  if (!BASE_URL) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_BASE_URL" }, { status: 500 });
  }

  let payload: EmailPayload | null = null;
  try {
    payload = (await request.json()) as EmailPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload || !payload.type || !payload.to?.length || !payload.pact?.title || !payload.pact?.slug) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const origin = BASE_URL;
  const pactUrl = `${origin}/p/${payload.pact.slug}`;

  const subject =
    payload.type === "invite"
      ? `You’re invited to a Trust Pact: ${payload.pact.title}`
      : payload.type === "copy"
        ? `Your Trust Pact copy: ${payload.pact.title}`
        : `Everyone’s in! ${payload.pact.title}`;
  const html =
    payload.type === "invite"
      ? buildInviteHtml(
          payload.pact.title,
          payload.pact.description,
          pactUrl,
          payload.inviterName
        )
      : payload.type === "copy"
        ? buildCopyHtml(payload.pact.title, pactUrl, payload.pact.description)
        : buildCompleteHtml(payload.pact.title, pactUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: payload.type === "invite" ? INVITE_FROM_EMAIL : FROM_EMAIL,
      to: payload.to,
      subject,
      html
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: errorBody?.message || "Failed to send email" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
