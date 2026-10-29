import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { filterExplorerGroups } from './explorerModel';

// Read the dashboard's actual catalogue rather than keeping a second copy in tests.
const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name: string): string {
  for (const statement of ast.statements) {
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find(item => item.name.getText(ast) === name);
      if (declaration?.initializer) return declaration.initializer.getText(ast);
    }
  }
  throw new Error(`Missing catalogue declaration ${name}`);
}
const categories = vm.runInNewContext(`(${initializer('navigationCategories')})`) as Record<string, { zh: string; en: string; description: { zh: string; en: string } }>;
const modules = vm.runInNewContext(`(${initializer('dashboardModules')})`) as Array<{ tab: number; category: string; label: { zh: string; en: string }; keywords: string[] }>;
const groups = Object.entries(categories).map(([id, category]) => ({
  id, title: category.en, description: category.description.en,
  items: modules.filter(module => module.category === id).map(module => ({ id: module.tab, label: module.label.en, keywords: [module.label.zh, module.label.en, ...module.keywords].join(' ') })),
}));

test('all five bilingual groups cover each existing dashboard target exactly once', () => {
  assert.deepEqual(Object.keys(categories), ['market', 'land', 'city', 'services', 'tools']);
  for (const category of Object.values(categories)) {
    assert.ok(category.zh && category.en && category.description.zh && category.description.en);
  }
  assert.ok(groups.every(group => group.items.length > 0));
  assert.ok(modules.every(module => module.label.zh && module.label.en && categories[module.category]));
  const ids = Array.from(modules, module => module.tab);
  assert.equal(new Set(ids).size, ids.length);
  // The render branches are the existing navigation contract; tab 23 is intentionally absent.
  const main = source.slice(source.indexOf('<main ref={dashboardMainRef}'), source.indexOf('</main>', source.indexOf('<main ref={dashboardMainRef}')));
  const rendered = [...main.matchAll(/tab\s*===\s*(\d+)\s*&&/g)].map(match => Number(match[1]));
  assert.deepEqual(ids.sort((a, b) => a - b), rendered.sort((a, b) => a - b));
  assert.equal(modules.find(module => module.tab === 39)?.label.en, 'Data Status & Coverage');
});

test('search matches either language and keywords, scopes selection, and preserves input', () => {
  const original = JSON.stringify(groups);
  assert.deepEqual(filterExplorerGroups(groups, null, '  URBAN RENEWAL  ').flatMap(group => group.items).map(item => item.id).sort((a, b) => a - b), [40, 46]);
  assert.deepEqual(filterExplorerGroups(groups, null, '都更').flatMap(group => group.items).map(item => item.id), [46]);
  assert.deepEqual(filterExplorerGroups(groups, 'market', 'urban renewal').flatMap(group => group.items), []);
  assert.equal(filterExplorerGroups(groups, null, 'no such dataset').flatMap(group => group.items).length, 0);
  assert.equal(filterExplorerGroups(groups, null, '').flatMap(group => group.items).length, modules.length);
  assert.equal(JSON.stringify(groups), original);
});
