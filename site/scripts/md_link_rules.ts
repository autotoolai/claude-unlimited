/**
 * md 副本里的站内链接改写规则（单一真源，gen_md_mirrors 与 gen_repo_mirrors 共用）。
 *
 * 为什么要改写：md 副本会被 AI、爬虫、以及 GitHub 上的访客直接读。
 * 原文里的 `](/pricing)` 是站点根相对路径：
 *   - 在官网 /knowledge/<slug> 上 → 解析成 https://<站点>/pricing，能打开；
 *   - 在 GitHub 上 → 解析成 github.com/<owner>/<repo>/blob/master/pricing，实测 404。
 * 仓库里有 78 处这种链接，爬虫点进去全是死链，页面质量直接被打低。
 *
 * 改写策略（按目标分两类）：
 *   1) 指向**官网营销页**的（/pricing /guide /console /faq /models /about /contact …）
 *      → 官网绝对 URL。理由：这些内容的主场在官网，链接过去既不死链，
 *        又把 GitHub 这边的权重回流官网（我们需要的正是站外反链）。
 *   2) 指向**知识库文章 / 教程场景**的（/knowledge/<slug> /guide/<scene>）
 *      → 仓库内相对路径（knowledge/<slug>.md / tutorials/<scene>.md）。
 *      理由：仓库内形成闭环，爬虫能继续往下抓；文章正文两边是同一份，不存在口径分裂。
 *
 * 站点根链接 `/` → 官网首页绝对 URL。
 * 图片与外链（https://、./xxx.jpg）不动。
 *
 * 改写只动链接语法，正文逐字节不动。
 */
import { knowledge } from '../config/knowledge'
import { guidePages } from '../config/guide'
import { siteConfig } from '../config/site'

const BASE = siteConfig.url.replace(/\/+$/, '')

/** 知识库 slug 集合（用于区分 /knowledge/<slug> 是文章还是别的） */
const knowledgeSlugs = new Set(knowledge.map((k) => k.slug))
/** 教程场景 slug 集合（/guide/<scene>） */
const guideScenes = new Set(guidePages.map((p) => p.slug.replace(/^\/guide\//, '')))

/** 仓库内镜像的目录名（gen_repo_mirrors 生成的位置） */
export const REPO_MIRROR_DIRS = {
  knowledge: 'knowledge',
  tutorials: 'tutorials',
} as const

export type LinkCtx = {
  /** 是否产出仓库内相对链接（true = 仓库镜像；false = 官网 md 副本） */
  repoRelative: boolean
  /** 当前文件所在的仓库镜像目录（knowledge / tutorials），用来算相对路径 */
  fromDir?: string
  /** 当前文章自己的 slug：自链接保持官网绝对 URL（那是正式发布地址） */
  selfSlug?: string
}

/** 仓库内相对路径：从 fromDir 指向 targetDir/target */
function repoRelPath(fromDir: string | undefined, targetDir: string, target: string): string {
  if (!fromDir) return `../${targetDir}/${target}`
  if (fromDir === targetDir) return target
  return `../${targetDir}/${target}`
}

/**
 * 把一条根相对路径改写成目标 URL。
 * @param route 形如 /pricing、/knowledge/claude-md-guide、/guide/cc（已去掉锚点与查询串）
 */
export function rewriteRoute(route: string, ctx: LinkCtx): string {
  if (!route.startsWith('/')) return route
  const clean = route.replace(/\/+$/, '') || '/'
  if (clean === '/') return ctx.repoRelative ? 'index.md' : `${BASE}/`

  if (clean.startsWith('/knowledge/')) {
    const slug = clean.slice('/knowledge/'.length)
    // 自链接（指向本页自己）：保持官网绝对 URL，那是正式发布地址
    if (ctx.repoRelative && ctx.selfSlug && slug === ctx.selfSlug) return `${BASE}${clean}`
    if (knowledgeSlugs.has(slug)) {
      return ctx.repoRelative
        ? repoRelPath(ctx.fromDir, REPO_MIRROR_DIRS.knowledge, `${slug}.md`)
        : `${BASE}/knowledge/${slug}`
    }
    return `${BASE}${clean}`
  }

  if (clean.startsWith('/guide/')) {
    const scene = clean.slice('/guide/'.length)
    if (guideScenes.has(scene)) {
      return ctx.repoRelative
        ? repoRelPath(ctx.fromDir, REPO_MIRROR_DIRS.tutorials, `${scene}.md`)
        : `${BASE}/guide/${scene}`
    }
    return `${BASE}${clean}`
  }

  // 其余都是官网营销页：两种场景都用官网绝对 URL
  return `${BASE}${clean}`
}

/**
 * 改写一段 markdown 里的站内根相对链接。
 * 只处理 `](...)` 形式的 markdown 链接（含图片 `![]()`），
 * 目标以 / 开头且不是 // 开头（协议相对）。
 */
export function rewriteMdLinks(md: string, ctx: LinkCtx): string {
  const out = md.replace(/(\]\()(\/[^)\s]*)(?=[\s)])/g, (_m, head: string, path: string) => {
    if (path.startsWith('//')) return `${head}${path}`
    // 保留锚点与查询串
    const m = path.match(/^([^#?]*)([#?].*)?$/)
    const route = m?.[1] ?? path
    const suffix = m?.[2] ?? ''
    if (!route) return `${head}${path}`
    return `${head}${rewriteRoute(route, ctx)}${suffix}`
  })
  if (!ctx.repoRelative) return out
  // 仓库副本的源是 public/** 里的 md，那里的站内链接已经是官网绝对 URL。
  // 知识库文章与教程场景要指回仓库内的 .md（形成爬虫闭环），
  // 其余（营销页）保持官网绝对 URL —— 那是主场，且给我们回流站外权重。
  // 捕获组必须必需：写成可选时回调拿到的 route 是 undefined（正则里把右括号也放进组内）。
  const baseRe = new RegExp(
    `\\]\\(\\${BASE.replace(/[.*+?^\${}()|[\]\/]/g, '\\$&')}(/[^)\\s]*)\\)`,
    'g',
  )
  return out.replace(baseRe, (whole: string, route: string) => {
    const clean = route.split('#')[0].split('?')[0]
    const suffix = route.slice(clean.length)
    if (!clean) return whole
    return `](${rewriteRoute(clean, ctx)}${suffix})`
  })
}

/** 一段 md 里是否还残留站内根相对链接（门禁用） */
export function hasRootRelativeLink(md: string): boolean {
  return /\]\(\/[^)\s]*/.test(md)
}
