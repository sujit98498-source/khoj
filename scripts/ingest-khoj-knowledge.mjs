import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const knowledgeDir = path.join(root, 'knowledge', 'khoj')
const outPath = path.join(root, 'knowledge', 'khoj-index.json')

function titleFromMarkdown(fileName, content) {
  const heading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('# '))

  if (heading) return heading.replace(/^#\s+/, '').trim()

  return fileName
    .replace(/\.md$/i, '')
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function tagsFrom(value) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part.length > 2)
    )
  )
}

const files = (await readdir(knowledgeDir)).filter((file) => file.endsWith('.md')).sort()
const documents = await Promise.all(
  files.map(async (file) => {
    const content = await readFile(path.join(knowledgeDir, file), 'utf8')
    const title = titleFromMarkdown(file, content)

    return {
      id: file.replace(/\.md$/i, ''),
      title,
      path: path.posix.join('knowledge', 'khoj', file),
      tags: tagsFrom(`${file} ${title}`),
      content,
    }
  })
)

await writeFile(
  outPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), documents }, null, 2)}\n`,
  'utf8'
)

console.log(`Indexed ${documents.length} KHOJ knowledge document(s) into ${path.relative(root, outPath)}.`)
