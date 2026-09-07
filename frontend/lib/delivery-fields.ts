/** Delivery form helpers — phone keyboards often use Arabic-Indic digits. */

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC = "۰۱۲۳۴۵۶۷۸۹";

export function phoneDigits(value: string): string {
  const mapped = (value || "")
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN_ARABIC.indexOf(d)));
  return mapped.replace(/\D/g, "");
}

/** If the street line is empty, the city is enough to start a delivery. */
export function resolveDeliveryAddress(address: string, city: string): string {
  const street = address.trim();
  const town = city.trim();
  if (street.length >= 3) return street;
  if (town.length >= 2) return town;
  return street;
}
