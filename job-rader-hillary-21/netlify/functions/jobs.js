exports.handler = async (event) => {
  const { handleJobsRequest } = await import("../../functions/shared/jobs.mjs");
  const params = new URLSearchParams(event.queryStringParameters || {}).toString();
  const host = event.headers?.host || "localhost";
  const request = new Request(`https://${host}/.netlify/functions/jobs${params ? `?${params}` : ""}`);
  const response = await handleJobsRequest(request);
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
    isBase64Encoded: false
  };
};
