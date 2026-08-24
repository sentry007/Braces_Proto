import * as vscode from 'vscode';
import { calculateTokenStats } from '@braces/core';

export class TokenStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'braces.optimizeTokens';
    this.statusBarItem.tooltip = 'Click to copy AI Token-Optimized (TOON) representation';

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.update();
        }
      })
    );

    this.update();
  }

  public update(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.statusBarItem.hide();
      return;
    }

    const languageId = editor.document.languageId;
    if (!['json', 'jsonc', 'yaml', 'toml', 'xml'].includes(languageId)) {
      this.statusBarItem.hide();
      return;
    }

    const text = editor.document.getText();
    if (!text || text.trim().length === 0) {
      this.statusBarItem.hide();
      return;
    }

    try {
      const stats = calculateTokenStats(text);
      if (stats.jsonTokens > 0) {
        if (stats.savedPercent > 0) {
          this.statusBarItem.text = `$(zap) ~${stats.jsonTokens} tokens (TOON: -${stats.savedPercent}%)`;
        } else {
          this.statusBarItem.text = `$(zap) ~${stats.jsonTokens} tokens`;
        }
        this.statusBarItem.show();
        return;
      }
    } catch {
      // Ignore calculation errors for active editing
    }

    this.statusBarItem.hide();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
