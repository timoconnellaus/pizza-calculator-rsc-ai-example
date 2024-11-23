import { createOpenAI } from "@ai-sdk/openai";
import { getEdgeRuntimeResponse } from "@assistant-ui/react/edge";

export const maxDuration = 30;

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

export const POST = async (request: Request) => {
  const requestData = await request.json();

  return getEdgeRuntimeResponse({
    options: {
      model: groq("llama3-70b-8192"),
    },
    requestData,
    abortSignal: request.signal,
  });
};
