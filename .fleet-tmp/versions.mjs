// Usage: node versions.mjs <name> <majorPrefixRegex>
const [name, re] = process.argv.slice(2)
const d = await (await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`)).json()
const pattern = new RegExp(re)
console.log(d['dist-tags'])
for (const v of Object.keys(d.versions).filter(v => pattern.test(v))) console.log(v, d.time[v], d.versions[v].deprecated ?? '')
