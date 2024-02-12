import { useRef, useState } from "react";

import { javascript } from "@codemirror/lang-javascript";
import CodeMirror from "@uiw/react-codemirror";
import type { ReactCodeMirrorRef, StateEffect } from "@uiw/react-codemirror";

import { highlightEffect, highlightField } from "./extensions/highlighter";
import { astField, updateASTEffect } from "./extensions/ast";
import type { Highlight } from "./extensions/highlighter";
import { wordHover } from "./extensions/tooltip";
import { getASTNodeProbs, getASTNodes } from "./utils/ast";
import { getLogProbs } from "./utils/openai";

const initialCode = `function add(num1: number, num2: number) {
  return num1 + num2;
}`;

function App() {
  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);

  const refs = useRef<ReactCodeMirrorRef>({});

  return (
    <div className="w-full min-h-screen">
      <CodeMirror
        ref={refs}
        value={code}
        extensions={[
          wordHover,
          highlightField,
          astField,
          javascript({ typescript: true }),
        ]}
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

          refs.current.view.dispatch({
            effects: [updateASTEffect.of(astNodeProbs)],
          });

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
