"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Package, Store, UserPlus } from "lucide-react";
import { Reveal } from "@/components/brand/Reveal";
import { MarketplaceShell } from "@/components/layout/marketplace-shell";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/ui/category-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { StoreCard } from "@/components/ui/store-card";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { HomeHero } from "@/features/marketplace/components/HomeHero";
import {
  OrderedSection,
  OrderedSectionHeader,
} from "@/features/marketplace/components/OrderedSection";
import { ProductGrid } from "@/features/products/components/ProductGrid";
import { usePublicProducts } from "@/features/products/hooks/usePublicProducts";
import { ServiceCard } from "@/features/pro-services/components/ServiceCard";
import { usePublicServices } from "@/features/pro-services/hooks/usePublicServices";
import { usePublicStores } from "@/features/stores/hooks/usePublicStores";
import { resolveMediaUrl } from "@/features/products/utils/media";
import { resolveCategoryIcon } from "@/lib/marketplace/category-icons";
export function HomePage() {
  const router = useRouter();
  const {
    categories,
    loading: catLoading,
    error: catError,
    refresh: refreshCats,
  } = useCategories();
  const {
    products,
    loading: prodLoading,
    error: prodError,
    refresh: refreshProds,
  } = usePublicProducts({
    featured: true,
    ordering: "-created_at",
    page_size: 8,
  });
  const { products: recentProducts, loading: recentLoading } =
    usePublicProducts({
      ordering: "-created_at",
      page_size: 8,
    });
  const {
    stores,
    loading: storesLoading,
    error: storesError,
    refresh: refreshStores,
  } = usePublicStores();
  const {
    services,
    loading: servicesLoading,
    error: servicesError,
    refresh: refreshServices,
  } = usePublicServices({
    ordering: "-created_at",
    page_size: 6,
  });
  const popular = products.length > 0 ? products : recentProducts;
  const popularLoading =
    products.length > 0 ? prodLoading : prodLoading || recentLoading;
  return (
    <MarketplaceShell>
      <HomeHero />
      <section className="border-b border-border bg-surface dark:bg-background">
        <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 sm:py-12 lg:px-12">
          <div>
            <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">
              1. Compte
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-heading-s text-text-primary">
              <UserPlus className="h-4 w-4 shrink-0 text-primary" />
              Inscrivez-vous
            </h2>
            <p className="mt-1.5 text-body-sm text-text-secondary">
              Gratuit, en quelques minutes. Achetez ou vendez, partout au Maroc.
            </p>
          </div>
          <div>
            <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">
              2. Boutique
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-heading-s text-text-primary">
              <Store className="h-4 w-4 shrink-0 text-primary" />
              Publiez vos offres
            </h2>
            <p className="mt-1.5 text-body-sm text-text-secondary">
              Produits ou services, avec paiement Orange Money, Inwi Money ou
              virement.
            </p>
          </div>
          <div>
            <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">
              3. Commandes
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-heading-s text-text-primary">
              <Package className="h-4 w-4 shrink-0 text-primary" />
              Échangez près de chez vous
            </h2>
            <p className="mt-1.5 text-body-sm text-text-secondary">
              Le panier est lié à votre compte pour payer le vendeur en toute
              clarté.
            </p>
          </div>
        </div>
      </section>
      <OrderedSection className="bg-cr dark:bg-background">
        <Reveal>
          <OrderedSectionHeader
            index="01 — Catégories"
            title="Explorer par catégorie"
            description="Parcourez les rayons de la marketplace."
            href="/categories"
            linkLabel="Tout voir"
          />
        </Reveal>
        {catLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {!catLoading && catError && (
          <ErrorState message={catError} onRetry={() => void refreshCats()} />
        )}
        {!catLoading && !catError && categories.length === 0 && (
          <EmptyState
            title="Aucune catégorie"
            description="Les catégories apparaîtront bientôt."
          />
        )}
        {!catLoading && !catError && categories.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat, i) => (
              <Reveal key={cat.id} delayMs={Math.min(i * 40, 200)}>
                <CategoryCard
                  name={cat.name}
                  slug={cat.slug}
                  icon={resolveCategoryIcon(cat.icon)}
                  href={`/products?category=${cat.slug}`}
                />
              </Reveal>
            ))}
          </div>
        )}
      </OrderedSection>
      <OrderedSection className="bg-dk text-white">
        <Reveal>
          <OrderedSectionHeader
            index="02 — Produits"
            title="Produits populaires"
            description="Sélection mise en avant par les boutiques SERVIS."
            href="/products"
            linkLabel="Tous les produits"
            tone="dark"
          />
        </Reveal>
        {popularLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {!popularLoading && prodError && products.length === 0 && (
          <ErrorState
            message={prodError}
            onRetry={() => void refreshProds()}
          />
        )}
        {!popularLoading && !prodError && popular.length === 0 && (
          <EmptyState
            tone="onDark"
            title="Les premières offres arrivent"
            description="SERVIS est ouvert : ouvrez votre boutique et soyez parmi les premiers à vendre près de chez vous."
            actionLabel="Vendre sur SERVIS"
            onAction={() => router.push("/register")}
          />
        )}
        {!popularLoading && popular.length > 0 && (
          <div className="[&_.text-text-primary]:text-white [&_.text-text-secondary]:text-white/60 [&_.text-text-muted]:text-white/45 [&_.border-border]:border-white/10 [&_.bg-surface]:bg-white/5 [&_.bg-surface-secondary]:bg-white/8">
            <ProductGrid products={popular} />
          </div>
        )}
      </OrderedSection>
      <OrderedSection className="bg-cr dark:bg-background">
        <Reveal>
          <OrderedSectionHeader
            index="03 — Boutiques"
            title="Boutiques à découvrir"
            description="Rencontrez les entrepreneurs de votre ville."
            href="/stores"
            linkLabel="Toutes"
          />
        </Reveal>
        {storesLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {!storesLoading && storesError && (
          <ErrorState
            message={storesError}
            onRetry={() => void refreshStores()}
          />
        )}
        {!storesLoading && !storesError && stores.length === 0 && (
          <EmptyState
            title="Pas encore de boutique en ligne"
            description="Créez la vôtre : produits, commandes et paiements manuels, partout au Maroc."
            actionLabel="Ouvrir une boutique"
            onAction={() => router.push("/register")}
          />
        )}
        {!storesLoading && !storesError && stores.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.slice(0, 6).map((store, i) => (
              <Reveal key={store.id} delayMs={Math.min(i * 50, 200)}>
                <StoreCard
                  name={store.name}
                  slug={store.slug}
                  description={store.description}
                  city={store.city?.name}
                  logoUrl={resolveMediaUrl(store.logo)}
                  bannerUrl={resolveMediaUrl(store.banner)}
                />
              </Reveal>
            ))}
          </div>
        )}
      </OrderedSection>
      <OrderedSection className="bg-surface dark:bg-background">
        <Reveal>
          <OrderedSectionHeader
            index="04 — Services"
            title="Services près de chez vous"
            description="Cours, réparations, beauté — des prestataires locaux."
            href="/services"
            linkLabel="Tous les services"
          />
        </Reveal>
        {servicesLoading && (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}
        {!servicesLoading && servicesError && (
          <ErrorState
            message={servicesError}
            onRetry={() => void refreshServices()}
          />
        )}
        {!servicesLoading && !servicesError && services.length === 0 && (
          <EmptyState
            title="Pas encore de services publiés"
            description="Proposez vos compétences aux étudiants et habitants près de chez vous."
            actionLabel="Proposer un service"
            onAction={() => router.push("/register")}
          />
        )}
        {!servicesLoading && !servicesError && services.length > 0 && (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {services.slice(0, 6).map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        )}
      </OrderedSection>
      <section className="relative overflow-hidden bg-primary">
        <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-8 px-4 py-16 sm:flex-row sm:items-center sm:px-6 sm:py-20 lg:px-12">
          <Reveal>
            <div>
              <p className="font-display text-[11px] font-extrabold uppercase tracking-[0.28em] text-white/70">
                05 — Rejoindre
              </p>
              <h2 className="font-display mt-2 text-[clamp(1.75rem,3.5vw,2.75rem)] font-extrabold tracking-tight text-white">
                Vendez sur SERVIS
              </h2>
              <p className="mt-3 max-w-lg text-body text-white/85">
                Ouvrez votre boutique étudiante ou publiez vos services —
                rejoignez la marketplace locale.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <Button
              asChild
              size="lg"
              className="rounded-none bg-dk text-white uppercase tracking-wide hover:bg-dk2"
            >
              <Link href="/register">
                <Store className="h-4 w-4" />
                Devenir professionnel
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </MarketplaceShell>
  );
}
