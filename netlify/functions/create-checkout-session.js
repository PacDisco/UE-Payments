const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const HUBSPOT_BASE = "https://api.hubapi.com";
const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

exports.handler = async (event) => {

  // Handle CORS (still fine to keep)
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
    // ✅ Read query params from URL
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

    // 🔍 1. Find contact (primary OR additional email)
    const contactRes = await fetch(
      `${HUBSPOT_BASE}/crm/v3/objects/contacts/search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: "email", operator: "EQ", value: email }
              ]
            },
            {
              filters: [
                {
                  propertyName: "hs_additional_emails",
                  operator: "CONTAINS_TOKEN",
                  value: email
                }
              ]
            }
          ],
          properties: ["email", "hs_additional_emails"],
          limit: 1,
        }),
      }
    );

    const contactData = await contactRes.json();

    if (!contactData.results || contactData.results.length === 0) {
      console.log("Contact not found:", email);
      return {
        statusCode: 404,
        body: "Contact not found in HubSpot",
      };
    }

    const contactId = contactData.results[0].id;

    // 🔗 2. Get deals associated with contact
    const assocRes = await fetch(
      `${HUBSPOT_BASE}/crm/v4/objects/contacts/${contactId}/associations/deals`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        },
      }
    );

    const assocData = await assocRes.json();

    const dealIds =
      assocData.results?.map((r) => r.toObjectId).filter(Boolean) || [];

    if (dealIds.length === 0) {
      return {
        statusCode: 404,
        body: "No deals found for contact",
      };
    }

    // 👉 Use first deal
    const dealId = dealIds[0];

    // 💰 Add 3% fee
    const totalWithFee = Math.round(amount * 1.03 * 100);

    // 💳 Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,

      metadata: {
        dealId: dealId,
        email: email,
        baseAmount: amount
      },

      custom_text: {
        submit: {
          message: "A 3% processing fee has been added to your total."
        }
      },

      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: {
              name: "Unearthed Education Program Payment"
            },
            unit_amount: totalWithFee,
          },
          quantity: 1,
        },
      ],

      success_url: "https://unearthededucation.org/pages/registration-received",
      cancel_url: "https://unearthededucation.org/pages/registration-received",
    });

    // 🚀 REDIRECT DIRECTLY TO STRIPE
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
