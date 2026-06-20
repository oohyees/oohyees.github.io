import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import inventory from '../src/data/axi-live-inventory.json' with { type: 'json' }

const OUT_DIR = new URL('../public/images/axi-hero/', import.meta.url)

function localName(url) {
  const parsed = new URL(url)
  if (parsed.hostname !== 'picr2.axi404.top') return null
  return decodeURIComponent(parsed.pathname.split('/').pop())
}

async function download(url, outputFile) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 hero image migration'
    }
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  await writeFile(outputFile, Buffer.from(await response.arrayBuffer()))
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const urls = [
    ...new Set(
      inventory.posts
        .map((post) => post.heroImage)
        .filter(Boolean)
        .filter((url) => {
          try {
            return new URL(url).hostname === 'picr2.axi404.top'
          } catch {
            return false
          }
        })
    )
  ]

  let downloaded = 0
  let skipped = 0

  for (const [index, url] of urls.entries()) {
    const name = localName(url)
    if (!name) continue

    const outputFile = new URL(`./${name}`, OUT_DIR)
    if (existsSync(outputFile)) {
      skipped += 1
      continue
    }

    await download(url, outputFile)
    downloaded += 1
    console.log(`[${index + 1}/${urls.length}] ${name}`)
  }

  console.log(`downloaded ${downloaded} hero images`)
  console.log(`skipped ${skipped} existing hero images`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
