
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { stripe } from '../_shared/stripe.ts'

const cryptoProvider = stripe.getWebhooksCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  // 1. Verification
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  const body = await req.text()
  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
      undefined,
      cryptoProvider
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // 2. Setup Supabase Client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { type, data } = event
  const object = data.object

  console.log(`🔔 Webhook received: ${type}`)

  try {
    switch (type) {
      case 'checkout.session.completed': {
        const session = object
        const userId = session.metadata?.user_id
        if (userId) {
          await supabaseClient
            .from('profiles')
            .update({ stripe_customer_id: session.customer })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = object
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', sub.customer)
          .single()

        if (profile) {
          await supabaseClient.from('subscriptions').upsert({
            id: sub.id,
            user_id: profile.id,
            plan_id: sub.items.data[0].price.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = object
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('id', sub.id)
        break
      }

      case 'invoice.paid': {
        const invoice = object
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single()

        if (profile) {
          await supabaseClient.from('invoices').upsert({
            id: invoice.id,
            user_id: profile.id,
            amount_total: invoice.amount_paid,
            currency: invoice.currency,
            status: 'paid',
            invoice_pdf: invoice.invoice_pdf,
            hosted_invoice_url: invoice.hosted_invoice_url,
            created_at: new Date(invoice.created * 1000).toISOString(),
          })
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`❌ Webhook handler error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
