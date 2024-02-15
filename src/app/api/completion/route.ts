import { getLogProbs } from "@/utils/openai";

export async function POST(req: Request) {
  const json = await req.json();
  const { code } = json;

  const logprobs = await getLogProbs(code);

  return Response.json(logprobs);
}
