import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const result = await getProducts({
    search: sp.get("search") || undefined,
    type: sp.get("type") || undefined,
    brandSlug: sp.get("brand") || undefined,
    categorySlug: sp.get("category") || undefined,
    minPower: sp.get("minPower") ? Number(sp.get("minPower")) : undefined,
    maxPower: sp.get("maxPower") ? Number(sp.get("maxPower")) : undefined,
    phases: sp.get("phases") ? Number(sp.get("phases")) : undefined,
    inStockOnly: sp.get("inStock") === "1",
    sort: sp.get("sort") || undefined,
    page: sp.get("page") ? Number(sp.get("page")) : undefined,
    pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : undefined,
  });
  return NextResponse.json(result);
}
