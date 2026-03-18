const crypto = require("crypto");

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    const Stripe = require("stripe");
    const stripe = Stripe(STRIPE_SECRET);

    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return { statusCode: 400, body: "Webhook Error" };
  }

  // ✅ Only act on successful payments
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const dealId = session.metadata?.dealId;
    const email = session.metadata?.email;

    const amountPaid = session.amount_total / 100; // back to dollars
    const transactionId = session.payment_intent;
    const date = new Date().toISOString().split("T")[0];

    try {
      // 1️⃣ Get existing deal
      const dealRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=payment_1,payment_2,payment_3,payment_4,payment_5`,
        {
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
          },
        }
      );

      const deal = await dealRes.json();
      const props = deal.properties || {};

      // 2️⃣ Find next empty payment field
      let fieldToUpdate = null;

      for (let i = 1; i <= 5; i++) {
        if (!props[`payment_${i}`]) {
          fieldToUpdate = `payment_${i}`;
          break;
        }
      }

      if (!fieldToUpdate) {
        console.error("No available payment field");
        return { statusCode: 200 };
      }

      // 3️⃣ Format value
      const value = `${amountPaid}, ${transactionId}, ${date}`;

      // 4️⃣ Update deal
      await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
          },
          body: JSON.stringify({
            properties: {
              [fieldToUpdate]: value,
            },
          }),
        }
      );

      console.log("Deal updated:", dealId);

    } catch (err) {
      console.error("HubSpot update failed:", err);
    }
  }

  return { statusCode: 200, body: "ok" };
};
