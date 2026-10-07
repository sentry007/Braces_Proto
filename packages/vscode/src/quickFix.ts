import * as vscode from 'vscode';
import { repairJSON, type RepairResult } from 'bracer';

/** Larger documents don't get the automatic quick fix (the command still works). */
const MAX_CHARS = 1_000_000;

export class JSONRepairCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  // Code actions are requested on every cursor move while errors exist, so the
  // repair result is cached per document version.
  private cache = new WeakMap<vscode.TextDocument, { version: number; result: RepairResult }>();

  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] | undefined {
    const hasJSONError = context.diagnostics.some(
      (d) => d.severity === vscode.DiagnosticSeverity.Error && (d.source === 'json' || d.source === undefined)
    );
    if (!hasJSONError || document.getText().length > MAX_CHARS) return undefined;

    let cached = this.cache.get(document);
    if (!cached || cached.version !== document.version) {
      cached = { version: document.version, result: repairJSON(document.getText()) };
      this.cache.set(document, cached);
    }
    const { result } = cached;
    if (!result.success) return undefined;

    const fix = new vscode.CodeAction('Repair JSON with Bracer', vscode.CodeActionKind.QuickFix);
    fix.isPreferred = true;
    fix.diagnostics = context.diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error);
    fix.edit = new vscode.WorkspaceEdit();
    const text = document.getText();
    fix.edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(text.length)), result.repaired);
    return [fix];
  }
}
