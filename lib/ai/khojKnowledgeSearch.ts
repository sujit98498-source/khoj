import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface KhojKnowledgeDocument {
  id: string
  title: string
  path: string
  content: string
  tags: string[]
}

export interface RetrievedKhojSnippet {
  id: string
  title: string
  path: string
  excerpt: string
  score: number
}

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge', 'khoj')
const KNOWLEDGE_INDEX_PATH = path.join(process.cwd(), 'knowledge', 'khoj-index.json')
const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'and',
  'are',
  'based',
  'but',
  'can',
  'for',
  'from',
  'how',
  'into',
  'khoj',
  'the',
  'this',
  'that',
  'what',
  'when',
  'where',
  'with',
  'you',
  'your',
])

let knowledgeCache: KhojKnowledgeDocument[] | null = null

function slugToTitle(slug: string): string {
  return slug
    .replace(/\.md$/i, '')
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getMarkdownTitle(fileName: string, content: string): string {
  const heading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('# '))

  return heading?.replace(/^#\s+/, '').trim() || slugToTitle(fileName)
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function makeTags(fileName: string, title: string): string[] {
  return Array.from(new Set([...tokenize(fileName), ...tokenize(title)]))
}

async function loadIndex(): Promise<KhojKnowledgeDocument[] | null> {
  try {
    const raw = await readFile(KNOWLEDGE_INDEX_PATH, 'utf8')
    const parsed = JSON.parse(raw) as { documents?: KhojKnowledgeDocument[] }
    if (!Array.isArray(parsed.documents)) return null
    return parsed.documents.filter((doc) => doc.content?.trim())
  } catch {
    return null
  }
}

async function loadMarkdownDocs(): Promise<KhojKnowledgeDocument[]> {
  try {
    const files = (await readdir(KNOWLEDGE_DIR)).filter((file) => file.endsWith('.md')).sort()

    const docs = await Promise.all(
      files.map(async (file) => {
        const relativePath = path.posix.join('knowledge', 'khoj', file)
        const content = await readFile(path.join(KNOWLEDGE_DIR, file), 'utf8')
        const title = getMarkdownTitle(file, content)

        return {
          id: file.replace(/\.md$/i, ''),
          title,
          path: relativePath,
          content,
          tags: makeTags(file, title),
        }
      })
    )

    return docs.filter((doc) => doc.content.trim())
  } catch {
    return []
  }
}

export async function loadKhojKnowledgeDocs(): Promise<KhojKnowledgeDocument[]> {
  if (knowledgeCache) return knowledgeCache

  const indexedDocs = await loadIndex()
  knowledgeCache = indexedDocs && indexedDocs.length > 0 ? indexedDocs : await loadMarkdownDocs()
  return knowledgeCache
}

function scoreDocument(doc: KhojKnowledgeDocument, queryTokens: string[], rawQuery: string): number {
  const haystack = `${doc.title} ${doc.tags.join(' ')} ${doc.content}`.toLowerCase()
  const tokenScore = queryTokens.reduce((score, token) => {
    if (doc.title.toLowerCase().includes(token)) return score + 4
    if (doc.tags.includes(token)) return score + 3
    if (haystack.includes(token)) return score + 1
    return score
  }, 0)

  const phraseBonus = rawQuery.length > 10 && haystack.includes(rawQuery.toLowerCase()) ? 4 : 0
  return tokenScore + phraseBonus
}

function makeExcerpt(content: string, queryTokens: string[]): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const matchingParagraph = paragraphs.find((paragraph) => {
    const lower = paragraph.toLowerCase()
    return queryTokens.some((token) => lower.includes(token))
  })

  const excerpt = matchingParagraph || paragraphs[0] || content.replace(/\s+/g, ' ').trim()
  return excerpt.length > 700 ? `${excerpt.slice(0, 697).trim()}...` : excerpt
}

export async function retrieveKhojKnowledgeSnippets(query: string, limit = 4): Promise<RetrievedKhojSnippet[]> {
  const docs = await loadKhojKnowledgeDocs()
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  return docs
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      path: doc.path,
      excerpt: makeExcerpt(doc.content, queryTokens),
      score: scoreDocument(doc, queryTokens, query),
    }))
    .filter((snippet) => snippet.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
