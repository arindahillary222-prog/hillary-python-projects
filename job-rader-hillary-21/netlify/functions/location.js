exports.handler = async (event) => {
  const { handleLocationRequest } = await import("../../functions/shared/location.mjs");
  const params = new URLSearchParams(event.queryStringParameters || {}).toString();
  const host = event.headers?.host || "localhost";
  const request = new Request(`https://${host}/.netlify/functions/location${params ? `?${params}` : ""}`);
  const response = await handleLocationRequest(request);
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
    isBase64Encoded: false
  };
};
