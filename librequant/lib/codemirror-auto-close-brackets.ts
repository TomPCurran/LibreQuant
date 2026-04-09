import { closeBrackets } from "@codemirror/autocomplete";
import { StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

const patched = new WeakSet<EditorView>();

function patchEditorView(view: EditorView | null): void {
  if (!view || patched.has(view)) return;
  try {
    patched.add(view);
    view.dispatch({
      effects: StateEffect.appendConfig.of(closeBrackets()),
    });
  } catch {
    patched.delete(view);
  }
}

/**
 * JupyterLab registers `closeBrackets` as the `autoClosingBrackets` option, default **off**.
 * Append the extension to each notebook cell editor so `(`, `[`, `{`, quotes auto-close.
 */
export function patchAutoCloseBracketsInContainer(root: HTMLElement): void {
  const hosts = root.querySelectorAll<HTMLElement>(".jp-CodeMirrorEditor");
  hosts.forEach((host) => {
    const content = host.querySelector(".cm-content") as HTMLElement | null;
    const view = EditorView.findFromDOM(content ?? host);
    patchEditorView(view);
  });
}
