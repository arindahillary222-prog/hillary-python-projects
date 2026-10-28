import { handleLocationRequest } from "../shared/location.mjs";

export async function onRequestGet(context) {
  return handleLocationRequest(context.request);
}
