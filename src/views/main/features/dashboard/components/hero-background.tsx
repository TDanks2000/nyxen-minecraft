export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Deep atmospheric base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #080401 0%, #190902 12%, #3f1507 26%, #6b280c 40%, #8c3c12 50%, #6a2b0a 62%, #221005 80%, #080401 100%)",
        }}
      />
      {/* Sun core */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 90px at 70% 26%, rgba(255,215,80,0.42), transparent 80%)",
        }}
      />
      {/* Sun bloom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 46% at 70% 24%, rgba(225,105,22,0.72), transparent 76%)",
        }}
      />
      {/* Purple atmospheric haze */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 44% 52% at 88% 38%, rgba(125,35,130,0.4), transparent 70%)",
        }}
      />
      {/* Horizon ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 115% 32% at 60% 70%, rgba(160,65,12,0.35), transparent 70%)",
        }}
      />
      {/* Minecraft terrain silhouette */}
      <div
        className="absolute right-0 bottom-0 h-[72%] w-[82%]"
        style={{
          background: "rgba(4,2,1,0.9)",
          clipPath:
            "polygon(100% 100%, 0% 100%, 0% 88%, 3% 70%, 6% 83%, 9% 54%, 12% 69%, 15% 40%, 17% 58%, 20% 28%, 22% 44%, 25% 36%, 27% 46%, 29% 22%, 31% 39%, 33% 32%, 36% 44%, 39% 18%, 41% 37%, 44% 25%, 47% 42%, 50% 13%, 53% 36%, 56% 47%, 58% 29%, 61% 44%, 64% 16%, 67% 35%, 70% 50%, 73% 21%, 76% 39%, 79% 27%, 82% 46%, 85% 30%, 88% 47%, 91% 35%, 94% 51%, 97% 39%, 100% 45%)",
        }}
      />
      {/* Bottom fade to dark */}
      <div
        className="absolute right-0 bottom-0 left-0 h-[42%]"
        style={{
          background: "linear-gradient(0deg, rgba(4,2,1,0.96) 0%, transparent)",
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
      {/* Left content vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(4,2,1,0.98) 0%, rgba(4,2,1,0.90) 20%, rgba(4,2,1,0.56) 42%, rgba(4,2,1,0.18) 58%, transparent 70%)",
        }}
      />
    </div>
  );
}
