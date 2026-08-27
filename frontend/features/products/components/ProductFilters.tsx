"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { Category } from "@/features/categories/types/category.types";
import type { City } from "@/features/cities/types/city.types";
import type { StorePublic } from "@/features/stores/types/store.types";
import type { PublicProductFilters } from "../types/product.types";

const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Plus récents" },
  { value: "price", label: "Prix croissant" },
  { value: "-price", label: "Prix décroissant" },
  { value: "name", label: "Nom A→Z" },
  { value: "-name", label: "Nom Z→A" },
];

export interface ProductFiltersPanelProps {
  filters: PublicProductFilters;
  categories: Category[];
  cities: City[];
  stores: StorePublic[];
  onChange: (next: PublicProductFilters) => void;
  onReset: () => void;
}

function FiltersFields({
  filters,
  categories,
  cities,
  stores,
  onChange,
}: Omit<ProductFiltersPanelProps, "onReset">) {
  const set = (patch: Partial<PublicProductFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  return (
    <div className="space-y-4">
      <Select
        label="Catégorie"
        value={filters.category ?? ""}
        onChange={(e) =>
          set({ category: e.target.value || undefined })
        }
        options={[
          { value: "", label: "Toutes" },
          ...categories.map((c) => ({ value: c.slug, label: c.name })),
        ]}
      />

      <Select
        label="Ville"
        value={filters.city ?? ""}
        onChange={(e) => set({ city: e.target.value || undefined })}
        options={[
          { value: "", label: "Toutes" },
          ...cities.map((c) => ({ value: c.slug, label: c.name })),
        ]}
      />

      <Select
        label="Boutique"
        value={filters.store ?? ""}
        onChange={(e) => set({ store: e.target.value || undefined })}
        options={[
          { value: "", label: "Toutes" },
          ...stores.map((s) => ({ value: s.slug, label: s.name })),
        ]}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Prix min"
          type="number"
          min={0}
          inputMode="decimal"
          value={filters.min_price ?? ""}
          onChange={(e) =>
            set({ min_price: e.target.value || undefined })
          }
          placeholder="0"
        />
        <Input
          label="Prix max"
          type="number"
          min={0}
          inputMode="decimal"
          value={filters.max_price ?? ""}
          onChange={(e) =>
            set({ max_price: e.target.value || undefined })
          }
          placeholder="—"
        />
      </div>

      <Select
        label="Tri"
        value={filters.ordering ?? "-created_at"}
        onChange={(e) => set({ ordering: e.target.value || undefined })}
        options={ORDERING_OPTIONS}
      />

      <Checkbox
        label="Produits à la une uniquement"
        checked={Boolean(filters.featured)}
        onCheckedChange={(checked) =>
          set({ featured: checked === true ? true : undefined })
        }
      />
    </div>
  );
}

export function ProductFiltersPanel(props: ProductFiltersPanelProps) {
  const { onReset, ...rest } = props;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-[78px] space-y-4 rounded-[18px] border border-cr2 bg-white p-4 shadow-sm dark:border-border dark:bg-surface">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[16px] font-extrabold">Filtres</h2>
            <button
              type="button"
              onClick={onReset}
              className="text-caption font-medium text-primary hover:underline"
            >
              Réinitialiser
            </button>
          </div>
          <FiltersFields {...rest} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className="mb-4 lg:hidden">
        <Modal>
          <ModalTrigger asChild>
            <Button variant="outline" className="w-full rounded-xl sm:w-auto">
              <SlidersHorizontal className="h-4 w-4" />
              Filtres
            </Button>
          </ModalTrigger>
          <ModalContent size="md" className="max-h-[85vh] overflow-y-auto">
            <ModalHeader>
              <ModalTitle>Filtres</ModalTitle>
            </ModalHeader>
            <FiltersFields {...rest} />
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={onReset}
            >
              Réinitialiser
            </Button>
          </ModalContent>
        </Modal>
      </div>
    </>
  );
}
