import { getProperty } from "@/lib/property";
import { json, notFound } from "../../_helpers";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const property = getProperty(slug);
  if (!property) return notFound("Property not found.");
  return json({ property });
}
