import { SiteIntro } from "@/components/brand/SiteIntro";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AnnouncementBanner } from "@/features/marketplace/components/AnnouncementBanner";
import { cn } from "@/lib/utils";

export function MarketplaceShell({
  children,
  className,
  hideFooter = false,
  hideBanner = false,
  fillViewport = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Map / immersive pages */
  hideFooter?: boolean;
  hideBanner?: boolean;
  /** Lock shell to the viewport height (Explore map). */
  fillViewport?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-full min-w-0 flex-col overflow-x-clip bg-background text-text-primary",
        fillViewport && "h-dvh max-h-dvh overflow-hidden",
        className
      )}
    >
      <SiteIntro />
      {!hideBanner && <AnnouncementBanner />}
      <Navbar />
      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          fillViewport && "overflow-hidden"
        )}
      >
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
