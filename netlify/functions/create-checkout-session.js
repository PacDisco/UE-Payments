const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    // Parse incoming POST body
    const body = JSON.parse(event.body);

    const amount = body.amount; // expected in whole NZD (e.g. "250")
    const email  = body.email;  // optional customer email

    if (!amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Amount is required" }),
      };
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,

      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: {
              name: "Unearthed Education Program Payment",
            },
            unit_amount: Number(amount) * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],

      success_url: "https://unearthededucation.org/pages/registration-received",
      cancel_url: "https://unearthededucation.org/pages/registration-received",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (error) {
    console.error("Stripe Checkout Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unable to create Stripe checkout session" }),
    };
  }
};
