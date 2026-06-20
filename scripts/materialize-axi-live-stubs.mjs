import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import inventory from '../src/data/axi-live-inventory.json' with { type: 'json' }

const BLOG_DIR = new URL('../src/content/blog/', import.meta.url)
const LOCAL_IMAGE_PREFIX = '/images/axi-hero/'

function yamlString(value) {
  return JSON.stringify(String(value ?? ''))
}

function normalizeSlug(value) {
  return value.toLowerCase().replaceAll('_', '-')
}

async function walk(dir, out = []) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name)
    const info = await stat(full)
    if (info.isDirectory()) await walk(full, out)
    else if (/\.(md|mdx)$/.test(name)) out.push(full)
  }
  return out
}

function localSlugFromFile(file) {
  return normalizeSlug(
    file
      .replace(BLOG_DIR.pathname, '')
      .replace(/\/index\.mdx?$/, '')
      .replace(/\.mdx?$/, '')
  )
}

function frontmatterFor(post) {
  const tags = post.tags?.length
    ? post.tags.map((tag) => `  - ${yamlString(tag)}`).join('\n')
    : '  []'
  const localHeroImage = localHeroImagePath(post.heroImage)
  const heroSource = post.heroImageSource || inferPixivSource(post.heroImage)
  const heroImage = post.heroImage
    ? `heroImage:\n  src: ${yamlString(localHeroImage ?? post.heroImage)}\n  alt: ${yamlString(post.title)}\n  inferSize: true\n${heroSource ? `  source: ${yamlString(heroSource)}\n` : ''}`
    : ''
  return `---\ntitle: ${yamlString(post.title)}\npublishDate: ${post.publishDate ?? '2026-01-01'}\nupdatedDate: ${post.publishDate ?? '2026-01-01'}\ndescription: ${yamlString(post.description || post.title)}\n${heroImage}category: ${yamlString(post.category)}\ntags:\n${tags}\nlanguage: zh\ncomment: true\n---\n`
}

function localHeroImagePath(url) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'picr2.axi404.top') return null
    return `${LOCAL_IMAGE_PREFIX}${decodeURIComponent(parsed.pathname.split('/').pop())}`
  } catch {
    return null
  }
}

function inferPixivSource(url) {
  if (!url) return ''
  const filename = url.split('/').pop() ?? ''
  const match = filename.match(/(?:^|_)(\d{8,12})_p\d+\.[^.]+$/)
  return match ? `https://www.pixiv.net/artworks/${match[1]}` : ''
}

function bodyFor(post) {
  const headingLines = (post.headings || [])
    .map((heading) => heading.replace(/#+$/g, '').trim())
    .filter(Boolean)
    .map((heading) => `## ${heading}\n\n该小节是内容迁移占位。`)
    .join('\n\n')

  return `\n> 这是基于线上公开 metadata 生成的迁移占位页。为避免未经授权复制原文，这里只保留标题、摘要、日期、标签和章节结构。拿到授权导出或替换为你自己的内容后，可以直接在这个文件中补正文。\n\n${post.description || ''}\n\n${headingLines || '## Notes\\n\\n该页面等待补充正文。'}\n`
}

function ensureDraftFrontmatter(source) {
  if (!source.startsWith('---\n')) return `---\ndraft: true\n---\n\n${source}`
  const end = source.indexOf('\n---', 4)
  if (end === -1) return source
  const frontmatter = source.slice(0, end)
  if (/^draft:\s*true\s*$/m.test(frontmatter)) return source
  if (/^draft:\s*false\s*$/m.test(frontmatter)) {
    return source.replace(/^draft:\s*false\s*$/m, 'draft: true')
  }
  return `${frontmatter}\ndraft: true${source.slice(end)}`
}

function replaceFrontmatter(source, post) {
  const nextFrontmatter = frontmatterFor(post).trimEnd()
  if (!source.startsWith('---\n')) return `${nextFrontmatter}\n---\n\n${source}`
  const end = source.indexOf('\n---', 4)
  if (end === -1) return source
  const afterEnd = source.indexOf('\n', end + 4)
  const body = source
    .slice(afterEnd === -1 ? source.length : afterEnd)
    .replace(/^(?:\s*---\s*)+/, '\n')
  return `${nextFrontmatter}${body}`
}

async function main() {
  const localFiles = await walk(BLOG_DIR.pathname)
  const localBySlug = new Map(localFiles.map((file) => [localSlugFromFile(file), file]))
  const livePosts = inventory.posts.map((post) => ({
    ...post,
    slug: normalizeSlug(post.path.replace(/^blog\//, ''))
  }))
  const liveSlugs = new Set(livePosts.map((post) => post.slug))

  let created = 0
  let updated = 0
  for (const post of livePosts) {
    if (localBySlug.has(post.slug)) {
      const file = localBySlug.get(post.slug)
      const source = await readFile(file, 'utf8')
      const next = replaceFrontmatter(source, post)
      if (next !== source) {
        await writeFile(file, next)
        updated += 1
      }
      continue
    }

    const file = join(BLOG_DIR.pathname, post.slug, 'index.md')
    if (existsSync(file)) continue

    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `${frontmatterFor(post)}${bodyFor(post)}`)
    created += 1
  }

  let drafted = 0
  for (const [slug, file] of localBySlug) {
    if (liveSlugs.has(slug)) continue

    const source = await readFile(file, 'utf8')
    const next = ensureDraftFrontmatter(source)
    if (next !== source) {
      await writeFile(file, next)
      drafted += 1
    }
  }

  console.log(`updated ${updated} existing live frontmatters`)
  console.log(`created ${created} live metadata stubs`)
  console.log(`marked ${drafted} legacy local posts as draft`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
