import { apiFetch } from "@/lib/api/client";

export interface HeroSlide {
  id: string;
  title: string;
  highlight: string;
  subtitle: string;
  image: string;
  cta_href: string;
  cta_label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPublicHeroSlides(): Promise<HeroSlide[]> {
  return apiFetch("/hero-slides/");
}

export async function getAdminHeroSlides(): Promise<HeroSlide[]> {
  return apiFetch("/admin/hero-slides/");
}

export async function createHeroSlide(form: FormData): Promise<HeroSlide> {
  return apiFetch("/admin/hero-slides/", {
    method: "POST",
    body: form,
  });
}

export async function updateHeroSlide(
  id: string,
  form: FormData
): Promise<HeroSlide> {
  return apiFetch(`/admin/hero-slides/${id}/`, {
    method: "PATCH",
    body: form,
  });
}

export async function deleteHeroSlide(id: string): Promise<void> {
  await apiFetch(`/admin/hero-slides/${id}/`, {
    method: "DELETE",
  });
}
