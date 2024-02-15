"use client";

import { useState, useRef } from "react";

import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import type { LanguageSupport } from "@codemirror/language";
import CodeMirror, { Compartment } from "@uiw/react-codemirror";
import type { ReactCodeMirrorRef, StateEffect } from "@uiw/react-codemirror";

import { LanguageSelect } from "@/components/language-select";
import type { Language } from "@/components/language-select";
import { updateASTEffect, astField } from "@/extensions/ast";
import { highlightEffect, highlightField } from "@/extensions/highlighter";
import { dilloTooltip } from "@/extensions/tooltip";
import { getASTNodes, getASTNodeProbs } from "@/utils/ast";
import type { ASTNode } from "@/utils/ast";
import type { TokenWithLogProbs } from "@/utils/openai";

const languageConf = new Compartment();

const initialCode = `function add(num1: number, num2: number) {
  return num1 + num2;
}`;

const languages: Language[] = [
  { id: "none", name: "None" },
  { id: "python", name: "Python" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
];

function getLanguageSupport(language: Language): LanguageSupport | [] {
  switch (language.id) {
    case "python": {
      return python();
    }
    case "javascript": {
      return javascript();
    }
    case "typescript": {
      return javascript({ typescript: true });
    }
    default: {
      return [];
    }
  }
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export default function Home() {
  const [code, setCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);

  const refs = useRef<ReactCodeMirrorRef>({});

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <h2 className="font-bold">Dillo</h2>
        <LanguageSelect
          languages={languages}
          onLanguageChange={(language: Language) => {
            if (!refs.current.view) {
              return;
            }
            refs.current.view.dispatch({
              effects: [languageConf.reconfigure(getLanguageSupport(language))],
            });
          }}
        />
        <button
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
          disabled={isLoading}
          onClick={async () => {
            if (!refs.current.view) {
              return;
            }

            setIsLoading(true);
            const logprobsResponse = await fetch(
              getBaseUrl() + "/api/completion/",
              { method: "POST", body: JSON.stringify({ code }) },
            );
            const logprobs: TokenWithLogProbs[] = await logprobsResponse.json();
            setIsLoading(false);

            if (logprobs === null) {
              return;
            }

            const effects: StateEffect<unknown>[] = [];

            const languageExtension = languageConf.get(refs.current.view.state);
            const languageExtensionLoaded =
              languageExtension &&
              (!Array.isArray(languageExtension) ||
                languageExtension.length > 0);

            const nodes: ASTNode[] = languageExtensionLoaded
              ? getASTNodes(refs.current.view.state)
              : logprobs.map(({ from, to }) => ({ from, to, name: "Token" }));
            const astNodeProbs = getASTNodeProbs(code, nodes, logprobs);

            effects.push(updateASTEffect.of(astNodeProbs));

            for (const astNodeProb of astNodeProbs) {
              const { node, prob, possible } = astNodeProb;

              // TODO: investigate when this happens
              if (possible.length === 0 || node.from >= node.to) {
                console.error(node);
                continue;
              }

              const maxProb = possible[0][1];
              const hue = ((prob / maxProb) * 120).toString(10);

              effects.push(
                highlightEffect.of({
                  from: node.from,
                  to: node.to,
                  style: `background-color: hsl(${hue} 100% 50% / ${
                    maxProb - prob
                  })`,
                }),
              );
            }

            refs.current.view.dispatch({ effects });
          }}
        >
          Submit
        </button>
      </div>
      <CodeMirror
        ref={refs}
        value={code}
        extensions={[
          astField,
          highlightField,
          dilloTooltip(),
          languageConf.of([]),
        ]}
        onChange={(value) => {
          setCode(value);
        }}
      />
    </div>
  );
}
