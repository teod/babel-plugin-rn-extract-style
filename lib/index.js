const checkHasStyle = path => path.node.body.some(n => {
  if (n.type === 'VariableDeclaration') {
    return n.declarations.some(declaration => {
      if (declaration.init) {
        if (declaration.init.callee) {
          if (declaration.init.callee.object) {
            return declaration.init.callee.object.name === 'StyleSheet';
          }
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

  const traverseJSXOpeningElement = () => {
    const stylesMap = {};

    const addToStylesMap = (path, elementName, properties) => {
      const {
        name: uid
      } = path.scope.generateUidIdentifier('style');
      const styleName = `${elementName}${uid}`;
      stylesMap[styleName] = properties;
      return styleName;
    };

    return {
      JSXOpeningElement: {
        enter(path) {
          try {
            const elementName = path.node.name.name; //get the style attribute

            const attributes = path.node.attributes;
            let styleAttributeIdx = 0;
            const styleAttribute = attributes.find((attribute, idx) => {
              if (attribute.name) {
                if (attribute.name.name) {
                  if (attribute.name.name === 'style') {
                    styleAttributeIdx = idx;
                    return true;
                  }
                }
              }
            }); // extract the styles properties

            if (styleAttribute) {
              const {
                value: {
                  expression: {
                    properties,
                    elements
                  }
                }
              } = styleAttribute;

              if (Array.isArray(properties)) {
                const styleName = addToStylesMap(path, elementName, properties); // update the style attribute

                path.node.attributes[styleAttributeIdx] = t.jSXAttribute(t.jSXIdentifier('style'), t.jSXExpressionContainer(t.memberExpression(t.identifier('styles'), t.identifier(styleName))));
              } // handle the case when style is an array of styles


              if (Array.isArray(elements)) {
                elements.forEach((node, idx) => {
                  if (node.type === 'ObjectExpression') {
                    if (Array.isArray(node.properties)) {
                      const styleName = addToStylesMap(path, elementName, node.properties);
                      const styleObj = t.memberExpression(t.identifier('styles'), t.identifier(styleName));
                      path.node.attributes[styleAttributeIdx].value.expression.elements[idx] = styleObj;
                    }
                  }
                });
              }
            }
          } catch (err) {
            console.info(err);
          }
        }

      },
      VariableDeclarator: {
        enter(path) {
          // enter styles declaration
          if (path.node.init) {
            if (path.node.init.callee) {
              if (path.node.init.callee.object && path.node.init.callee.property) {
                if (path.node.init.callee.object.name === 'StyleSheet' && path.node.init.callee.property.name === 'create') {
                  // add the styles to the StyleSheet object
                  const newStyles = Object.entries(stylesMap).map(([key, value]) => {
                    return t.objectProperty(t.identifier(key), t.objectExpression(value));
                  });
                  path.node.init.arguments[0].properties.push(...newStyles);
                }
              }
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
          // check if file has jsx
          let hasJSX = false;
          path.traverse({
            JSXElement: {
              enter() {
                hasJSX = true;
              }

            }
          });

          if (!hasJSX) {
            return;
          } // check if file already has StyleSheet declaration


          const hasStyle = checkHasStyle(path); // create stylesheet object

          if (!hasStyle) {
            createStyleSheet(path, t);
          } // traverse and move the inline styles to StyleSheet


          path.traverse(traverseJSXOpeningElement());
        }

      }
    }
  };
};