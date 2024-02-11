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

// shifts control and whitespace characters back to their original characters
// source: https://github.com/openai/gpt-2/issues/80#issuecomment-487202159
function cleanToken(token: string) {
  return token
    .split("")
    .map((c) => {
      const charCode = c.charCodeAt(0);
      switch (charCode) {
        case 265: // ĉ
        case 266: // Ġ
        case 288: // Ġ
          return String.fromCharCode(charCode - 256);
        default:
          return c;
      }
    })
    .join("");
}

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
      probs[cleanToken(token)] = logprob;
    });

    result.push({ token, from, to, probs });
  }

  return result;
}
