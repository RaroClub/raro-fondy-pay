export default async function handler(req, res) {
  const merchant_id = process.env.FONDY_MERCHANT_ID;
  const secret_key = process.env.FONDY_SECRET_KEY;

  const { amount } = req.query;

  const order_id = "order_" + Date.now();

  const data = {
    order_id,
    merchant_id,
    order_desc: "Оплата заказа",
    amount: amount || 100,
    currency: "UAH",
  };

  const crypto = await import("crypto");

  const signature = crypto
    .createHash("sha1")
    .update(
      secret_key +
        "|" +
        Object.values(data).join("|")
    )
    .digest("hex");

  data.signature = signature;

  res.status(200).json({
    checkout_url: "https://pay.fondy.eu/api/checkout?" + new URLSearchParams(data),
  });
}
