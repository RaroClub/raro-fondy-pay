import crypto from "crypto";

export default async function handler(req, res) {
  const merchantAccount = process.env.WFP_MERCHANT_ACCOUNT;
  const secretKey = process.env.WFP_SECRET_KEY;
  const merchantDomain = process.env.WFP_DOMAIN || "raro-fondy-pay.vercel.app";

  const { amount, currency, order_name } = req.query;

  if (!amount) {
    return res.status(400).send("Missing required parameter: amount");
  }

  // WayForPay uses main units (UAH), no need to multiply by 100
  const amountValue = parseFloat(amount).toFixed(2);

  // Currency fallback to UAH
  let currencyCode = String(currency || "");
  if (!currencyCode || currencyCode.includes("object") || currencyCode.length !== 3) {
    currencyCode = "UAH";
  }

  const orderReference = "raro_" + Date.now();
  const orderDate = Math.floor(Date.now() / 1000);
  const productName = order_name
    ? decodeURIComponent(order_name)
    : "Oplata zamovlennya";

  // WayForPay signature: HMAC-MD5
  // Format: merchantAccount;domain;orderReference;orderDate;amount;currency;productName[0];productCount[0];productPrice[0]
  const signatureString = [
    merchantAccount,
    merchantDomain,
    orderReference,
    orderDate,
    amountValue,
    currencyCode,
    productName,
    1,
    amountValue,
  ].join(";");

  const signature = crypto
    .createHmac("md5", secretKey)
    .update(signatureString)
    .digest("hex");

  // WayForPay requires HTML form POST — auto-submit on load
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Переадресація на оплату...</title>
</head>
<body style="font-family: Arial; padding: 20px;">
  <h2>Переадресація на оплату...</h2>
  <form id="wfp-form" method="post" action="https://secure.wayforpay.com/pay" accept-charset="utf-8">
    <input type="hidden" name="merchantAccount" value="${merchantAccount}">
    <input type="hidden" name="merchantAuthType" value="SimpleSignature">
    <input type="hidden" name="merchantDomainName" value="${merchantDomain}">
    <input type="hidden" name="merchantSignature" value="${signature}">
    <input type="hidden" name="orderReference" value="${orderReference}">
    <input type="hidden" name="orderDate" value="${orderDate}">
    <input type="hidden" name="amount" value="${amountValue}">
    <input type="hidden" name="currency" value="${currencyCode}">
    <input type="hidden" name="productName[]" value="${productName}">
    <input type="hidden" name="productPrice[]" value="${amountValue}">
    <input type="hidden" name="productCount[]" value="1">
    <input type="hidden" name="defaultPaymentSystem" value="card">
    <input type="hidden" name="language" value="UA">
  </form>
  <script>document.getElementById('wfp-form').submit();</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  return res.send(html);
}
