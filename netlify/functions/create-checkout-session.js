const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  console.log("RAW EVENT BODY:", event.body); // 👈 ADD THIS

  try {
    const body = JSON.parse(event.body || "{}");

    console.log("PARSED BODY:", body); // 👈 AND THIS

    const amount = body.amount;
    const email  = body.email;

    if (!amount) {
      console.log("NO AMOUNT RECEIVED"); // 👈 DEBUG
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: { name: "Unearthed Education Program Payment" },
            unit_amount: Number(amount) * 100,
          },
          quantity: 1
        }
      ],
      success_url: "https://unearthededucation.org/pages/registration-received",
      cancel_url: "https://unearthededucation.org/pages/registration-received",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (error) {
    console.error("FULL ERROR:", error); // 👈 KEY PART
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Unable to create Stripe checkout session" }),
    };
  }
};
