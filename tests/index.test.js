const test = require('ava')
const babel = require('@babel/core')

const plugin = require('../src/index')

const entries = [
  "<Text style={{ color: 'red' }}>Big brown fox</Text>;const styles = StyleSheet.create({});",
  "<Text style={[styles.text, { color: 'red' }]}>Big brown fox</Text>;const styles = StyleSheet.create({ text: { fontSize: 20 } });",
  "<Text style={{ color: 'red' }}>Big brown fox</Text>;const customStyles = StyleSheet.create({});",
  "<Text style={{ color: 'red' }}>Big brown fox</Text>;const styles = StyleSheet.create();",
  "<Text style={{ color: 'red' }}>Big brown fox</Text>;",
]

const expected = [
  'import { StyleSheet } from "react-native";<Text style={styles.Text_style}>Big brown fox</Text>;const styles = StyleSheet.create({ Text_style: { color: \'red\' }});',
  'import { StyleSheet } from "react-native";<Text style={[styles.text, styles.Text_style]}>Big brown fox</Text>;const styles = StyleSheet.create({ text: { fontSize: 20 }, Text_style: { color: \'red\' }});',
  'import { StyleSheet } from "react-native";<Text style={customStyles.Text_style}>Big brown fox</Text>;const customStyles = StyleSheet.create({ Text_style: { color: \'red\' }});',
  'import { StyleSheet } from "react-native";<Text style={styles.Text_style}>Big brown fox</Text>;const styles = StyleSheet.create({ Text_style: { color: \'red\' }});',
  'import { StyleSheet } from "react-native";<Text style={babelGeneratedStyles.Text_style}>Big brown fox</Text>;const babelGeneratedStyles = StyleSheet.create({ Text_style: { color: \'red\' }});',
]

test('plugin', (t) => {
  entries.forEach((entry, idx) => {
    const transformed = babel.transform(entry, {
      plugins: [plugin],
    })

    t.is(
      transformed.code
        .replace(/(\r\n|\n|\r)/gm, '')
        .replace(/\s{2,}/g, ' ')
        .trim(),
      expected[idx],
    )
  })
})
