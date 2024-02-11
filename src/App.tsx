import { useRef, useState } from "react";

import { syntaxTree } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import type {
  EditorState,
  ReactCodeMirrorRef,
  StateEffect,
} from "@uiw/react-codemirror";

import { highlightEffect, highlightField } from "./extensions/highlighter";
import type { Highlight } from "./extensions/highlighter";
import { getLogProbs } from "./utils/openai";
import type { TokenWithLogProbs } from "./utils/openai";

const initialCode = `function add(num1: number, num2: number) {
  return num1 + num2;
}`;

type ASTNode = {
  name: string;
  from: number;
  to: number;
};

function getASTNodes(state: EditorState): ASTNode[] {
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

function getASTNodeProbs(
  code: string,
  nodes: ASTNode[],
  logprobs: TokenWithLogProbs[]
) {
  let tokenIndex = 0;
  let from = 0;
  return nodes.map((node) => {
    const possible: [string, number][] = [];
    const origFrom = from;
    let accProb = 0;

    while (tokenIndex < logprobs.length && from < node.to) {
      const logprob = logprobs[tokenIndex]!;
      const nodeString = code.substring(from, node.to);

      if (nodeString.startsWith(logprob.token)) {
        // ASTNode contains token (e.g. ASTNode: "function", token: "func")
        const prefix = code.substring(origFrom, from);
        possible.push(
          ...Object.entries(logprob.probs).map(
            ([token, prob]) =>
              [prefix + token, accProb + prob] satisfies [string, number]
          )
        );
        from = logprob.to;
        accProb += logprob.probs[logprob.token];
      } else if (logprob.token.startsWith(nodeString)) {
        // token contains ASTNode (e.g. token: "({", token: "(")
        possible.push(
          ...Object.entries(logprob.probs).map(
            ([token, prob]) =>
              [token, accProb + prob] satisfies [string, number]
          )
        );
        break;
      } else {
        console.error(`Code mismatch: "${nodeString}" and "${logprob.token}"`);
      }

      ++tokenIndex;
    }

    possible.sort(([, probA], [, probB]) => probB - probA);

    return {
      node,
      possible,
      prob: accProb,
    };
  });
}

function App() {
  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);

  const refs = useRef<ReactCodeMirrorRef>({});

  return (
    <div className="w-full min-h-screen">
      <CodeMirror
        ref={refs}
        value={code}
        extensions={[highlightField, javascript()]}
        onChange={(value) => {
          setCode(value);
        }}
      />
      <button
        className="bg-black text-white px-4 py-2 rounded-md text-sm"
        disabled={isLoading}
        onClick={async () => {
          if (!refs.current.view) {
            return;
          }

          setIsLoading(true);
          const logprobs = await getLogProbs(code).catch((err) => {
            console.error(err);
            return null;
          });
          setIsLoading(false);

          if (logprobs === null) {
            return;
          }

          const nodes = getASTNodes(refs.current.view.state);
          const astNodeProbs = getASTNodeProbs(code, nodes, logprobs);
          const effects: StateEffect<Highlight>[] = [];

          for (const astNodeProb of astNodeProbs) {
            const { node, prob, possible } = astNodeProb;

            const filteredPossible = possible.filter(
              ([token]) => token.trim().replace(/(\r\n|\n|\r)/gm, "").length > 0
            );

            // TODO: investigate when this happens
            if (filteredPossible.length === 0 || node.from >= node.to) {
              console.error(node);
              continue;
            }

            const selectedProb = Math.exp(prob);
            const maxProb = Math.exp(filteredPossible[0][1]);
            const hue = (selectedProb * 120).toString(10);

            console.log(code.substring(node.from, node.to), filteredPossible);

            effects.push(
              highlightEffect.of({
                from: node.from,
                to: node.to,
                style: `background-color: hsl(${hue} 100% 50% / ${
                  maxProb - selectedProb
                })`,
              })
            );
          }

          refs.current.view.dispatch({ effects });
        }}
      >
        Submit
      </button>
    </div>
  );
}

export default App;
