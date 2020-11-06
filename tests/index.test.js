const test = require('ava')
const babel = require('@babel/core')

const plugin = require('../src/index')

const entries = [
  "<Text style={{ color: 'red' }}>Big brown fox</Text>;const styles = StyleSheet.create({});",
  "<Text style={[styles.text, { color: 'red' }]}>Big brown fox</Text>;const styles = StyleSheet.create({ text: { fontSize: 20 } });",
]

const expected = [
  "<Text style={styles.Text_style}>Big brown fox</Text>;const styles = StyleSheet.create({ Text_style: { color: 'red' }});",
  "<Text style={[styles.text, styles.Text_style]}>Big brown fox</Text>;const styles = StyleSheet.create({ text: { fontSize: 20 }, Text_style: { color: 'red' }});",
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
