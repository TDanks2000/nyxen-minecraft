export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #160902 0%, #3d1607 15%, #6e2c0e 32%, #8a3a12 45%, #6b2b0a 58%, #2e1306 78%, #0e0503 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 100px at 68% 30%, rgba(255,190,50,0.3), transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 42% at 68% 28%, rgba(210,100,20,0.58), transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 38% 48% at 84% 42%, rgba(110,30,120,0.32), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 28% at 60% 65%, rgba(140,60,10,0.28), transparent 70%)",
        }}
      />
      <div
        className="absolute right-0 bottom-0 h-2/3 w-3/4"
        style={{
          background: "rgba(8,4,2,0.82)",
          clipPath:
            "polygon(100% 100%, 0% 100%, 0% 88%, 4% 68%, 8% 80%, 11% 52%, 14% 65%, 17% 38%, 19% 55%, 22% 28%, 24% 42%, 26% 35%, 28% 44%, 30% 22%, 32% 38%, 34% 32%, 36% 42%, 39% 18%, 41% 36%, 44% 24%, 47% 40%, 50% 14%, 53% 36%, 56% 45%, 58% 28%, 61% 42%, 64% 16%, 67% 34%, 70% 48%, 73% 22%, 76% 38%, 79% 26%, 82% 44%, 85% 30%, 88% 46%, 91% 34%, 94% 50%, 97% 38%, 100% 44%)",
        }}
      />
      <div
        className="absolute right-0 bottom-0 left-0 h-1/3"
        style={{
          background: "linear-gradient(0deg, rgba(6,3,1,0.88) 0%, transparent)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,1) 3px, rgba(0,0,0,1) 4px)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(4,2,1,0.97) 0%, rgba(4,2,1,0.84) 26%, rgba(4,2,1,0.46) 48%, rgba(4,2,1,0.14) 64%, transparent 74%)",
        }}
      />
    </div>
  );
}
