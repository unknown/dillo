import CodeMirror from "@uiw/react-codemirror";
import type { ReactCodeMirrorRef, StateEffect } from "@uiw/react-codemirror";
import { useRef, useState } from "react";
import { getLogProbs } from "./utils/openai";
import {
  Highlight,
  highlightEffect,
  highlightField,
} from "./extensions/highlighter";

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
        extensions={[highlightField]}
        onChange={(value) => {
          setCode(value);
        }}
      />
      <button
        className="bg-black text-white px-4 py-2 rounded-md text-sm"
        disabled={isLoading}
        onClick={async () => {
          setIsLoading(true);

          const logprobs = await getLogProbs(code);

          const effects: StateEffect<Highlight>[] = [];

          for (const logprob of logprobs) {
            const { token, from, to, probs } = logprob;

            if (probs[token] === undefined) {
              console.error(`Missing logprob for ${token}`);
              return;
            }

            const probsArr = Object.entries(probs);
            probsArr.sort(([, probA], [, probB]) => probB - probA);

            const selectedProbEntry = [token, probs[token]] as const;
            const maxProbEntry = probsArr[0]!;

            const selectedProb = Math.exp(selectedProbEntry[1]);
            const maxProb = Math.exp(maxProbEntry[1]);
            const hue = (selectedProb * 120).toString(10);

            console.log(token, selectedProb, maxProb, maxProb - selectedProb);

            effects.push(
              highlightEffect.of({
                from,
                to,
                style: `background-color: hsl(${hue} 100% 50% / ${
                  maxProb - selectedProb
                })`,
              })
            );
          }

          refs.current.view?.dispatch({ effects });

          setIsLoading(false);
        }}
      >
        Submit
      </button>
    </div>
  );
}

export default App;
