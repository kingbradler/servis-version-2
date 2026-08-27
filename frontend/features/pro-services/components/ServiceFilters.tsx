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
import type { PublicServiceFilters } from "../types/service.types";

const ORDERING_OPTIONS = [
  { value: "-created_at", label: "Plus récents" },
  { value: "price", label: "Prix croissant" },
  { value: "-price", label: "Prix décroissant" },
  { value: "name", label: "Nom A→Z" },
  { value: "-name", label: "Nom Z→A" },
];

const PRICE_TYPE_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "FIXED", label: "Prix fixe" },
  { value: "FROM", label: "À partir de" },
  { value: "QUOTE", label: "Sur devis" },
];

export interface ServiceFiltersPanelProps {
  filters: PublicServiceFilters;
  categories: Category[];
  cities: City[];
  onChange: (next: PublicServiceFilters) => void;
  onReset: () => void;
}

function flattenCategoryOptions(categories: Category[]) {
  const options: { value: string; label: string }[] = [];
  for (const root of categories) {
    if (root.children?.length) {
      for (const child of root.children) {
        options.push({
          value: child.slug,
          label: `${root.name} · ${child.name}`,
        });
      }
    } else {
      options.push({ value: root.slug, label: root.name });
    }
  }
  return options;
}

function FiltersFields({
  filters,
  categories,
  cities,
  onChange,
}: Omit<ServiceFiltersPanelProps, "onReset">) {
  const set = (patch: Partial<PublicServiceFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  return (
    <div className="space-y-4">
      <Select
        label="Catégorie"
        value={filters.category ?? ""}
        onChange={(e) => set({ category: e.target.value || undefined })}
        options={[
          { value: "", label: "Toutes" },
          ...flattenCategoryOptions(categories),
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

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Prix min"
          type="number"
          min={0}
          inputMode="decimal"
          value={filters.min_price ?? ""}
          onChange={(e) => set({ min_price: e.target.value || undefined })}
          placeholder="0"
        />
        <Input
          label="Prix max"
          type="number"
          min={0}
          inputMode="decimal"
          value={filters.max_price ?? ""}
          onChange={(e) => set({ max_price: e.target.value || undefined })}
          placeholder="—"
        />
      </div>

      <Select
        label="Type de prix"
        value={filters.price_type ?? ""}
        onChange={(e) =>
          set({
            price_type: (e.target.value || undefined) as
              | PublicServiceFilters["price_type"]
              | undefined,
          })
        }
        options={PRICE_TYPE_OPTIONS}
      />

      <Select
        label="Tri"
        value={filters.ordering ?? "-created_at"}
        onChange={(e) => set({ ordering: e.target.value || undefined })}
        options={ORDERING_OPTIONS}
      />

      <Checkbox
        label="Services mis en avant uniquement"
        checked={Boolean(filters.featured)}
        onCheckedChange={(checked) =>
          set({ featured: checked === true ? true : undefined })
        }
      />
    </div>
  );
}

export function ServiceFiltersPanel(props: ServiceFiltersPanelProps) {
  const { onReset, ...rest } = props;

  return (
    <>
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
