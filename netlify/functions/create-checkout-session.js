const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

    if (!amount || isNaN(amount) || !email) {
      return {
        statusCode: 400,
        body: "Valid amount and email are required",
      };
    }

    const totalWithFee = Math.round(amount * 1.03 * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      metadata: {
        email: email,
        baseAmount: amount,
      },
      custom_text: {
        submit: {
          message: "A 3% processing fee has been added to your total.",
        },
      },
      line_items: [
        {
          price_data: {
            currency: "nzd",
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
