import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalAmount, paypalCurrency, verifyPaypalWebhook } from "@/lib/paypal";

type PaypalEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: { currency_code?: string; value?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
    purchase_units?: { reference_id?: string; payments?: { captures?: { id?: string; status?: string; amount?: { currency_code?: string; value?: string } }[] } }[];
    links?: { rel?: string; href?: string }[];
  };
};

function orderIdFromEvent(event: PaypalEvent) {
  const resource = event.resource;
  return resource?.supplementary_data?.related_ids?.order_id
    ?? resource?.purchase_units?.find((unit) => unit.reference_id)?.reference_id
    ?? null;
}

function captureIdFromEvent(event: PaypalEvent) {
  return event.resource?.purchase_units?.flatMap((unit) => unit.payments?.captures ?? []).find((capture) => capture.status === "COMPLETED")?.id
    ?? (event.event_type?.startsWith("PAYMENT.CAPTURE.") ? event.resource?.id : null)
    ?? null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: PaypalEvent;
  try {
    event = JSON.parse(rawBody) as PaypalEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const headers = {
    transmissionId: request.headers.get("paypal-transmission-id"),
    transmissionTime: request.headers.get("paypal-transmission-time"),
    transmissionSig: request.headers.get("paypal-transmission-sig"),
    certUrl: request.headers.get("paypal-cert-url"),
    authAlgo: request.headers.get("paypal-auth-algo"),
  };
  if (!event.id || !event.event_type || Object.values(headers).some((value) => !value)) {
    return NextResponse.json({ error: "Missing PayPal event or signature headers" }, { status: 400 });
  }

  try {
    const verification = await verifyPaypalWebhook({
      transmissionId: headers.transmissionId!,
      transmissionTime: headers.transmissionTime!,
      transmissionSig: headers.transmissionSig!,
      certUrl: headers.certUrl!,
      authAlgo: headers.authAlgo!,
      webhookEvent: event,
    });
    if (verification.verification_status !== "SUCCESS") return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  } catch (error) {
    console.error("PayPal webhook verification failed", error);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin.rpc("claim_webhook_event", { provider_input: "paypal", provider_event_id_input: event.id, event_type_input: event.event_type, payload_input: event });
  if (claimError) {
    console.error("PayPal webhook claim failed", claimError);
    return NextResponse.json({ error: "Could not record webhook event" }, { status: 500 });
  }
  if (!claimed) return NextResponse.json({ received: true, duplicate: true });

  try {
    const handledEvent = ["CHECKOUT.ORDER.COMPLETED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED", "CHECKOUT.ORDER.VOIDED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED", "PAYMENT.CAPTURE.PENDING"].includes(event.event_type);
    if (!handledEvent) {
      const { error } = await admin.rpc("complete_webhook_event", { provider_input: "paypal", provider_event_id_input: event.id });
      if (error) throw error;
      return NextResponse.json({ received: true, ignored: true });
    }
    if (event.event_type === "CHECKOUT.ORDER.COMPLETED") {
      const { error } = await admin.rpc("complete_webhook_event", { provider_input: "paypal", provider_event_id_input: event.id });
      if (error) throw error;
      return NextResponse.json({ received: true, awaiting_capture: true });
    }
    const orderId = orderIdFromEvent(event);
    if (!orderId) throw new Error("PayPal event did not include an order reference.");
    const captureId = captureIdFromEvent(event);
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const captureAmount = event.resource?.amount ?? event.resource?.purchase_units?.flatMap((unit) => unit.payments?.captures ?? []).find((capture) => capture.status === "COMPLETED")?.amount;
      const { data: order, error: orderError } = await admin.from("orders").select("total").eq("id", orderId).maybeSingle();
      if (orderError) throw orderError;
      if (!order || captureAmount?.currency_code !== paypalCurrency() || captureAmount.value !== paypalAmount(Number(order.total))) {
        throw new Error("PayPal capture amount did not match the order total.");
      }
      if (!captureId) throw new Error("Completed PayPal event did not include a capture ID.");
      const { error } = await admin.rpc("mark_order_paid", { target_order_id: orderId, capture_id: captureId });
      if (error) throw error;
    } else if (["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"].includes(event.event_type)) {
      const { error } = await admin.rpc("mark_order_refunded", { target_order_id: orderId, capture_id: captureId });
      if (error) throw error;
    } else if (["CHECKOUT.ORDER.VOIDED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED"].includes(event.event_type)) {
      const { error } = await admin.rpc("set_order_payment_status", { target_order_id: orderId, target_status: event.event_type === "CHECKOUT.ORDER.VOIDED" ? "expired" : "failed" });
      if (error) throw error;
    } else if (event.event_type === "PAYMENT.CAPTURE.PENDING") {
      const { error } = await admin.rpc("set_order_payment_status", { target_order_id: orderId, target_status: "pending" });
      if (error) throw error;
    }
    const { error: completeError } = await admin.rpc("complete_webhook_event", { provider_input: "paypal", provider_event_id_input: event.id });
    if (completeError) throw completeError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook processing failed", error);
    await admin.rpc("fail_webhook_event", { provider_input: "paypal", provider_event_id_input: event.id, error_input: error instanceof Error ? error.message : "Unknown webhook processing error" });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
