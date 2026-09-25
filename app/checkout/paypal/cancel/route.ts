import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  return NextResponse.redirect(new URL(`/account?payment=cancelled${orderId ? `&order=${encodeURIComponent(orderId)}` : ""}`, url.origin));
}
