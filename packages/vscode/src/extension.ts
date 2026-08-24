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
  type ConversionFormat,
} from '@braces/core';
import { TokenStatusBar } from './statusBar';
import { JSONRepairCodeActionProvider } from './quickFix';

export function activate(context: vscode.ExtensionContext) {
  // 1. Initialize Status Bar Token Counter
  const statusBar = new TokenStatusBar();
  context.subscriptions.push(statusBar);

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
    vscode.commands.registerCommand('braces.repairJSON', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text, range } = getActiveText(editor);
      const result = repairJSON(text);

      if (result.success) {
        await editor.edit((editBuilder) => {
          editBuilder.replace(range, result.repaired);
        });
        vscode.window.showInformationMessage(
          `⚡ Braces: Successfully repaired JSON (${result.fixes.length} fixes applied)!`
        );
      } else {
        vscode.window.showErrorMessage(
          `⚡ Braces: Could not auto-repair JSON. ${result.error ?? ''}`
        );
      }
    })
  );

  // Command: Format JSON
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.formatJSON', async () => {
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
          `⚡ Braces Format Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Minify JSON
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.minifyJSON', async () => {
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
          `⚡ Braces Minify Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Helper for Format Conversions
  function registerConversionCommand(commandId: string, toFormat: ConversionFormat) {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const { text, range } = getActiveText(editor);
        try {
          const converted = convertContent(text, 'json', toFormat, 2);
          await editor.edit((editBuilder) => {
            editBuilder.replace(range, converted);
          });
          vscode.window.showInformationMessage(
            `⚡ Braces: Converted JSON to ${toFormat.toUpperCase()} successfully!`
          );
        } catch (err) {
          vscode.window.showErrorMessage(
            `⚡ Braces Conversion Error: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      })
    );
  }

  registerConversionCommand('braces.convertToTOON', 'toon');
  registerConversionCommand('braces.convertToYAML', 'yaml');
  registerConversionCommand('braces.convertToXML', 'xml');
  registerConversionCommand('braces.convertToCSV', 'csv');
  registerConversionCommand('braces.convertToTOML', 'toml');

  // Command: Generate TypeScript
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.generateTypeScript', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const tsCode = jsonToTypeScript(text, 'RootObject');
        await openGeneratedDocument(tsCode, 'typescript');
      } catch (err) {
        vscode.window.showErrorMessage(
          `⚡ Braces Generator Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Generate Zod
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.generateZod', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const zodCode = jsonToZod(text, 'RootSchema');
        await openGeneratedDocument(zodCode, 'typescript');
      } catch (err) {
        vscode.window.showErrorMessage(
          `⚡ Braces Generator Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Generate JSON Schema
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.generateJSONSchema', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const schema = jsonToJSONSchema(text, 'GeneratedSchema');
        await openGeneratedDocument(schema, 'json');
      } catch (err) {
        vscode.window.showErrorMessage(
          `⚡ Braces Generator Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Generate Markdown Table
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.generateMarkdownTable', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const table = jsonToMarkdownTable(text);
        await openGeneratedDocument(table, 'markdown');
      } catch (err) {
        vscode.window.showErrorMessage(
          `⚡ Braces Generator Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  // Command: Optimize Tokens (Copy TOON to clipboard)
  context.subscriptions.push(
    vscode.commands.registerCommand('braces.optimizeTokens', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const { text } = getActiveText(editor);
      try {
        const toon = jsonToTOON(text);
        const stats = calculateTokenStats(text);
        await vscode.env.clipboard.writeText(toon);
        vscode.window.showInformationMessage(
          `⚡ Braces: Copied TOON format to clipboard! Saved ~${stats.savedPercent}% tokens (${stats.jsonTokens} → ${stats.toonTokens} tokens).`
        );
      } catch (err) {
        vscode.window.showErrorMessage(
          `⚡ Braces Optimization Error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );
}

export function deactivate() {}
