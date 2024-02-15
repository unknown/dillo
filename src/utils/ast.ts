import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@uiw/react-codemirror";

import { TokenWithLogProbs } from "./openai";

export type ASTNode = {
  name: string;
  from: number;
  to: number;
};

export function getASTNodes(state: EditorState): ASTNode[] {
  const tree = syntaxTree(state);
  const cursor = tree.cursor();
  const nodes: ASTNode[] = [];

  // `cursor.firstChild` and `cursor.next` may move the cursor
  // source: https://discuss.codemirror.net/t/tree-traversal-using-a-cursor-and-firstchild-skipping-a-leaf/3204/2
  while (cursor) {
    if (!cursor.firstChild()) {
      const { name, from, to } = cursor;
      nodes.push({ name, from, to });
      if (!cursor.next()) {
        break;
      }
    }
  }

  return nodes;
}

export type ASTNodeWithProbs = {
  node: ASTNode;
  possible: [string, number][];
  prob: number;
};

export function getASTNodeProbs(
  code: string,
  nodes: ASTNode[],
  logprobs: TokenWithLogProbs[],
): ASTNodeWithProbs[] {
  let tokenIndex = 0;
  let from = 0;
  return nodes.map((node) => {
    const probs: Record<string, number> = {};
    const origFrom = from;
    let accProb = 0;

    while (tokenIndex < logprobs.length && from < node.to) {
      const logprob = logprobs[tokenIndex]!;
      const nodeString = code.substring(from, node.to);

      if (nodeString.startsWith(logprob.token)) {
        // ASTNode contains token (e.g. ASTNode: "function", token: "func")
        const prefix = code.substring(origFrom, from);
        Object.entries(logprob.probs).forEach(([token, prob]) => {
          probs[prefix + token] = accProb + prob;
        });
        from = logprob.to;
        accProb += logprob.probs[logprob.token];
      } else if (logprob.token.startsWith(nodeString)) {
        // token contains ASTNode (e.g. token: "({", ASTNode: "(")
        Object.entries(logprob.probs).forEach(([token, prob]) => {
          probs[token] = accProb + prob;
        });
        break;
      } else {
        console.error(`Code mismatch: "${nodeString}" and "${logprob.token}"`);
      }

      ++tokenIndex;
    }

    const possible: [string, number][] = Object.entries(probs)
      .filter(([token]) => token.trim().replace(/(\r\n|\n|\r)/gm, "").length > 0)
      .map(([token, logprob]) => [token, Math.exp(logprob)]);
    possible.sort(([, probA], [, probB]) => probB - probA);

    return {
      node,
      possible,
      prob: Math.exp(accProb),
    };
  });
}
