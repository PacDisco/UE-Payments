document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);

  const amount = params.get("amount");
  const email  = params.get("email");
  const currency = params.get("currency"); // optional ISO code, defaults to NZD server-side

  console.log("Amount param:", amount);
  console.log("Email param:", email);
  console.log("Currency param:", currency);

  if (!amount) {
    console.error("No amount passed.");
    return;
  }

  try {
    const query = new URLSearchParams({ amount, email });
    if (currency) query.set("currency", currency);

    const response = await fetch(
      "https://ue-stripe-payments.netlify.app/.netlify/functions/create-checkout-session?" + query.toString(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, email, currency })
      }
    );

    const data = await response.json();
    console.log("Stripe response:", data);

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Payment error: " + (data.error || "Unknown error"));
    }

  } catch (err) {
    console.error("Fetch error:", err);
    alert("Unable to contact payment server.");
  }
});
