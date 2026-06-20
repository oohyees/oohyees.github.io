import { mkdir, writeFile } from 'node:fs/promises'
import { parse } from 'node-html-parser'

const SITE = 'https://axi404.top'
const OUT_DIR = new URL('../src/data/', import.meta.url)
const OUT_FILE = new URL('./axi-live-inventory.json', OUT_DIR)

function text(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}

function meta(root, selector, attr = 'content') {
  return root.querySelector(selector)?.getAttribute(attr) ?? ''
}

function slugFromUrl(url) {
  return new URL(url).pathname.replace(/^\/+|\/+$/g, '')
}

function inferCategory(path) {
  const slug = path.replace(/^blog\//, '')
  if (slug.startsWith('journal-')) return 'journal'
  if (/paper-reading|openvla|starvla|lerobot|anygrasp|interndataengine|internmanip|rl-note|eai-papers/i.test(slug)) {
    return 'research'
  }
  if (/week-|journal-|memoir|admission|advise|speech|daily|dresses/i.test(slug)) return 'daily'
  return 'tech'
}

function blogLinksFromHtml(html, validPostPaths) {
  const root = parse(html)
  return root
    .querySelectorAll('a[href^="/blog/"]')
    .map((link) => link.getAttribute('href') ?? '')
    .map((href) => href.replace(/^\/+|\/+$/g, ''))
    .filter((path) => validPostPaths.has(path))
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 metadata inventory bot for personal migration'
    }
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.text()
}

async function main() {
  const sitemapXml = await fetchText(`${SITE}/sitemap-0.xml`)
  const allUrls = Array.from(sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1])
  const zhUrls = allUrls.filter((url) => url.startsWith(`${SITE}/`) && !url.startsWith(`${SITE}/en`))
  const blogUrls = zhUrls.filter((url) => /^https:\/\/axi404\.top\/blog\/[^/]+\/?$/.test(url))
  const categoryUrls = new Set([
    `${SITE}/blog/research`,
    `${SITE}/blog/tech`,
    `${SITE}/blog/daily`,
    `${SITE}/blog/journal`
  ])
  const postUrls = blogUrls.filter((url) => !categoryUrls.has(url))
  const postPaths = new Set(postUrls.map(slugFromUrl))
  const categoryByPath = new Map()

  for (const category of ['research', 'tech', 'daily', 'journal']) {
    const pages = zhUrls.filter((url) => {
      const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '')
      return path === `blog/${category}` || path.startsWith(`blog/${category}/`)
    })
    for (const pageUrl of pages) {
      const html = await fetchText(pageUrl)
      for (const path of blogLinksFromHtml(html, postPaths)) {
        categoryByPath.set(path, category)
      }
    }
  }

  const posts = []
  for (const [index, url] of postUrls.entries()) {
    try {
      const html = await fetchText(url)
      const root = parse(html)
      const title =
        meta(root, 'meta[property="og:title"]') ||
        text(root.querySelector('title')?.textContent).replace(/\s*•\s*Axi's Blog$/, '')
      const description =
        meta(root, 'meta[name="description"]') || meta(root, 'meta[property="og:description"]')
      const published = meta(root, 'meta[property="article:published_time"]')
      const image = meta(root, 'meta[property="og:image"]') || meta(root, 'meta[property="twitter:image"]')
      const imageSource =
        root.querySelector('a[href*="pixiv.net/artworks/"]')?.getAttribute('href') ||
        root.querySelector('a[href*="www.pixiv.net"]')?.getAttribute('href') ||
        ''
      const headings = root
        .querySelectorAll('article h2, article h3')
        .map((heading) => text(heading.textContent))
        .filter(Boolean)
      const path = slugFromUrl(url)
      const tags = [
        ...new Set(
          root
            .querySelectorAll('a[href^="/tags/"]')
            .map((link) => link.getAttribute('href') ?? '')
            .map((href) => decodeURIComponent(href.replace(/^\/tags\//, '').replace(/\/+$/g, '')))
            .filter(Boolean)
        )
      ]

      posts.push({
        category: categoryByPath.get(path) ?? inferCategory(path),
        description,
        headings,
        heroImage: image,
        heroImageSource: imageSource,
        path,
        publishDate: published ? published.slice(0, 10) : null,
        tags,
        title,
        url
      })

      console.log(`[${index + 1}/${postUrls.length}] ${path}`)
    } catch (error) {
      console.warn(`[warn] failed ${url}: ${error.message}`)
      posts.push({
        error: error.message,
        path: slugFromUrl(url),
        url
      })
    }
  }

  const collections = zhUrls
    .filter((url) => url.includes('/collection'))
    .map((url) => ({ path: slugFromUrl(url), url }))

  const tags = zhUrls
    .filter((url) => url.includes('/tags/'))
    .map((url) => ({ path: slugFromUrl(url), url }))

  const inventory = {
    generatedAt: new Date().toISOString(),
    source: SITE,
    counts: {
      collections: collections.length,
      posts: posts.length,
      tags: tags.length
    },
    collections,
    posts,
    tags
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, `${JSON.stringify(inventory, null, 2)}\n`)
  console.log(`wrote ${OUT_FILE.pathname}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
