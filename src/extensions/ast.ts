import { Facet, StateEffect, StateField } from "@uiw/react-codemirror";

import { ASTNodeWithProbs } from "../utils/ast";

const astFacet = Facet.define<ASTNodeWithProbs[]>();

export const updateASTEffect = StateEffect.define<ASTNodeWithProbs[]>();

export const astField = StateField.define({
  create() {
    return [] as ASTNodeWithProbs[];
  },
  update: function (value, tr) {
    const newValue: ASTNodeWithProbs[] = value;

    // TODO: this keeps appending values
    for (const effect of tr.effects) {
      if (effect.is(updateASTEffect)) {
        newValue.push(...effect.value);
      }
    }

    return newValue;
  },
  provide: (f) => astFacet.from(f),
});
