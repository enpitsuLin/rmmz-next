import ts from 'typescript'

export function collectReference(sourceText, roots, ignored = new Set()) {
  const input = '/reference.js'
  const file = ts.createSourceFile(input, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const host = ts.createCompilerHost({ allowJs: true, noResolve: true, noLib: true })
  host.getSourceFile = name => name === input ? file : undefined
  host.fileExists = name => name === input
  host.readFile = name => name === input ? sourceText : undefined
  const checker = ts.createProgram([input], { allowJs: true, noResolve: true, noLib: true }, host).getTypeChecker()
  const declarations = new Map(), symbols = new Map(), selected = new Set()
  for (const node of file.statements) {
    const entries = ts.isVariableStatement(node) ? node.declarationList.declarations : [node]
    for (const entry of entries) if (entry.name && ts.isIdentifier(entry.name)) {
      declarations.set(entry.name.text, entry)
      symbols.set(checker.getSymbolAtLocation(entry.name), entry)
    }
  }
  function include(entry) {
    if (!entry || selected.has(entry)) return
    selected.add(entry)
    const visit = node => {
      if (ts.isIdentifier(node) && !ignored.has(node.text)) {
        const dependency = symbols.get(checker.getSymbolAtLocation(node))
        if (dependency) include(dependency)
      }
      ts.forEachChild(node, visit)
    }
    visit(entry)
  }
  for (const name of roots) include(declarations.get(name))
  return [...selected].sort((a, b) => a.pos - b.pos).map(node => ts.isVariableDeclaration(node) ? `const ${node.getText(file)};` : node.getText(file)).join('\n')
}
