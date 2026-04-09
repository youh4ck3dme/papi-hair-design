
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { stripe } from '../_shared/stripe.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { calculateTax } from '../_shared/tax.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pathname } = new URL(req.url)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // 1. Path routing
    if (pathname.endsWith('/create-intent')) {
      const { amount, currency = 'eur', country = 'SK' } = await req.json()
      
      // Apply Tax logic
      const taxResult = calculateTax(amount, country)
      
      const intent = await stripe.paymentIntents.create({
        amount: taxResult.total,
        currency,
        metadata: { 
            user_id: user.id,
            subtotal: taxResult.subtotal.toString(),
            tax: taxResult.tax.toString(),
            tax_rate: taxResult.rate.toString()
        },
        automatic_payment_methods: { enabled: true },
      })

      return new Response(JSON.stringify({ 
        clientSecret: intent.client_secret,
        tax: taxResult 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (pathname.endsWith('/confirm')) {
      const { payment_intent_id } = await req.json()
      const intent = await stripe.paymentIntents.retrieve(payment_intent_id)
      
      // Normally Stripe handles confirmation client-side, 
      // but we return status for security verification.
      return new Response(JSON.stringify({ status: intent.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (pathname.endsWith('/subscription/create')) {
        const { price_id } = await req.json()
        // This is simplified, usually we'd use Checkout Session for subscriptions 
        // to handle 3DS and card storage automatically.
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: user.email,
            line_items: [{ price: price_id, quantity: 1 }],
            success_url: `${req.headers.get('origin')}/dashboard?success=true`,
            cancel_url: `${req.headers.get('origin')}/pricing`,
            metadata: { user_id: user.id }
        })
        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }

    throw new Error('Endpoint not found')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
