import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: expiredCount, error } = await admin.rpc("expire_pending_orders");
  if (error) {
    console.error("Pending order expiry failed", error);
    return NextResponse.json({ error: "Pending order expiry failed" }, { status: 500 });
  }
  return NextResponse.json({ expired: expiredCount ?? 0 });
}
