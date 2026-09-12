import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const cryptoProvider = Stripe.createSubtleCryptoProvider();
  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response("Bad signature", { status: 400 });
  }

  // Solo procesar payment_intent.succeeded
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // Validación de monto ($600.00 MXN = 60000 centavos) y divisa MXN
    if (
      paymentIntent.amount_received !== 60000 ||
      paymentIntent.currency?.toLowerCase() !== "mxn"
    ) {
      console.warn(
        `PaymentIntent ignored: amount_received ${paymentIntent.amount_received} or currency ${paymentIntent.currency} does not match 60000 mxn`
      );
      return new Response(
        JSON.stringify({ received: true, ignored: true, reason: "Amount or currency mismatch" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const metadata = paymentIntent.metadata || {};

    // Validación de operation_type = APARTADO
    if (metadata.operation_type !== "APARTADO") {
      console.warn(
        `PaymentIntent ignored: operation_type is '${metadata.operation_type}', expected 'APARTADO'`
      );
      return new Response(
        JSON.stringify({ received: true, ignored: true, reason: "Invalid operation_type" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const motoId = metadata.moto_id;
    const buyerId = metadata.buyer_id;

    if (!motoId || !buyerId) {
      console.warn("Missing moto_id or buyer_id in PaymentIntent metadata");
      return new Response(
        JSON.stringify({ received: true, warning: "Missing moto_id or buyer_id" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Idempotencia por payment_reference
      const { data: existingApartado } = await supabaseAdmin
        .from("apartados")
        .select("id, nod, status")
        .eq("payment_reference", paymentIntent.id)
        .maybeSingle();

      if (existingApartado) {
        return new Response(
          JSON.stringify({ received: true, message: "Apartado already processed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // paid_at extraído de paymentIntent.created (timestamp UNIX en segundos)
      const paidAt = new Date(paymentIntent.created * 1000).toISOString();

      // Inserción del apartado en Supabase con amount=600, payment_status=PAID, payment_mode=STRIPE, payment_reference y paid_at
      // El NOD y la actualización del estado de la moto quedan a cargo de Supabase y sus triggers
      const { error: apartadoError } = await supabaseAdmin
        .from("apartados")
        .insert([
          {
            buyer_id: buyerId,
            moto_id: motoId,
            amount: 600,
            status: "REALIZADO",
            payment_status: "PAID",
            payment_mode: "STRIPE",
            payment_reference: paymentIntent.id,
            paid_at: paidAt,
          },
        ]);

      if (apartadoError) {
        console.error("Error creating apartado:", apartadoError);
        return new Response(JSON.stringify({ error: apartadoError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (procError: any) {
      console.error("Error processing payment_intent:", procError);
      return new Response(
        JSON.stringify({ error: procError.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
