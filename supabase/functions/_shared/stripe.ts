
import Stripe from 'https://esm.sh/stripe@14.23.0?target=deno';

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  // This is needed to use the Fetch API rather than Node's http client
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});
