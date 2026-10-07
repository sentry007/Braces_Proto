// Loads the bundled extension (dist/extension.js) against a stubbed `vscode`
// API and exercises its commands. Proves the bundle needs nothing beyond the
// VS Code API at runtime, which is what the .vsix ships.
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const manifest = require('../package.json');

// --- Minimal vscode stub -----------------------------------------------------

const commands = new Map();
const opened = [];
const messages = [];
const statusBar = { text: '', visible: false };
let activeEditor = null;

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

function makeEditor(languageId, initialText) {
  const doc = {
    languageId,
    version: 1,
    text: initialText,
    getText() {
      return this.text;
    },
    positionAt(offset) {
      return offset;
    },
    uri: { toString: () => 'untitled:test' },
  };
  return {
    document: doc,
    selection: { isEmpty: true },
    async edit(cb) {
      cb({
        replace: (_range, value) => {
          doc.text = value;
          doc.version++;
        },
      });
      return true;
    },
  };
}

const noop = { dispose() {} };
const vscodeStub = {
  Range,
  StatusBarAlignment: { Left: 1, Right: 2 },
  DiagnosticSeverity: { Error: 0 },
  CodeActionKind: { QuickFix: { value: 'quickfix' } },
  CodeAction: class {
    constructor(title) {
      this.title = title;
    }
  },
  WorkspaceEdit: class {
    replace() {}
  },
  MarkdownString: class {
    constructor(value) {
      this.value = value;
    }
  },
  window: {
    get activeTextEditor() {
      return activeEditor;
    },
    createStatusBarItem: () => ({
      set text(v) {
        statusBar.text = v;
      },
      get text() {
        return statusBar.text;
      },
      show() {
        statusBar.visible = true;
      },
      hide() {
        statusBar.visible = false;
      },
      dispose() {},
    }),
    onDidChangeActiveTextEditor: () => noop,
    showInformationMessage: (m) => messages.push(['info', m]),
    showErrorMessage: (m) => messages.push(['error', m]),
    showTextDocument: async () => {},
  },
  workspace: {
    onDidChangeTextDocument: () => noop,
    openTextDocument: async (opts) => {
      opened.push(opts);
      return opts;
    },
  },
  languages: { registerCodeActionsProvider: () => noop },
  commands: {
    registerCommand: (id, fn) => {
      commands.set(id, fn);
      return noop;
    },
  },
  env: { clipboard: { text: '', writeText: async (t) => (vscodeStub.env.clipboard.text = t) } },
};

const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  return request === 'vscode' ? vscodeStub : originalLoad.call(this, request, ...rest);
};

const SAMPLE = '{"users":[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]}';
let extension;

before(async () => {
  activeEditor = makeEditor('json', SAMPLE);
  extension = require(path.resolve(__dirname, '../dist/extension.js'));
  extension.activate({ subscriptions: [] });
  // Activation loads the exact tokenizer in the background, then refreshes the status bar
  for (let i = 0; i < 100 && statusBar.text.includes('~'); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
});

describe('activation', () => {
  it('registers every command declared in package.json', () => {
    const declared = manifest.contributes.commands.map((c) => c.command).sort();
    assert.deepEqual([...commands.keys()].sort(), declared);
  });

  it('shows exact token counts in the status bar for JSON', () => {
    assert.equal(statusBar.visible, true);
    assert.equal(statusBar.text, '$(symbol-number) 45 tokens (TOON −58%)');
  });
});

describe('commands', () => {
  it('converts to TOON in a new tab without touching the source file', async () => {
    activeEditor = makeEditor('json', SAMPLE);
    opened.length = 0;
    await commands.get('bracer.convertToTOON')();
    assert.equal(opened.length, 1);
    assert.equal(opened[0].content, 'users[2]{id,name}:\n  1,Alice\n  2,Bob');
    assert.equal(activeEditor.document.text, SAMPLE);
  });

  it('opens YAML conversions with the yaml language', async () => {
    opened.length = 0;
    await commands.get('bracer.convertToYAML')();
    assert.equal(opened[0].language, 'yaml');
  });

  it('repairs broken JSON in place', async () => {
    activeEditor = makeEditor('json', "{name: 'Ada', tags: ['x',],}");
    await commands.get('bracer.repairJSON')();
    assert.deepEqual(JSON.parse(activeEditor.document.text), { name: 'Ada', tags: ['x'] });
  });

  it('generates TypeScript into a new tab', async () => {
    activeEditor = makeEditor('json', SAMPLE);
    opened.length = 0;
    await commands.get('bracer.generateTypeScript')();
    assert.equal(opened[0].language, 'typescript');
    assert.match(opened[0].content, /export interface/);
  });

  it('copies TOON to the clipboard', async () => {
    activeEditor = makeEditor('json', SAMPLE);
    await commands.get('bracer.optimizeTokens')();
    assert.equal(vscodeStub.env.clipboard.text, 'users[2]{id,name}:\n  1,Alice\n  2,Bob');
  });

  it('reports invalid JSON as an error message instead of throwing', async () => {
    activeEditor = makeEditor('json', '{oops');
    messages.length = 0;
    await commands.get('bracer.convertToYAML')();
    assert.equal(messages[0][0], 'error');
  });
});

describe('manifest', () => {
  it('only offers commands in JSON files', () => {
    const { menus } = manifest.contributes;
    for (const entry of [...menus['editor/context'], ...menus.commandPalette]) {
      assert.equal(entry.when, 'editorLangId == json || editorLangId == jsonc', entry.command);
    }
  });

  it('has the fields the Marketplace and Open VSX require', () => {
    for (const field of ['publisher', 'license', 'repository', 'icon', 'displayName', 'description']) {
      assert.ok(manifest[field], field);
    }
  });
});
