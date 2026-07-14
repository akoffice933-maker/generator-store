import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProducts } from "@/lib/products";
import { getCurrentPricingTier } from "@/lib/pricing";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(["gasoline", "diesel", "gas", "inverter"]).optional(),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  minPower: z.coerce.number().finite().min(0).max(10_000).optional(),
  maxPower: z.coerce.number().finite().min(0).max(10_000).optional(),
  phases: z.coerce.number().int().min(1).max(3).optional(),
  inStock: z.enum(["0", "1"]).optional(),
  sort: z.enum(["price_asc", "price_desc", "power", "popular"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
}).refine((data) => data.minPower === undefined || data.maxPower === undefined || data.minPower <= data.maxPower, {
  message: "minPower must not exceed maxPower",
  path: ["minPower"],
});

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные параметры каталога" }, { status: 400 });
  }

  const pricingTier = await getCurrentPricingTier();
  const result = await getProducts(
    {
      search: parsed.data.search || undefined,
      type: parsed.data.type,
      brandSlug: parsed.data.brand || undefined,
      categorySlug: parsed.data.category || undefined,
      minPower: parsed.data.minPower,
      maxPower: parsed.data.maxPower,
      phases: parsed.data.phases,
      inStockOnly: parsed.data.inStock === "1",
      sort: parsed.data.sort,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    },
    pricingTier
  );
  return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
}
