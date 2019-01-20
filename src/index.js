module.exports = function({types: t}, {attribute = 'qa'}) {
  const attr = `data-${attribute}`;

  const addDataAttribute = (JSXNode, componentName, forceRename = false) => {
    const {openingElement} = JSXNode;
    
    if (!t.isJSXIdentifier(openingElement.name, {name: 'Fragment'})) {
      const dataAttribute = openingElement.attributes.find((attr) => t.isJSXIdentifier(attr.name, attr));

      if (!dataAttribute) {
        openingElement.attributes.push(t.JSXAttribute(t.JSXIdentifier(attr), t.stringLiteral(componentName)));
      }
    }
  }

  const returnVisitor = {
    ReturnStatement(path) {
      const {node: {argument}} = path;

      if (t.isJSXElement(argument)) {
        addDataAttribute(argument, this.componentName, this.forceRename);
      }
    }
  }

  const renderVisitor = {
    ClassMethod(path) {
      if (t.isIdentifier(path.node.key, {name: 'render'})) {
        path.traverse(returnVisitor, {componentName: this.componentName});
      }
    }
  }

  const arrowFunctionVisitor = (path, componentName, forceRename = false) => {
    const {node: {body}} = path;
    
    if (t.isJSXElement(body)) {
      addDataAttribute(body, componentName, forceRename);
    } else {
      path.traverse(returnVisitor, {componentName, forceRename});
    }
  }

  return {
    visitor: {
      Class(path, {file}) {
        if (!path.node.superClass) {
          return;
        }

        if (t.isIdentifier(path.node.superClass, {name: 'Component'}) || t.isIdentifier(path.node.superClass, {name: 'PureComponent'})) {
          const componentName = path.node.id.name;

          path.traverse(renderVisitor, {componentName});
        }
      },
      FunctionDeclaration(path) {
        const componentName = path.node.id.name;

        path.traverse(returnVisitor, {componentName});
      },
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee, {name: 'memo'})) {
          if (t.isArrowFunctionExpression(path.node.arguments[0])) {
            if (t.isVariableDeclarator(path.parent)) {
              const componentName = path.parent.id.name;

              path.traverse({
                ArrowFunctionExpression(path) {
                  arrowFunctionVisitor(path, componentName, true);
                }
              });
            }
          }
        }
      },
      ArrowFunctionExpression(path) {
        if (t.isVariableDeclarator(path.parent)) {
          const componentName = path.parent.id.name;

          arrowFunctionVisitor(path, componentName);
        }
      }
    }
  }
}