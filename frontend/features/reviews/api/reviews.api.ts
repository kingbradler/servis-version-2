import { apiFetch } from "@/lib/api/client";

export interface ReviewAuthor {
  id: string;
  first_name: string;
  last_name: string;
}

export interface ReviewProfessionalBrief {
  id: string;
  display_name: string;
  slug: string;
}

export interface Review {
  id: string;
  author: ReviewAuthor;
  professional: ReviewProfessionalBrief;
  service_request_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewSummary {
  professional_id: string;
  slug: string;
  average_rating: number | null;
  ratings_count: number;
}

export interface EligibleReviewRequest {
  id: string;
  professional: ReviewProfessionalBrief;
  service_name: string;
  completed_at: string;
}

export interface ProductReviewProductBrief {
  id: string;
  name: string;
  slug: string;
  store_slug: string;
}

export interface ProductReview {
  id: string;
  author: ReviewAuthor;
  product: ProductReviewProductBrief;
  order_item_id: string;
  product_name_snapshot: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ProductReviewSummary {
  product_id: string;
  store_slug: string;
  product_slug: string;
  average_rating: number | null;
  ratings_count: number;
}

export interface EligibleProductReviewItem {
  id: string;
  product_name: string;
  store_name: string;
  store_slug: string;
  product_slug: string | null;
  order_id: string;
  completed_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function asList<T>(data: Paginated<T> | T[] | unknown): T[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Paginated<T>).results)
  ) {
    return (data as Paginated<T>).results;
  }
  return [];
}

export interface CreateReviewPayload {
  service_request_id: string;
  rating: number;
  comment?: string;
}

export interface CreateProductReviewPayload {
  order_item_id: string;
  rating: number;
  comment?: string;
}

export async function getProfessionalReviewSummary(
  slug: string
): Promise<ReviewSummary> {
  return apiFetch<ReviewSummary>(`/reviews/professionals/${slug}/summary/`);
}

export async function listProfessionalReviews(
  slug: string,
  page = 1
): Promise<Paginated<Review>> {
  return apiFetch<Paginated<Review>>(
    `/reviews/professionals/${slug}/?page=${page}`
  );
}

export async function listEligibleReviewRequests(): Promise<
  Paginated<EligibleReviewRequest>
> {
  const data = await apiFetch<Paginated<EligibleReviewRequest> | EligibleReviewRequest[]>(
    `/reviews/eligible/`
  );
  if (data && typeof data === "object" && "results" in data) {
    return data;
  }
  const results = asList<EligibleReviewRequest>(data);
  return { count: results.length, next: null, previous: null, results };
}

export async function createReview(
  payload: CreateReviewPayload
): Promise<Review> {
  return apiFetch<Review>("/reviews/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMyReviews(): Promise<Paginated<Review>> {
  const data = await apiFetch<Paginated<Review> | Review[]>(`/reviews/me/`);
  if (data && typeof data === "object" && "results" in data) {
    return data;
  }
  const results = asList<Review>(data);
  return { count: results.length, next: null, previous: null, results };
}

export async function getProductReviewSummary(
  storeSlug: string,
  productSlug: string
): Promise<ProductReviewSummary> {
  return apiFetch<ProductReviewSummary>(
    `/reviews/products/${storeSlug}/${productSlug}/summary/`
  );
}

export async function listProductReviews(
  storeSlug: string,
  productSlug: string,
  page = 1
): Promise<Paginated<ProductReview>> {
  return apiFetch<Paginated<ProductReview>>(
    `/reviews/products/${storeSlug}/${productSlug}/?page=${page}`
  );
}

export async function listEligibleProductReviewItems(): Promise<
  Paginated<EligibleProductReviewItem>
> {
  const data = await apiFetch<
    Paginated<EligibleProductReviewItem> | EligibleProductReviewItem[]
  >(`/reviews/products/eligible/`);
  if (data && typeof data === "object" && "results" in data) {
    return data;
  }
  const results = asList<EligibleProductReviewItem>(data);
  return { count: results.length, next: null, previous: null, results };
}

export async function createProductReview(
  payload: CreateProductReviewPayload
): Promise<ProductReview> {
  return apiFetch<ProductReview>("/reviews/products/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMyProductReviews(): Promise<Paginated<ProductReview>> {
  const data = await apiFetch<Paginated<ProductReview> | ProductReview[]>(
    "/reviews/products/me/"
  );
  if (data && typeof data === "object" && "results" in data) {
    return data;
  }
  const results = asList<ProductReview>(data);
  return { count: results.length, next: null, previous: null, results };
}
