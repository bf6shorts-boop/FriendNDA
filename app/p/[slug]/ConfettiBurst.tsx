const CONFETTI = [
  { left: "5%", delay: "0s", color: "#f97316" },
  { left: "15%", delay: "0.1s", color: "#0f172a" },
  { left: "25%", delay: "0.2s", color: "#38bdf8" },
  { left: "35%", delay: "0.3s", color: "#facc15" },
  { left: "45%", delay: "0.4s", color: "#22c55e" },
  { left: "55%", delay: "0.2s", color: "#fb7185" },
  { left: "65%", delay: "0.3s", color: "#a855f7" },
  { left: "75%", delay: "0.1s", color: "#f97316" },
  { left: "85%", delay: "0.5s", color: "#0f172a" },
  { left: "95%", delay: "0.15s", color: "#38bdf8" }
];

export default function ConfettiBurst() {
  return (
    <div className="confetti-wrap" aria-hidden>
      {CONFETTI.map((piece, index) => (
        <span
          key={`${piece.left}-${index}`}
          className="confetti-piece"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            animationDelay: piece.delay
          }}
        />
      ))}
    </div>
  );
}
