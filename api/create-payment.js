import crypto from "crypto";

export default async function handler(req, res) {
  const merchant_id = process.env.FONDY_MERCHANT_ID;
  const secret_key = process.env.FONDY_SECRET_KEY;

  const { amount, currency, order_name } = req.query;

  if (!amount || !currency) {
    return res.status(400).send("Missing required parameters: amount, currency");
  }

  const order_id = "raro_" + Date.now();
  const order_desc = order_name
    ? "Oplata zamovlennya " + decodeURIComponent(order_name)
    : "Oplata zamovlennya";

  const params = {
    amount: String(amount),
    currency: String(currency),
    merchant_id: String(merchant_id),
    order_desc,
    order_id,
  };

  const sortedKeys = Object.keys(params).sort();
  const signatureString = secret_key + "|" + sortedKeys.map((k) => params[k]).join("|");
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

  const requestBody = {
    request: {
      ...params,
      signature,
    },
  };

  try {
    const fondyResponse = await fetch("https://pay.fondy.eu/api/checkout/url/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const fondyData = await fondyResponse.json();

    if (fondyData.response && fondyData.response.checkout_url) {
      return res.redirect(302, fondyData.response.checkout_url);
    } else {
      const errMsg = fondyData.response
        ? fondyData.response.error_message || JSON.stringify(fondyData.response)
        : "Unknown Fondy error";
      return res.status(500).send("Fondy error: " + errMsg);
    }
  } catch (error) {
    return res.status(500).send("Server error: " + error.message);
  }
}
