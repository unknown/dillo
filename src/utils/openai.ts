import OpenAI from "openai";

const client = new OpenAI({
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type TokenWithLogProbs = {
  token: string;
  from: number;
  to: number;
  probs: Record<string, number>;
};

export async function getLogProbs(code: string): Promise<TokenWithLogProbs[]> {
  const response = await client.completions.create({
    model: "deepseek-ai/deepseek-coder-7b-base-v1.5",
    prompt: code,
    echo: true,
    logprobs: 5,
    max_tokens: 0,
  });

  const allOffsets: number[] = response.choices[0]?.logprobs?.text_offset ?? [];
  const logprobs = response.choices[0]?.logprobs?.top_logprobs ?? [];

  const result: TokenWithLogProbs[] = [];

  // first logprob is for `<｜begin▁of▁sentence｜>`, which is null
  const firstTokenOffset = allOffsets[1]!;
  for (let i = 1; i < allOffsets.length; ++i) {
    const from = allOffsets[i]! - firstTokenOffset;
    const to = allOffsets[i + 1]
      ? allOffsets[i + 1] - firstTokenOffset
      : code.length;

    const token = code.substring(from, to);

    const probs: Record<string, number> = {};
    Object.entries(logprobs[i]!).forEach(([token, logprob]) => {
      probs[token] = logprob;
    });

    result.push({ token, from, to, probs });
  }

  return result;
}
