#!/usr/bin/env node
/**
 * The RPG Maker MZ editor rewrites `example/package.json` whenever the project
 * is saved, and it drops everything it does not know about: `type: module`, the
 * scripts and the workspace dependency, which leaves the example unbuildable.
 *
 * Marking the file read-only makes those writes fail instead of silently
 * breaking the build. Run this again after the file is edited on purpose.
 */
import { execFileSync } from 'node:child_process'
import { chmodSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../example/package.json', import.meta.url))

if (process.platform === 'win32') {
  execFileSync('attrib', ['+R', file])
}
else {
  chmodSync(file, 0o444)
}

console.log(`[rmmz] locked ${file}`)
