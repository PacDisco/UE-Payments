const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);

    const amount = body.amount; // amount in NZD, whole dollars
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
              name: "Program Payment",
            },
            unit_amount: Number(amount) * 100, // convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: "https://yourshopifydomain.com/pages/success",
      cancel_url: "https://yourshopifydomain.com/pages/cancel",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error("Stripe error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Checkout session error" }),
    };
  }
};
