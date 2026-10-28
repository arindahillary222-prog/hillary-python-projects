import { handleJobsRequest } from "../shared/jobs.mjs";

export async function onRequestGet(context) {
  return handleJobsRequest(context.request);
}
