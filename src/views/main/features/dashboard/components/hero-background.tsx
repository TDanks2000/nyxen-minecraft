export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Deep atmospheric base — neutral darks so the theme accent reads */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.08 0.012 130) 0%, oklch(0.13 0.018 132) 40%, oklch(0.16 0.022 134) 60%, oklch(0.08 0.012 130) 100%)",
        }}
      />
      {/* Primary accent core (theme-driven) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 110px at 70% 26%, color-mix(in oklch, var(--primary) 75%, white) 0%, transparent 80%)",
          opacity: 0.55,
        }}
      />
      {/* Primary bloom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 46% at 70% 24%, var(--primary), transparent 75%)",
          opacity: 0.45,
        }}
      />
      {/* Secondary accent haze (chart-5 / cool counterpoint) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 44% 52% at 88% 38%, var(--chart-5), transparent 70%)",
          opacity: 0.35,
        }}
      />
      {/* Horizon ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 115% 32% at 60% 70%, var(--primary), transparent 70%)",
          opacity: 0.22,
        }}
      />
      {/* Minecraft terrain silhouette */}
      <div
        className="absolute right-0 bottom-0 h-[72%] w-[82%]"
        style={{
          background: "color-mix(in oklch, var(--background) 92%, black)",
          clipPath:
            "polygon(100% 100%, 0% 100%, 0% 88%, 3% 70%, 6% 83%, 9% 54%, 12% 69%, 15% 40%, 17% 58%, 20% 28%, 22% 44%, 25% 36%, 27% 46%, 29% 22%, 31% 39%, 33% 32%, 36% 44%, 39% 18%, 41% 37%, 44% 25%, 47% 42%, 50% 13%, 53% 36%, 56% 47%, 58% 29%, 61% 44%, 64% 16%, 67% 35%, 70% 50%, 73% 21%, 76% 39%, 79% 27%, 82% 46%, 85% 30%, 88% 47%, 91% 35%, 94% 51%, 97% 39%, 100% 45%)",
        }}
      />
      {/* Bottom fade to dark */}
      <div
        className="absolute right-0 bottom-0 left-0 h-[42%]"
        style={{
          background:
            "linear-gradient(0deg, color-mix(in oklch, var(--background) 96%, black) 0%, transparent)",
        }}
      />
      {/* Subtle scanlines */}
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,1) 3px, rgba(0,0,0,1) 4px)",
        }}
      />
      {/* Left content vignette — lets text remain readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklch, var(--background) 98%, black) 0%, color-mix(in oklch, var(--background) 90%, black) 22%, color-mix(in oklch, var(--background) 60%, transparent) 44%, transparent 70%)",
        }}
      />
    </div>
  );
}
