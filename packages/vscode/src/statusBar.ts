import * as vscode from 'vscode';
import { calculateTokenStats } from 'bracer';

const JSON_LANGUAGES = ['json', 'jsonc'];
const DEBOUNCE_MS = 300;
/** Larger documents skip live counting to keep typing responsive. */
const MAX_CHARS = 1_000_000;

export class TokenStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'bracer.optimizeTokens';

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) this.schedule();
      })
    );
    this.update();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.update(), DEBOUNCE_MS);
  }

  public update(): void {
    clearTimeout(this.timer);
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc || !JSON_LANGUAGES.includes(doc.languageId)) {
      this.item.hide();
      return;
    }

    const text = doc.getText();
    if (text.trim().length === 0) {
      this.item.hide();
      return;
    }
    if (text.length > MAX_CHARS) {
      this.item.text = '$(symbol-number) Tokens: file too large';
      this.item.tooltip = 'Bracer skips live token counting for files over 1 MB.';
      this.item.show();
      return;
    }

    const stats = calculateTokenStats(text);
    if (stats.jsonTokens === 0) {
      this.item.hide();
      return;
    }

    const approx = stats.tokenizer === 'estimate' ? '~' : '';
    this.item.text =
      stats.savedPercent > 0
        ? `$(symbol-number) ${approx}${stats.jsonTokens} tokens (TOON −${stats.savedPercent}%)`
        : `$(symbol-number) ${approx}${stats.jsonTokens} tokens`;
    this.item.tooltip = new vscode.MarkdownString(
      [
        `**Bracer token counts** (${stats.tokenizer === 'o200k_base' ? 'o200k_base, exact' : 'estimate'})`,
        '',
        `| Format | Tokens |`,
        `| :-- | --: |`,
        `| JSON (formatted) | ${stats.jsonTokens} |`,
        `| JSON (minified) | ${stats.minifiedTokens} |`,
        `| YAML | ${stats.yamlTokens} |`,
        `| TOON | ${stats.toonTokens} |`,
        '',
        'Click to copy the TOON version.',
      ].join('\n')
    );
    this.item.show();
  }

  public dispose(): void {
    clearTimeout(this.timer);
    this.item.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
