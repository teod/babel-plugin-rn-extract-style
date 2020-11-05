const checkHasStyle = path => path.node.body.some(n => {
  if (n.type === 'VariableDeclaration') {
    return n.declarations.some(declaration => {
      if (declaration.init) {
        if (declaration.init.callee) {
          return declaration.init.callee.object.name === 'StyleSheet';
        }
      }
    });
  }
});

const createStyleSheet = (path, t) => {
  const styleDeclarator = t.variableDeclaration('const', [t.variableDeclarator(t.identifier('styles'), t.callExpression(t.memberExpression(t.identifier('StyleSheet'), t.identifier('create')), [t.objectExpression([])]))]);
  path.node.body.push(styleDeclarator);
};

module.exports = function (_ref) {
  const t = _ref.types;

  const traverseJSXOpeningElement = hasStyle => {
    const stylesMap = {};
    return {
      JSXOpeningElement: {
        enter(path) {
          try {
            const elementName = path.node.name.name; //get the style attribute

            const attributes = path.node.attributes;
            const styleAttribute = attributes.find(({
              name: {
                name
              }
            }) => name === 'style'); // extract the styles properties

            if (styleAttribute) {
              const {
                value: {
                  expression: {
                    properties
                  }
                }
              } = styleAttribute;
              const {
                name: uid
              } = path.scope.generateUidIdentifier('style');
              const styleName = `${elementName}${uid}`;
              stylesMap[styleName] = properties; // update the style attribute

              path.node.attributes.forEach((attribute, idx) => {
                const {
                  name: {
                    name
                  }
                } = attribute;

                if (name === 'style') {
                  path.node.attributes[idx] = t.jSXAttribute(t.jSXIdentifier('style'), t.jSXExpressionContainer(t.memberExpression(t.identifier('styles'), t.identifier(styleName))));
                }
              });
            }
          } catch (err) {
            console.info(err);
          }
        }

      },
      VariableDeclarator: {
        enter(path) {
          // enter styles declaration
          if (path.node.init.callee) {
            if (path.node.init.callee.object.name === 'StyleSheet') {
              // add the styles to the StyleSheet object
              const newStyles = Object.entries(stylesMap).map(([key, value]) => {
                return t.objectProperty(t.identifier(key), t.objectExpression(value));
              });
              path.node.init.arguments[0].properties.push(...newStyles);
            }
          }
        }

      }
    };
  };

  return {
    visitor: {
      Program: {
        enter(path) {
          // check if file already has StyleSheet declaration
          const hasStyle = checkHasStyle(path); // create stylesheet object

          if (!hasStyle) {
            createStyleSheet(path, t);
          } // traverse and move the inline styles to StyleSheet


          path.traverse(traverseJSXOpeningElement(hasStyle));
        }

      }
    }
  };
};