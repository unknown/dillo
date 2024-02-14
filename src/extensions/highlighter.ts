import {
  Decoration,
  EditorView,
  StateEffect,
  StateField,
} from "@uiw/react-codemirror";

function highlightMark(style: string) {
  return Decoration.mark({
    attributes: { style },
  });
}

export type Highlight = {
  from: number;
  to: number;
  style: string;
};

export const highlightEffect = StateEffect.define<Highlight>();

export const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(oldHighlights, tr) {
    oldHighlights = oldHighlights.map(tr.changes);
    let newHighlights = Decoration.none;
    for (const effect of tr.effects) {
      if (effect.is(highlightEffect)) {
        const { from, to, style } = effect.value;
        const mark = highlightMark(style);
        newHighlights = newHighlights.update({
          add: [mark.range(from, to)],
        });
      }
    }
    return tr.docChanged || newHighlights.size > 0
      ? newHighlights
      : oldHighlights;
  },
  provide(f) {
    return EditorView.decorations.from(f);
  },
});
