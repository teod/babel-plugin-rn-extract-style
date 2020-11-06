# Babel plugin for extracting react native inline styles to StyleSheet.create

[![npm version](https://img.shields.io/npm/v/babel-plugin-rn-extract-style.svg?style=flat-square)](https://www.npmjs.com/package/babel-plugin-rn-extract-style)

[Description](#description) | [Install](#install) | [Usage](#usage) | [How it works ?](#how-it-works)

## Description

This babel plugin will extract any inline styles to the `StyleSheet.create` object in a react native application.

## Why it's important to have styles inside `StyleSheet.create` ?

The React Native `StyleSheet` creates immutable stylesheet references.
The style objects passed into the `create()` method are freezed and an ID is assigned to each one of them.
This will avoid creating a new style objecct every render pass.
It also allows to send the style only once through the bridge.

## Install

<i>npm:</i>

```sh
npm install --save-dev babel-plugin-rn-extract-style
```

<i>yarn:</i>

```sh
yarn add babel-plugin-rn-extract-style --dev
```

## Usage

<b>babel.config.js</b>
```js
module.exports = {
  plugins: [
    'rn-extract-style'
  ]
}
```

## How it works

The plugin parses the contents of each JSX Element and extract the inline styles, generates an uniquie uid for it and appends it to the `StyleSheet.create` object found in the file. In case of a missing `StyleSheet.create` instance it generates a new one.

<b>in:</b>
```javascript
const MyComp = () => (
  <View
    style={{
      height: 500,
      width: '100%',
      backgroundColor: '#6c5b7b',
    }}>
    <Text style={[{ color: '#f8b195' }]}>My little react component</Text>
  </View>
)

const styles = StyleSheet.create({})
```
<b>out:</b>
```javascript
const MyComp = () => (
  <View
    style={styles.View_style}>
    <Text style={styles.Text_style1}>My little react component</Text>
  </View>
)

const styles = StyleSheet.create({
  View_style: {
    height: 500,
    width: '100%',
    backgroundColor: '#6c5b7b',
  },
  Text_style1: {
    color: '#f8b195',
  },
})
```
