import { hoverTooltip } from "@uiw/react-codemirror";

import { astField } from "./ast";
import type { ASTNodeWithProbs } from "../utils/ast";

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

export const wordHover = hoverTooltip((view, pos, side) => {
  const nodes = view.state.field(astField);
  const node = getNode(nodes, pos);

  if (
    !node ||
    (node.node.from == pos && side < 0) ||
    (node.node.to == pos && side > 0)
  ) {
    return null;
  }

  return {
    pos: node.node.from,
    end: node.node.to,
    above: true,
    create() {
      const possible = node.possible
        .map(([token, prob]) => {
          const probStr = `${(Math.exp(prob) * 100).toFixed(2)}%`;
          return `<li><code>${token}</code>: ${probStr}</li>`;
        })
        .join("\n");

      const dom = document.createElement("div");
      dom.innerHTML = `<ul>${possible}</ul>`;
      return { dom };
    },
  };
});
