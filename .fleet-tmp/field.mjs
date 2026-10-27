// Usage: node field.mjs <name> <version> <field>
const [name, version, field] = process.argv.slice(2)
const d = await (await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}/${version}`)).json()
console.log(name, version, field, JSON.stringify(d[field], null, 1))
