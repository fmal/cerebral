'use strict'
module.exports = function (fileInfo, api) {
  const j = api.jscodeshift
  const root = j(fileInfo.source)

  const operatorsImport = root.find(j.ImportDeclaration, {
    source: {
      value: 'cerebral/operators'
    }
  })

  if (!operatorsImport.length) {
    return null
  }

  let addState = false
  let addInput = false

  // Generates an operator factory like so:
  // operatorName`path`
  function generateOperator (operatorName, path) {
    if (operatorName === 'state') {
      addState = true
    }
    if (operatorName === 'input') {
      addInput = true
    }

    return j.taggedTemplateExpression(
      j.identifier(operatorName),
      j.templateLiteral(
        [j.templateElement({
          cooked: path,
          raw: path
        }, false)],
        []
      )
    )
  }

  operatorsImport.find(j.ImportSpecifier)
    .forEach(function (spec) {
      const node = spec.get(0).node
      const importedName = node.imported.name

      if (importedName === 'delay') {
        node.imported.name = 'wait'
      }

      root.find(j.CallExpression, {
        callee: {
          name: importedName
        }
      })
      .map(function (operator) {
        const node = operator.get(0).node

        if (importedName === 'copy') {
          // Copy has been replaced with set
          node.callee.name = 'set'

          // Because you are setting the value, the logical order of
          // operations is reversed
          node.arguments = node.arguments.reverse()
        }

        if (importedName === 'delay') {
          node.callee.name = 'wait'
          node.arguments = node.arguments.slice(0, 1)
        }

        node.arguments = node.arguments.map((args, index) => {
          if (typeof args.value !== 'string') {
            return args
          }

          const parts = args.value.split(':')

          if (index > 0 && importedName !== 'copy') {
            return args
          }

          let operatorName = parts[0]
          let path = parts[1]
          if (!path) {
            operatorName = 'state'
            path = args.value
          }

          if (operatorName === 'output') {
            // "output" has now been changed to "input"
            operatorName = 'input'
          }

          return generateOperator(operatorName, path)
        })

        return operator
      })

      return spec
    })

  // Remove copy operator
  operatorsImport.find(j.ImportSpecifier, { imported: { name: 'copy' } }).remove()

  const specifiers = operatorsImport.get().value.specifiers

  // Add the state import if it's been used
  if (addState) {
    specifiers.push(j.importSpecifier(j.identifier('state')))
  }

  // Add the input import if it's been used
  if (addInput) {
    specifiers.push(j.importSpecifier(j.identifier('input')))
  }

  operatorsImport.find(j.ImportSpecifier, { imported: { name: 'copy' } })

  return root.toSource()
}
