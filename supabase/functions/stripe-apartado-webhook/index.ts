import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.19.0?target=deno";

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

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const motoId = session.metadata?.moto_id;
    const buyerId = session.metadata?.buyer_id || session.client_reference_id;

    if (!motoId || !buyerId) {
      console.warn("Missing moto_id or buyer_id in checkout session metadata");
      return new Response(JSON.stringify({ received: true, warning: "Missing metadata" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // Idempotencia: Verificar si el apartado ya fue registrado para este pago
      const { data: existingApartado } = await supabaseAdmin
        .from("apartados")
        .select("id, nod, status")
        .eq("payment_reference", session.id)
        .maybeSingle();

      if (existingApartado) {
        return new Response(
          JSON.stringify({ received: true, message: "Apartado already processed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Obtener datos de la moto y taller de certificación existente si lo hay
      const { data: moto } = await supabaseAdmin
        .from("motos")
        .select("id, brand, model, owner_id")
        .eq("id", motoId)
        .single();

      const { data: cert } = await supabaseAdmin
        .from("moto_certifications")
        .select("*")
        .eq("moto_id", motoId)
        .maybeSingle();

      const appointmentFields: Record<string, any> = {};
      if (cert?.is_certified || cert?.status === "APROBADA") {
        appointmentFields.certification_status = cert.status || "APROBADA";
        appointmentFields.certification_appointment_status = "COMPLETADA";
        if (cert.appointment_at) appointmentFields.certification_appointment_at = cert.appointment_at;
        if (cert.workshop) appointmentFields.certification_workshop = cert.workshop;
        if (cert.workshop_id) appointmentFields.certification_workshop_id = cert.workshop_id;
      }

      const paidAt = new Date().toISOString();

      // Inserción del apartado (el NOD se asigna automáticamente por el trigger/secuencia de Supabase)
      const { data: apartado, error: apartadoError } = await supabaseAdmin
        .from("apartados")
        .insert([
          {
            buyer_id: buyerId,
            moto_id: motoId,
            amount: 600,
            status: "REALIZADO",
            payment_status: "PAID",
            payment_mode: "STRIPE",
            payment_reference: session.id,
            paid_at: paidAt,
            ...appointmentFields,
          },
        ])
        .select("*, moto:motos(*)")
        .single();

      if (apartadoError) {
        console.error("Error creating apartado:", apartadoError);
        return new Response(JSON.stringify({ error: apartadoError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Actualizar estado de la moto a APARTADA
      const { error: motoUpdateError } = await supabaseAdmin
        .from("motos")
        .update({
          status: "APARTADA",
          is_apartada: true,
          updated_at: paidAt,
        })
        .eq("id", motoId);

      if (motoUpdateError) {
        console.error("Error updating moto status to APARTADA:", motoUpdateError);
      }

      // Notificar al vendedor de la moto
      if (moto?.owner_id) {
        const motoTitle = `${moto.brand || ""} ${moto.model || ""}`.trim() || "tu motocicleta";
        try {
          await supabaseAdmin.from("notifications").insert([
            {
              recipient_id: moto.owner_id,
              type: "APARTADO_RECIBIDO",
              title: "¡Apartado recibido!",
              body: `Se ha registrado un apartado para ${motoTitle}. Es momento de agendar la inspección técnica en un taller certificado.`,
              moto_id: String(motoId),
              apartado_id: String(apartado.id),
            },
          ]);
        } catch (notifErr) {
          console.warn("Could not insert seller notification:", notifErr);
        }
      }
    } catch (procError: any) {
      console.error("Error processing checkout session:", procError);
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
