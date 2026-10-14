import { listProperties, toPropertySummary } from "@/lib/property";
import { json } from "../_helpers";

export async function GET() {
  return json({ properties: listProperties().map(toPropertySummary) });
}
