const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Currencies the checkout link is allowed to charge in (ISO 4217).
const SUPPORTED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "CHF",
  "SGD", "HKD", "SEK", "NOK", "DKK", "ZAR", "AED"
]);

// Stripe treats these as zero-decimal: unit_amount is in whole units and must
// NOT be multiplied by 100.
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"
]);

// Normalise an arbitrary ?currency= value to a supported uppercase code,
// falling back to NZD (the historical default) when blank/unknown.
function normalizeCurrency(input) {
  const code = String(input || "").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : "NZD";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "Preflight OK",
    };
  }

  try {
    const params = new URLSearchParams(event.rawUrl.split("?")[1] || "");
    const amount = Number(params.get("amount"));
    let email = params.get("email");
    email = (email || "").trim().toLowerCase();
    const currency = normalizeCurrency(params.get("currency"));

    if (!amount || isNaN(amount) || !email) {
      return {
        statusCode: 400,
        body: "Valid amount and email are required",
      };
    }

    // Add the 3% processing fee, then convert to Stripe's minor units.
    // Zero-decimal currencies (e.g. JPY) are charged in whole units.
    const withFee = amount * 1.03;
    const totalWithFee = ZERO_DECIMAL_CURRENCIES.has(currency)
      ? Math.round(withFee)
      : Math.round(withFee * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      metadata: {
        email: email,
        baseAmount: amount,
        currency: currency,
      },
      custom_text: {
        submit: {
          message: "A 3% processing fee has been added to your total.",
        },
      },
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: "Unearthed Education Program Payment",
            },
            unit_amount: totalWithFee,
          },
          quantity: 1,
        },
      ],
      success_url: "https://unearthededucation.org/pages/registration-received",
      cancel_url: "https://unearthededucation.org/pages/registration-received",
    });

    return {
      statusCode: 302,
      headers: {
        Location: session.url,
      },
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: "Unable to create Stripe checkout session",
    };
  }
};
