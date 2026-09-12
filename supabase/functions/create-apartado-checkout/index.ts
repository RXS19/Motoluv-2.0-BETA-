import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@22";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { moto_id } = body;
    if (!moto_id) {
      return new Response(JSON.stringify({ error: "moto_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: moto, error: motoError } = await supabaseAdmin
      .from("motos")
      .select("id, brand, model, year, price, owner_id, status, is_apartada")
      .eq("id", moto_id)
      .single();

    if (motoError || !moto) {
      return new Response(JSON.stringify({ error: "Motorcycle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (moto.owner_id && String(moto.owner_id) === String(user.id)) {
      return new Response(
        JSON.stringify({ error: "You cannot apart your own motorcycle" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar límite máximo de 2 apartados activos por comprador
    const { count: activeApartadosCount } = await supabaseAdmin
      .from("apartados")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", user.id)
      .eq("status", "REALIZADO");

    if (activeApartadosCount !== null && activeApartadosCount >= 2) {
      return new Response(
        JSON.stringify({ error: "Maximum active apartados reached" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Idempotencia / Validar si la moto ya está apartada o tiene apartado activo
    const { data: activeApartado } = await supabaseAdmin
      .from("apartados")
      .select("id")
      .eq("moto_id", moto_id)
      .eq("status", "REALIZADO")
      .maybeSingle();

    if (activeApartado || moto.is_apartada || (moto.status && moto.status.toUpperCase() === "APARTADA")) {
      return new Response(
        JSON.stringify({ error: "Motorcycle is already apartada" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const motoluvUrl =
      Deno.env.get("MOTOLUV_URL") ||
      req.headers.get("origin") ||
      "https://www.motoluv.mx";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            unit_amount: 60000,
            product_data: {
              name: `Apartado: ${moto.brand} ${moto.model}`,
              description: `Apartado y reserva de compra para ${moto.brand} ${moto.model} ${moto.year || ""}`.trim(),
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          operation_type: "APARTADO",
          moto_id: String(moto.id),
          buyer_id: String(user.id),
        },
      },
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        operation_type: "APARTADO",
        moto_id: String(moto.id),
        buyer_id: String(user.id),
      },
      success_url: `${motoluvUrl}/motos/${moto.id}?session_id={CHECKOUT_SESSION_ID}&apartado=success`,
      cancel_url: `${motoluvUrl}/motos/${moto.id}`,
    });

    return new Response(
      JSON.stringify({
        session_id: session.id,
        checkout_url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating apartado checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
