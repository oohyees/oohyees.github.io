import type { CollectionEntry } from 'astro:content'

export const blogCategories = [
  {
    description: 'Research notes, paper reading, embodied AI, and AI systems.',
    key: 'research',
    match: ['paper reading', 'ai talk', 'embodied ai', 'benchmark', 'llm', 'vlm', 'vla'],
    next: 'tech',
    prev: 'journal',
    title: 'Research'
  },
  {
    description: 'Engineering notes, environment setup, tools, and technical records.',
    key: 'tech',
    match: ['tech talk', 'bug report', 'linux', 'ubuntu', 'git', 'github action', 'isaac sim'],
    next: 'daily',
    prev: 'research',
    title: 'Technical'
  },
  {
    description: 'Daily writing, memoirs, campus life, and personal fragments.',
    key: 'daily',
    match: ['daily talk', 'weekly journal', 'university', 'memoir', 'dresses'],
    next: 'journal',
    prev: 'tech',
    title: 'Daily Life'
  },
  {
    description: 'Monthly journal entries.',
    key: 'journal',
    match: ['monthly journal'],
    next: 'research',
    prev: 'daily',
    title: 'Month Journal'
  }
] as const

export type BlogCategoryKey = (typeof blogCategories)[number]['key']

export function getBlogCategory(key: string) {
  return blogCategories.find((category) => category.key === key)
}

export function postMatchesCategory(post: CollectionEntry<'blog'>, key: BlogCategoryKey) {
  const category = getBlogCategory(key)
  if (!category) return false

  const exactCategory = post.data.category?.toLowerCase()
  if (exactCategory && blogCategories.some((item) => item.key === exactCategory)) {
    return exactCategory === key
  }

  const values = [
    post.data.category,
    ...post.data.tags
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase())

  if (key === 'journal') {
    return values.some((value) => value.includes('monthly journal')) || post.id.includes('journal')
  }

  return values.some((value) => category.match.some((matcher) => value.includes(matcher)))
}
