import * as vscode from 'vscode';
import {
  repairJSON,
  formatJSON,
  minifyJSON,
  convertContent,
  jsonToTypeScript,
  jsonToZod,
  jsonToJSONSchema,
  jsonToMarkdownTable,
  jsonToTOON,
  calculateTokenStats,
  loadTokenizer,
  type ConversionFormat,
} from 'bracer';
import { TokenStatusBar } from './statusBar';
import { JSONRepairCodeActionProvider } from './quickFix';

export function activate(context: vscode.ExtensionContext) {
  // 1. Initialize Status Bar Token Counter, then refresh with exact counts
  // once the o200k_base tokenizer has loaded
  const statusBar = new TokenStatusBar();
  context.subscriptions.push(statusBar);
  void loadTokenizer().then(() => statusBar.update());

  // 2. Register Quick Fix Code Action Provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      [{ language: 'json' }, { language: 'jsonc' }],
      new JSONRepairCodeActionProvider(),
      {
        providedCodeActionKinds: JSONRepairCodeActionProvider.providedCodeActionKinds,
      }
    )
  );

  // Helper: Get target text (selected or entire document)
  function getActiveText(editor: vscode.TextEditor): { text: string; range: vscode.Range } {
    const selection = editor.selection;
    if (!selection.isEmpty) {
      return {
        text: editor.document.getText(selection),
        range: selection,
      };
    }
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(editor.document.getText().length)
    );
    return {
      text: editor.document.getText(),
      range: fullRange,
    };
  }

  // Helper: Open new untitled document with generated code
  async function openGeneratedDocument(content: string, language: string) {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language,
    });
    await vscode.window.showTextDocument(doc, { preview: false });
  }

  // 3. Register Commands

  // Command: Repair JSON
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.repairJSON', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text, range } = getActiveText(editor);
      const result = repairJSON(text);

      if (result.success) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(range, result.repaired);
        });
        vscode.window.showInformationMessage(
          `Bracer: repaired JSON (${result.fixes.join(", ")}).`
        );
      } else {
        vscode.window.showErrorMessage(
          `Bracer: could not repair this JSON. ${result.error ?? ''}`
        );
      }
    })
  );

  // Command: Format JSON
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.formatJSON', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text, range } = getActiveText(editor);
      try {
        const formatted = formatJSON(text, 2);
        await editor.edit((editBuilder) => {
          editBuilder.replace(range, formatted);
        });
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not format. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Minify JSON
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.minifyJSON', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text, range } = getActiveText(editor);
      try {
        const minified = minifyJSON(text);
        await editor.edit((editBuilder) => {
          editBuilder.replace(range, minified);
        });
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not minify. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Conversions open in a new editor tab so the source file is never overwritten.
  // TOON, CSV and TOML have no built-in language mode, so they open as plain text.
  const CONVERSION_LANGUAGE: Record<ConversionFormat, string> = {
    json: 'json',
    yaml: 'yaml',
    xml: 'xml',
    toon: 'plaintext',
    csv: 'plaintext',
    toml: 'plaintext',
  };

  function registerConversionCommand(commandId: string, toFormat: ConversionFormat) {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const { text } = getActiveText(editor);
        try {
          const converted = convertContent(text, 'json', toFormat, 2);
          await openGeneratedDocument(converted, CONVERSION_LANGUAGE[toFormat]);
        } catch (err) {
          vscode.window.showErrorMessage(
            `Bracer: could not convert to ${toFormat.toUpperCase()}. ${err instanceof Error ? err.message : String(err)}`
          );
        }
      })
    );
  }

  registerConversionCommand('bracer.convertToTOON', 'toon');
  registerConversionCommand('bracer.convertToYAML', 'yaml');
  registerConversionCommand('bracer.convertToXML', 'xml');
  registerConversionCommand('bracer.convertToCSV', 'csv');
  registerConversionCommand('bracer.convertToTOML', 'toml');

  // Command: Generate TypeScript
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.generateTypeScript', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const tsCode = jsonToTypeScript(text, 'RootObject');
        await openGeneratedDocument(tsCode, 'typescript');
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not generate code. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Generate Zod
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.generateZod', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const zodCode = jsonToZod(text, 'RootSchema');
        await openGeneratedDocument(zodCode, 'typescript');
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not generate code. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Generate JSON Schema
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.generateJSONSchema', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const schema = jsonToJSONSchema(text, 'GeneratedSchema');
        await openGeneratedDocument(schema, 'json');
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not generate code. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Generate Markdown Table
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.generateMarkdownTable', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const table = jsonToMarkdownTable(text);
        await openGeneratedDocument(table, 'markdown');
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not generate code. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Optimize Tokens (Copy TOON to clipboard)
  context.subscriptions.push(
    vscode.commands.registerCommand('bracer.optimizeTokens', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const toon = jsonToTOON(text);
        const stats = calculateTokenStats(text);
        await vscode.env.clipboard.writeText(toon);
        vscode.window.showInformationMessage(
          `Bracer: copied TOON to the clipboard. ${stats.jsonTokens} → ${stats.toonTokens} tokens (−${stats.savedPercent}%).`
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          `Bracer: could not convert to TOON. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );
}

export function deactivate() {}
