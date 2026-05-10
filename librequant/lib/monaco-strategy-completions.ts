import type * as Monaco from "monaco-editor";

/**
 * Strategy-editor snippets for Monaco Python completion (PARAMS, signal stub, librequant imports).
 */
export function registerStrategyPythonCompletions(
  monaco: typeof Monaco,
): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const snippet =
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

      const suggestions: Monaco.languages.CompletionItem[] = [
        {
          label: "PARAMS",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "PARAMS = {}",
          insertTextRules: snippet,
          documentation: {
            value:
              "**Strategy parameters**\n\nMutable dict of tunable parameters for this strategy (lookbacks, thresholds, symbols, etc.). Referenced by the runner and UI.",
          },
          sortText: "0_strategy_PARAMS",
          range,
        },
        {
          label: "signal",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "def signal(prices):\n    pass\n",
          insertTextRules: snippet,
          documentation: {
            value:
              "**Signal function**\n\nDefine `signal(prices)` to return trading signals from price series. Replace `pass` with your logic.",
          },
          sortText: "0_strategy_signal",
          range,
        },
        {
          label: "from librequant.data import get_bars",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "from librequant.data import get_bars",
          insertTextRules: snippet,
          documentation: {
            value:
              "**Market data**\n\nImport `get_bars` to load OHLCV (or similar) bars for backtests and research.",
          },
          sortText: "1_librequant_data",
          range,
        },
        {
          label: "from librequant.tracking import log_run",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "from librequant.tracking import log_run",
          insertTextRules: snippet,
          documentation: {
            value:
              "**Experiment tracking**\n\nImport `log_run` to record runs (metrics, params) with the tracking layer.",
          },
          sortText: "1_librequant_tracking",
          range,
        },
      ];

      return { suggestions };
    },
  });
}
