import { getProperty, toPropertySummary } from "@/lib/property";
export const PROPERTY = getProperty("casa-pacifica")!;
export const FALLBACK_PROPERTIES = [toPropertySummary(PROPERTY)];
export const CASA_PACIFICA_ID = PROPERTY.id;
