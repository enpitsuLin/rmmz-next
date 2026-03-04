import fs from 'node:fs'
import { join } from 'node:path'

const __dirname = import.meta.dirname

const content = fs.readFileSync(join(__dirname, 'src/scenes/index.ts'), 'utf8')

const lines = content.split('\n')

const collections = new Map()

const curFile = []
for (const line of lines) {
  if (line.startsWith('//-----------------------------------------------------------------------------')) {
    if (curFile.length > 0) {
      collections.set(curFile.at(1).replace(' \/* ', ''), curFile.join('\n'))
    }
    curFile.splice(0, curFile.length)
    curFile.push('/*')
  } else {
    if (line.startsWith('//')) {
      curFile.push(line.replace('\/\/', ' \/*'))
    } else if (line.startsWith('class ')) {
      curFile.push(line.replace('class ', ' *\/\nexport class '))
    } else {
      curFile.push(line)
    }
  }
}

const brealeModules = [...collections.keys()].map(fileName => {
  return `export * from './${fileName}'`
})

console.log(brealeModules.join('\n'))


const targetDir = join(__dirname, 'src/scenes')
for (const [key, value] of collections.entries()) {
  fs.writeFileSync(join(targetDir, `${key}.ts`), value)
}

console.log('done')
