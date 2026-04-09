
/**
 * Simple Tax calculation utility (Simulating Tax.js functionality)
 * For production, consider using Stripe Tax or a professional API.
 */

export interface TaxConfig {
  country: string;
  isVatRegistered?: boolean;
}

export const getTaxRate = (country: string): number => {
  const rates: Record<string, number> = {
    'SK': 0.20, // Slovakia 20%
    'CZ': 0.21, // Czech Republic 21%
    'AT': 0.20, // Austria 20%
    'DE': 0.19, // Germany 19%
    'US': 0.00, // US (Sales tax varies, simplified here)
  };
  return rates[country] || 0.20; // Default to 20% for EU safety
};

export const calculateTax = (amount: number, country: string) => {
  const rate = getTaxRate(country);
  const taxAmount = Math.round(amount * rate);
  return {
    subtotal: amount,
    tax: taxAmount,
    total: amount + taxAmount,
    rate: rate * 100
  };
};
