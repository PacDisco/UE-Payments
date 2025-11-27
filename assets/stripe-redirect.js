document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);

  const amount = params.get("amount");
  const email  = params.get("email");

  console.log("Amount param:", amount);
  console.log("Email param:", email);

  if (!amount) {
    console.error("No amount passed.");
    return;
  }

  try {
    const response = await fetch(
      "https://ue-stripe-payments.netlify.app/.netlify/functions/create-checkout-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, email })
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
