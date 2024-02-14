import { Facet, StateEffect, StateField } from "@uiw/react-codemirror";

import { ASTNodeWithProbs } from "../utils/ast";

const astFacet = Facet.define<ASTNodeWithProbs[]>();

export const updateASTEffect = StateEffect.define<ASTNodeWithProbs[]>();

export const astField = StateField.define<ASTNodeWithProbs[]>({
  create() {
    return [];
  },
  update(oldProbs, tr) {
    const newProbs: ASTNodeWithProbs[] = [];
    for (const effect of tr.effects) {
      if (effect.is(updateASTEffect)) {
        newProbs.push(...effect.value);
      }
    }
    return tr.docChanged || newProbs.length > 0 ? newProbs : oldProbs;
  },
  provide(f) {
    return astFacet.from(f);
  },
});
