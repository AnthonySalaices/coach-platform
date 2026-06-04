// Self-contained avatar: a vibrant gradient + initials derived from the name
// (deterministic, no external service). Falls back to a real image when one is
// set — e.g. a coach's Discord avatar once they sign in.

function initialsOf(name?: string | null): string {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function Avatar({
  name,
  image,
  size = 40,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        style={{
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
        }}
      />
    );
  }

  const hue = hueOf(name ?? "?");
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 50) % 360} 65% 38%))`,
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.4,
        lineHeight: 1,
        flexShrink: 0,
        fontFamily: "var(--font-display, sans-serif)",
        letterSpacing: "0.02em",
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
