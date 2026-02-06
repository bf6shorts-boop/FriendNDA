import type { Metadata } from "next";
import ThemeToggle from "./ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "FrieNDA",
  description: "A social pact for sharing boundaries and trust.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const themeInitScript = `
    (function () {
      try {
        var key = "frienda_theme";
        var theme = localStorage.getItem(key);
        if (theme !== "light" && theme !== "dark") {
          var media = window.matchMedia("(prefers-color-scheme: dark)");
          theme = media.matches ? "dark" : "light";
        }
        document.documentElement.setAttribute("data-theme", theme);
      } catch (e) {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-D0EE4P7Y1M"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-D0EE4P7Y1M');
            `
          }}
        />
      </head>
      <body>
        <div className="page-shell">
          <header className="header-shell">
            <div className="container-shell flex items-center justify-between py-4">
              <a href="/" className="relative flex h-12 w-[180px] items-center overflow-hidden text-lg font-semibold text-primary">
                <img
                  src="/friendndatransperant.png"
                  alt="FrieNDA logo"
                  className="pointer-events-none absolute left-0 top-1/2 h-[280px] w-[280px] -translate-y-1/2 object-contain"
                  width={280}
                  height={280}
                />
                <span className="sr-only">FrieNDA</span>
              </a>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <a className="btn-secondary text-xs" href="/create">
                  Create Trust Pact
                </a>
              </div>
            </div>
          </header>
          <main className="container-shell py-12">{children}</main>
          <footer className="container-shell pb-12 text-xs text-soft">
            FriendNDA is a trust-based agreement designed for clarity and accountability between people.
            <div className="mt-3">
              <a
                href="https://www.producthunt.com/products/friendnda?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-friendnda"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  alt="FriendNDA - A simple way to ask friends to keep things private | Product Hunt"
                  width="250"
                  height="54"
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1074414&theme=light&t=1770389708271"
                />
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
