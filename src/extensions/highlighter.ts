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
  update: function (highlights, tr) {
    highlights = highlights.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(highlightEffect)) {
        const { from, to, style } = effect.value;
        const mark = highlightMark(style);
        highlights = highlights.update({
          add: [mark.range(from, to)],
        });
      }
    }
    return highlights;
  },
  provide: (f) => EditorView.decorations.from(f),
});
