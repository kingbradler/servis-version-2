export interface CategoryChild {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  scope?: "PRODUCT" | "SERVICE" | "BOTH";
  order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parent: string | null;
  parent_slug?: string | null;
  scope?: "PRODUCT" | "SERVICE" | "BOTH";
  order: number;
  children: CategoryChild[];
}
