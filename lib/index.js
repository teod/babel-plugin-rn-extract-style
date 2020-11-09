const validStyleProps = ['alignContent', 'alignItems', 'alignSelf', 'aspectRatio', 'backfaceVisibility', 'backgroundColor', 'borderBottomColor', 'borderBottomEndRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'borderBottomStartRadius', 'borderBottomWidth', 'borderColor', 'borderEndColor', 'borderEndWidth', 'borderLeftColor', 'borderLeftWidth', 'borderRadius', 'borderRightColor', 'borderRightWidth', 'borderStartColor', 'borderStartWidth', 'borderStyle', 'borderTopColor', 'borderTopEndRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderTopStartRadius', 'borderTopWidth', 'borderWidth', 'bottom', 'color', 'decomposedMatrix', 'direction', 'display', 'elevation', 'end', 'flex', 'flexBasis', 'flexDirection', 'flexGrow', 'flexShrink', 'flexWrap', 'fontFamily', 'fontSize', 'fontStyle', 'fontVariant', 'fontWeight', 'height', 'includeFontPadding', 'justifyContent', 'left', 'letterSpacing', 'lineHeight', 'margin', 'marginBottom', 'marginEnd', 'marginHorizontal', 'marginLeft', 'marginRight', 'marginStart', 'marginTop', 'marginVertical', 'maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'opacity', 'overflow', 'overlayColor', 'padding', 'paddingBottom', 'paddingEnd', 'paddingHorizontal', 'paddingLeft', 'paddingRight', 'paddingStart', 'paddingTop', 'paddingVertical', 'position', 'resizeMode', 'right', 'rotation', 'scaleX', 'scaleY', 'shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'start', 'textAlign', 'textAlignVertical', 'textDecorationColor', 'textDecorationLine', 'textDecorationStyle', 'textShadowColor', 'textShadowOffset', 'textShadowRadius', 'textTransform', 'tintColor', 'top', 'transform', 'transformMatrix', 'translateX', 'translateY', 'width', 'writingDirection', 'zIndex'];

const handleStyleSheetImport = (t, path) => {
  let styleSheetFound = false;
  let reactNativeImportIdx = null;
  let styleSheetImportName = 'StyleSheet';
  let hasCommonJSImports = false;
  let hasES6Import = false;
  path.node.body.forEach((n, idx) => {
    if (n.type === 'ImportDeclaration') {
      if (n.importKind === 'value') {
        hasES6Import = true;
      }

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

        if (!specifier.imported && specifier.local) {
          if (specifier.local.name === 'StyleSheet') {
            styleSheetFound = true;
          }
        }
      });
    }

    if (n.type === 'VariableDeclaration') {
      n.declarations.forEach(declaration => {
        if (declaration.init) {
          if (declaration.init.callee) {
            if (declaration.init.callee.name === 'require') {
              hasCommonJSImports = true;

              if (declaration.id) {
                if (declaration.id.name === 'StyleSheet') {
                  styleSheetFound = true;
                }
              }
            }
          }
        }
      });
    }
  });

  if (hasCommonJSImports && !hasES6Import) {
    return '';
  }

  if (!styleSheetFound) {
    // react-native import found
    if (reactNativeImportIdx !== null) {
      path.node.body[reactNativeImportIdx].specifiers.push(t.importSpecifier(t.identifier('StyleSheet'), t.identifier('StyleSheet')));
    } else {
      // create es6 import
      path.node.body.unshift(t.importDeclaration([t.importSpecifier(t.identifier('StyleSheet'), t.identifier('StyleSheet'))], t.stringLiteral('react-native')));
    }
  }

  return styleSheetImportName;
};

const checkForApprovedProperties = properties => {
  const isValidStyleProp = properties.some(({
    key
  }) => validStyleProps.includes(key.name));
  const isComputed = properties.some(({
    value
  }) => value.type === 'ConditionalExpression' || value.type === 'Identifier' || value.type === 'CallExpression' || value.type === 'ArrayExpression' || value.type === 'LogicalExpression');
  return isValidStyleProp && !isComputed;
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
  const styleDeclarator = t.variableDeclaration('const', [t.variableDeclarator(t.identifier('babelGeneratedStyles'), t.callExpression(t.memberExpression(t.identifier(styleSheetImportName), t.identifier('create')), [t.objectExpression([])]))]);
  path.node.body.push(styleDeclarator);
  return 'babelGeneratedStyles';
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
              if (checkForApprovedProperties(properties)) {
                const styleName = addToStylesMap(path, elementName, properties); // update the style attribute

                path.node.attributes[styleAttributeIdx] = t.jSXAttribute(t.jSXIdentifier('style'), t.jSXExpressionContainer(t.memberExpression(t.identifier(styleVarName), t.identifier(styleName))));
              }
            } // handle the case when style is an array of styles


            if (Array.isArray(elements)) {
              elements.forEach((node, idx) => {
                if (node.type === 'ObjectExpression') {
                  if (Array.isArray(node.properties)) {
                    if (checkForApprovedProperties(node.properties)) {
                      const styleName = addToStylesMap(path, elementName, node.properties);
                      const styleObj = t.memberExpression(t.identifier(styleVarName), t.identifier(styleName));
                      path.node.attributes[styleAttributeIdx].value.expression.elements[idx] = styleObj;
                    }
                  }
                }
              });
            }
          }
        }

      },
      VariableDeclarator: {
        enter(path) {
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
        }

      }
    };
  };

  return {
    visitor: {
      Program: {
        enter(path, state) {
          if (this.file.opts.filename) {
            const includeNodeModules = Boolean(state.opts && state.opts.includeNodeModules); // ignore node modules if includeNodeModules opt not specified as true

            if (this.file.opts.filename.match(/node_modules/) !== null && !includeNodeModules) {
              return;
            } // ignore react-native for web specific files


            const fileName = this.file.opts.filename.replace(/^.*[\\\/]/, '');
            const isRNWebFile = fileName.match(/web.js/) !== null || fileName.match(/web.ts/) !== null;

            if (isRNWebFile) {
              return;
            }
          } // check if file has jsx


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

          const styleSheetImportName = handleStyleSheetImport(t, path); // commonjs not supported yet

          if (!styleSheetImportName) {
            return;
          } // check if file already has StyleSheet declaration


          let styleVarName = getStyleVarName(path); // create stylesheet object

          if (!styleVarName) {
            styleVarName = createStyleSheet(path, t, styleSheetImportName);
          } // traverse and move the inline styles to StyleSheet


          path.traverse(traverseJSXOpeningElement(styleVarName || 'styles', styleSheetImportName));
        }

      }
    }
  };
};