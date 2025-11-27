const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const amount = body.amount; // amount in whole NZD (example: 250)
    const email  = body.email;  // optional

    if (!amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Amount is required" }),
      };
    }

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
            unit_amount: Number(amount) * 100, // convert to cents
          },
          quantity: 1,
        },
      ],

      // your final redirect URL
      success_url: "https://unearthededucation.org/pages/registration-received",
      cancel_url: "https://unearthededucation.org/pages/registration-received",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (error) {
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unable to create Stripe checkout session" }),
    };
  }
};
