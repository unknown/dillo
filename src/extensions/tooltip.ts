import { EditorView, hoverTooltip } from "@uiw/react-codemirror";

import type { ASTNodeWithProbs } from "../utils/ast";
import { astField } from "./ast";

// binary searches for the correct node
function getNode(nodes: ASTNodeWithProbs[], pos: number) {
  let left = 0;
  let right = nodes.length - 1;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const node = nodes[middle]!;
    if (node.node.from <= pos && pos <= node.node.to) {
      return node;
    } else if (node.node.from < pos) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return null;
}

const tooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip-section.cm-tooltip-cursor": {
    border: "none",
    padding: "4px 6px",
    borderRadius: "4px",
  },
});

const wordHover = hoverTooltip((view, pos) => {
  const nodes = view.state.field(astField);
  const node = getNode(nodes, pos);

  if (!node) {
    return null;
  }

  return {
    pos: node.node.from,
    end: node.node.to,
    above: true,
    create() {
      const possible = node.possible
        .slice(0, 10)
        .map(([token, prob]) => {
          const probStr = `${(prob * 100).toFixed(2)}%`;
          return `<li><code>${token}</code>: ${probStr}</li>`;
        })
        .join("\n");

      const dom = document.createElement("div");
      dom.className = "cm-tooltip-cursor";
      dom.innerHTML = `<p>${node.node.name}</p><ul>${possible}</ul>`;
      return { dom };
    },
  };
});

export function dilloTooltip() {
  return [tooltipBaseTheme, wordHover];
}
