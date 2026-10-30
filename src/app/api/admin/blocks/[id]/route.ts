import type { NextRequest } from "next/server";
import { getAdapter } from "@/lib/db";
import { json, notFound, requireAdmin } from "../../../_helpers";

/** DELETE /api/admin/blocks/[id] — remove a manual blocked range (admin). */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const deleted = await getAdapter().deleteBlock(id);
  if (!deleted) return notFound("Block not found.");
  return json({ ok: true, id });
}
