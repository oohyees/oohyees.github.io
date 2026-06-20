import type { CollectionEntry } from 'astro:content'

export const collections = [
  {
    description: '关于具身智能相关论文的阅读笔记。',
    key: 'embodied-paper-reading',
    match: ['paper-reading-eai', 'paper-reading-mllm', 'paper-reading-benchmark'],
    title: '具身智能论文阅读'
  },
  {
    description: '关于具身智能相关思考、记录以及洞见。',
    key: 'embodied-series-talk',
    match: ['embodied-talk'],
    title: '具身十日谈'
  },
  {
    description: '致新生的你，关于学习、科研以及保研相关的建议及规划。',
    key: 'for-beginners',
    match: ['advise', 'admission', 'speech-undergraduate'],
    title: '致新生的你'
  },
  {
    description: 'Isaac Sim 新手教程',
    key: 'isaac-101',
    match: ['isaac-'],
    title: 'Isaac Sim 101'
  }
] as const

export type CollectionKey = (typeof collections)[number]['key']

export function getCollectionInfo(key: string) {
  return collections.find((collection) => collection.key === key)
}

export function postMatchesCollection(post: CollectionEntry<'blog'>, key: CollectionKey) {
  const collection = getCollectionInfo(key)
  if (!collection) return false

  const values = [
    post.id.toLowerCase(),
    post.data.title.toLowerCase(),
    post.data.description.toLowerCase(),
    post.data.category?.toLowerCase(),
    ...post.data.tags.map((tag) => tag.toLowerCase())
  ].filter((value): value is string => Boolean(value))

  if (key === 'isaac-101') {
    return values.some((value) => value.includes('isaac 101')) || post.id.startsWith('isaac-')
  }

  return values.some((value) => collection.match.some((matcher) => value!.includes(matcher)))
}
