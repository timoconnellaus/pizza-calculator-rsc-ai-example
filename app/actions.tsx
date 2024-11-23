"use server";

import { createOpenAI } from "@ai-sdk/openai";
import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import type { ReactNode } from "react";
import { z } from "zod";

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

export interface ServerMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClientMessage {
  role: "user" | "assistant";
  display: ReactNode;
}

export async function continueConversation(
  input: string,
): Promise<ClientMessage> {
  "use server";

  const history = getMutableAIState();

  const result = await streamUI({
    model: groq("llama3-70b-8192"),
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI assistant, I can calculate various things to help with pizza recipes. For example, I can show you the proper measurements for pizza dough based on how many people you are cooking for and how large you want your dough balls. I can provide calculations using either grams or ounces. If you'd like to know more about the tools I have available, just ask me to describe them.",
      },
      ...history.get(),
      { role: "user", content: input },
    ],
    text: ({ content, done }) => {
      if (done) {
        history.done((messages: ServerMessage[]) => [
          ...messages,
          { role: "assistant", content },
        ]);
      }

      return <div>{content}</div>;
    },
    tools: {
      pizzaCalculator: {
        description:
          "A tool for calculating the ingredient weights (flour, water, salt and yeast) for pizza dough based on the number of dough balls and hydration levels",
        parameters: z.object({
          numberOfPizzas: z.number().default(0),
          doughballWeight: z
            .number()
            .default(200)
            .describe("The weight of each of the doughballs"),
          sl: z.enum(["grams", "ounces"]).default("grams"),
          hydrationPercentage: z
            .number()
            .default(60)
            .describe("Hydration percentage where 60 is 60%"),
        }),
        generate: async (args) => {
          const totalWeight = args.numberOfPizzas * args.doughballWeight;
          const ratioDecimal = args.hydrationPercentage / 100;
          const flourWeight = totalWeight / (1 + ratioDecimal);
          const waterWeight = flourWeight * ratioDecimal;
          const yeastWeight = totalWeight * 0.0007;
          const saltWeight = totalWeight * 0.018;

          const result =
            args.sl === "ounces"
              ? {
                  totalFlourWeight: flourWeight * 0.035274,
                  totalWaterWeight: waterWeight * 0.035274,
                  totalSaltWeight: saltWeight * 0.035274,
                  totalYeastWeight: yeastWeight * 0.035274,
                }
              : {
                  totalFlourWeight: flourWeight,
                  totalWaterWeight: waterWeight,
                  totalSaltWeight: saltWeight,
                  totalYeastWeight: yeastWeight,
                };

          return (
            <div className="p-6 bg-[#fcf7e6] border-4 border-[#cd212a] rounded-lg max-w-2xl mx-auto">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-[#cd212a] font-serif">
                  🍕 Mama Mia! Your Pizza Recipe! 🍕
                </h2>
                <p className="text-[#2e7d32] italic">
                  *kisses fingers* Bellissimo!
                </p>
              </div>

              <div className="bg-white p-4 rounded border-2 border-[#008c45] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌾</span>
                  <p>
                    Flour: {result.totalFlourWeight.toFixed(2)} {args.sl}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💧</span>
                  <p>
                    Water: {result.totalWaterWeight.toFixed(2)} {args.sl}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧂</span>
                  <p>
                    Salt: {result.totalSaltWeight.toFixed(2)} {args.sl}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🦠</span>
                  <p>
                    Yeast: {result.totalYeastWeight.toFixed(2)} {args.sl}
                  </p>
                </div>
              </div>

              <div className="text-center mt-4 text-sm text-gray-600">
                <p>🤌 Made with love from Nonnas secret recipe 🤌</p>
              </div>
            </div>
          );
        },
      },
    },
  });

  return {
    role: "assistant",
    display: result.value,
  };
}

export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    continueConversation,
  },
  initialAIState: [],
  initialUIState: [],
});
