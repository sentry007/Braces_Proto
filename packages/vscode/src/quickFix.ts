import * as vscode from 'vscode';
import { repairJSON } from '@braces/core';

export class JSONRepairCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] | undefined {
    if (!['json', 'jsonc'].includes(document.languageId)) {
      return undefined;
    }

    const text = document.getText();
    if (!text || text.trim() === '') return undefined;

    // Check if there are diagnostic errors or if user requested quick fix
    const hasErrors = context.diagnostics.some(
      (diag) => diag.severity === vscode.DiagnosticSeverity.Error
    );

    if (!hasErrors) {
      return undefined;
    }

    const repairResult = repairJSON(text);
    if (!repairResult.success || repairResult.repaired === text) {
      return undefined;
    }

    const fix = new vscode.CodeAction(
      '⚡ Repair JSON Syntax with Braces Heuristic Engine',
      vscode.CodeActionKind.QuickFix
    );
    fix.isPreferred = true;
    fix.edit = new vscode.WorkspaceEdit();

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(text.length)
    );
    fix.edit.replace(document.uri, fullRange, repairResult.repaired);

    return [fix];
  }
}
