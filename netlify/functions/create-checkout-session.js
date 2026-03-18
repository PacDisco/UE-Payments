const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {

  // Handle CORS preflight request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "Preflight OK",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const amount = Number(body.amount);
    const email = body.email;

    if (!amount || isNaN(amount)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Valid amount is required" }),
      };
    }

    // ✅ Add 3% processing fee
    const totalWithFee = Math.round(amount * 1.03 * 100); // convert to cents AFTER fee

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,

      // ✅ Updated message
      custom_text: {
        submit: {
          message: "A 3% processing fee has been added to your total."
        }
      },

      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: { name: "Unearthed Education Program Payment" },
            unit_amount: totalWithFee,
          },
          quantity: 1,
        },
      ],

      success_url: "https://unearthededucation.org/pages/registration-received",
      cancel_url: "https://unearthededucation.org/pages/registration-received",
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error("Stripe error:", err);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Unable to create Stripe checkout session" }),
    };
  }
};
