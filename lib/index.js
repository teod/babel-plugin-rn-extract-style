const handleStyleSheetImport = (t, path) => {
  let styleSheetFound = false;
  let reactNativeImportIdx = null;
  let styleSheetImportName = 'StyleSheet';
  path.node.body.forEach((n, idx) => {
    if (n.type === 'ImportDeclaration') {
      if (n.source.value === 'react-native') {
        reactNativeImportIdx = idx;
      }

      n.specifiers.forEach(specifier => {
        if (specifier.imported && specifier.local) {
          if (specifier.imported.name === 'StyleSheet' || specifier.local.name === 'StyleSheet') {
            styleSheetFound = true; // get local identifier in case of aliasing

            styleSheetImportName = specifier.local.name;
          }
        }
      });
    }
  });

  if (!styleSheetFound) {
    // react-native import found
    if (reactNativeImportIdx !== null) {
      path.node.body[reactNativeImportIdx].specifiers.push(t.importSpecifier(t.identifier('StyleSheet'), t.identifier('StyleSheet')));
    } else {
      path.node.body.unshift(t.importDeclaration([t.importSpecifier(t.identifier('StyleSheet'), t.identifier('StyleSheet'))], t.stringLiteral('react-native')));
    }
  }

  return styleSheetImportName;
};

const getStyleVarName = path => {
  let styleVarName = '';
  path.node.body.forEach(n => {
    if (n.type === 'VariableDeclaration') {
      return n.declarations.forEach(declaration => {
        if (declaration.init) {
          if (declaration.init.callee) {
            if (declaration.init.callee.object) {
              if (declaration.init.callee.object.name === 'StyleSheet') {
                styleVarName = declaration.id.name;
              }
            }
          }
        }
      });
    }
  });
  return styleVarName;
};

const createStyleSheet = (path, t, styleSheetImportName = 'StyleSheet') => {
  const styleDeclarator = t.variableDeclaration('const', [t.variableDeclarator(t.identifier('styles'), t.callExpression(t.memberExpression(t.identifier(styleSheetImportName), t.identifier('create')), [t.objectExpression([])]))]);
  path.node.body.push(styleDeclarator);
};

module.exports = function (_ref) {
  const t = _ref.types;

  const traverseJSXOpeningElement = (styleVarName, styleSheetImportName) => {
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

                path.node.attributes[styleAttributeIdx] = t.jSXAttribute(t.jSXIdentifier('style'), t.jSXExpressionContainer(t.memberExpression(t.identifier(styleVarName), t.identifier(styleName))));
              } // handle the case when style is an array of styles


              if (Array.isArray(elements)) {
                elements.forEach((node, idx) => {
                  if (node.type === 'ObjectExpression') {
                    if (Array.isArray(node.properties)) {
                      const styleName = addToStylesMap(path, elementName, node.properties);
                      const styleObj = t.memberExpression(t.identifier(styleVarName), t.identifier(styleName));
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
          try {
            // enter styles declaration
            if (path.node.init) {
              if (path.node.init.callee) {
                if (path.node.init.callee.object && path.node.init.callee.property) {
                  if (path.node.init.callee.object.name === styleSheetImportName && path.node.init.callee.property.name === 'create') {
                    // add the styles to the StyleSheet object
                    const newStyles = Object.entries(stylesMap).map(([key, value]) => {
                      return t.objectProperty(t.identifier(key), t.objectExpression(value));
                    });

                    if (!path.node.init.arguments[0]) {
                      // handle StyleSheet.create() without arguments
                      path.node.init.arguments.push(t.objectExpression([]));
                    } // push the styles to properties


                    path.node.init.arguments[0].properties.push(...newStyles);
                  }
                }
              }
            }
          } catch (err) {
            console.info(err);
          }
        }

      }
    };
  };

  return {
    visitor: {
      Program: {
        enter(path) {
          try {
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
            }

            const styleSheetImportName = handleStyleSheetImport(t, path); // check if file already has StyleSheet declaration

            const styleVarName = getStyleVarName(path); // create stylesheet object

            if (!styleVarName) {
              createStyleSheet(path, t, styleSheetImportName);
            } // traverse and move the inline styles to StyleSheet


            path.traverse(traverseJSXOpeningElement(styleVarName || 'styles', styleSheetImportName));
          } catch (err) {
            console.info(err);
          }
        }

      }
    }
  };
};