"use client";

const ANNOUNCEMENTS = [
  "Marketplace locale — produits & services près de chez vous",
  "Professionnels et boutiques près de chez vous",
  "Explorez la carte · trouvez ce qu'il vous faut",
  "Paiements manuels sécurisés entre acheteurs et vendeurs",
  "Ouvrez votre boutique ou publiez vos services sur SERVIS",
];

export function AnnouncementBanner() {
  const items = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];
  return (
    <div className="relative flex h-9 items-center overflow-hidden border-b border-white/5 bg-dk2">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-14 bg-gradient-to-r from-dk2 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-14 bg-gradient-to-l from-dk2 to-transparent" />
      <div className="flex animate-[ann-scroll_30s_linear_infinite] whitespace-nowrap hover:[animation-play-state:paused] motion-reduce:animate-none">
        {items.map((text, i) => (
          <span
            key={`${text}-${i}`}
            className="inline-flex items-center gap-2 px-7 text-[12.5px] text-white/60"
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary" />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
