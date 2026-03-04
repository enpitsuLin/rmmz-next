import fs from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import readline from 'node:readline'

const __dirname = import.meta.dirname

const targetDir = join(__dirname, 'src/sprites')

const content = fs.readFileSync(join(targetDir, 'index.ts'), 'utf8')

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
  }
  else {
    if (line.startsWith('//')) {
      curFile.push(line.replace('\/\/', ' \/*'))
    }
    else if (line.startsWith('class ')) {
      curFile.push(line.replace('class ', ' *\/\nexport class '))
    }
    else {
      curFile.push(line)
    }
  }
}

console.log('Will write files:', collections.keys())

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Write files to target? (Yes/No) ', (answer) => {

  if (['yes', 'y'].includes(answer.trim().toLowerCase())) {

    for (const [key, value] of collections.entries()) {
      fs.writeFileSync(join(targetDir, `${key}.ts`), value)
    }
    // eslint-disable-next-line no-console
    console.log('done')
  }
  else {
    // eslint-disable-next-line no-console
    console.log('Skipped writing files.')
  }


  rl.question('Write breale modules to target? (Yes/No) ', (answer) => {
    if (['yes', 'y'].includes(answer.trim().toLowerCase())) {
      const brealeModules = [...collections.keys()].map((fileName) => {
        return `export * from './${fileName}'`
      })
      fs.writeFileSync(join(targetDir, 'index.ts'), brealeModules.join('\n'))
    }

    rl.close()
  })
})



