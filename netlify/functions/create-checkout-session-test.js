exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "TEST FUNCTION WORKS",
      rawBody: event.body,
      parsedBody: (() => {
        try {
          return JSON.parse(event.body || "{}");
        } catch {
          return "INVALID JSON";
        }
      })(),
      stripeKeyPresent: !!process.env.STRIPE_SECRET_KEY,
      envVars: Object.keys(process.env)
    })
  };
};
