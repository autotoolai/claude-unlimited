<script setup lang="ts">
/**
 * 教程步骤块：左侧序号列 + 细线分隔，右侧正文。
 * 数据来自 config/guide.ts 的 GuideStep[]，页面组件不写死步骤内容。
 *
 * 每步固定六个槽位，渲染顺序恒定：title → goal → action → link → cta → shot → notes。
 * 字段定义见 docs/guide_design_spec.md。
 * - action 是全页唯一的强调形式：左一个圆点 + 加粗文字，不画框不画底色。简单步骤（下载、安装）
 *   就只是一行加粗，视觉重量不会超过信息量。
 * - 每一组都编号：H2 的「N.」是节号，组内徽标是子步骤号，两级都画（单子步骤也画「1」）。
 *   徽标是描边 + 空底的次级墨色，不反白——H2 旁边挂一个反白的「1」比 h3 还重。
 */
import { computed } from 'vue'
import { renderInline } from '../utils/inline'
import GuideShot from './GuideShot.vue'
import GuideUrl from './GuideUrl.vue'
import type { GuideStepResolved } from '../../../config/guide'

// 收装配后的类型而不是 GuideStep：截图的 label（图 NN）由 guideBlocks() 生成，
// 用 GuideStep 声明 props 的话 template 里读 sh.label 就是 TS2339（vue-tsc 会报）。
const props = defineProps<{ steps: GuideStepResolved[]; /** 序号起始（默认 1） */ start?: number; /** 所属小节的 id；子步骤锚点写成 <blockId>-<序号>，供 FAQ / 客服机器人深链到具体子步骤 */ blockId?: string }>()

/** 组内只有一个子步骤时 H2 上的「N.」已是唯一编号，不画徽标，也不画「子步骤 1」的前缀 */
/** 徽标序号起始。H2 上的「3.」是节号，组内徽标是子步骤号，两级各司其职、每一组都画：
 * 不画徽标的话第 3 步整段左移、第 4 步却右移一列，看着像漏了内容。 */
const startNo = computed(() => props.start ?? 1)

/** shot 可以是单张或数组（合并小步时一步挂多张图），统一摊平成数组 */
function shots(s: GuideStepResolved) {
  if (!s.shot) return []
  return Array.isArray(s.shot) ? s.shot : [s.shot]
}

/**
 * 图文并排（C1）：只有一张图、且左列文字放得下时，文字（title/goal/action/link/notes）与图片
 * 左右并排，而不是图堆在文字下面——短步骤配一张大图会把右侧 194px 的空白拉得更明显。
 *
 * 判定按「左列文字总量」而不是「action 条数」：实测左列 300px 宽（约 20 全角字/行）
 * 排 145 字约占 8 行、约 250px 高，右图约 330px 高，所以左列不超过 145 字时并排不吃亏
 * （并排后这一步的高度由图决定，比上下堆叠省 200px 上下）。
 * 再多就该上下堆叠——并排时文字挤在 300px 里反而比 640px 难读。
 * notes 也要计入：它同样进左列，notes 多的步骤（「装官方客户端」这类带坑的）左列会超高。
 */
function isAside(s: GuideStepResolved) {
  if (shots(s).length !== 1) return false
  const text = [s.title, s.goal ?? '', ...(s.action ?? []), ...(s.notes ?? [])].join('')
  return stripTags(text).length <= 145
}

/** 去掉行内标签（<a>、<b> 等）再算字数，否则标签会被算成好几十个字符 */
function stripTags(t: string) {
  return t.replace(/<[^>]+>/g, '')
}
</script>

<template>
  <ol class="cu-steps-block" :class="{ 'cu-steps-block--single': steps.length === 1 }">
    <li v-for="(s, i) in steps" :id="blockId ? `${blockId}-${startNo + i}` : undefined" :key="s.title" class="cu-step-block">
      <span class="cu-step-block__no" aria-hidden="true">{{ startNo + i }}</span>
      <div class="cu-step-block__body" :class="{ 'cu-step-block__body--aside': isAside(s) }">
        <!-- 图文并排（C1）：h3/goal/action 仍是 body 的直接子元素（原有选择器不用改），
             只给 body 本身套上两列网格，图作为紧随其后的直接子元素落进第二列。 -->
        <template v-if="isAside(s)">
          <!-- 并排的左列：文字装进 .cu-step-block__text，body 变两列网格。
               包裹层是必须的：让 h3/goal/action 直接当网格项，行高会被跨行的图撑开
               （h3 独占一行 349px，文字行之间出现大空隙），装进一层就恢复正常流。 -->
          <div class="cu-step-block__text">
            <h3>{{ s.title }}</h3>
            <p v-if="s.goal" class="cu-step-block__goal" v-html="renderInline(s.goal)" />
            <ul v-if="s.action?.length" class="cu-step-block__action">
              <li v-for="(a, j) in s.action" :key="j" v-html="renderInline(a)" />
            </ul>
            <GuideUrl v-if="s.link" :url="s.link.href" :path="s.link.path" :label="s.link.label" />
            <div v-if="s.cta?.length" class="cu-cta-row">
              <a
                v-for="(l, i) in s.cta"
                :key="i"
                class="cu-btn cu-btn--ghost cu-btn--sm"
                :href="l.url"
                :target="l.external ? '_blank' : undefined"
                :rel="l.external ? 'noopener sponsored nofollow' : undefined"
                >{{ l.text }}</a
              >
            </div>
            <ul v-if="s.notes?.length" class="cu-step-block__notes">
              <li v-for="(t, j) in s.notes" :key="j" v-html="renderInline(t)" />
            </ul>
          </div>
          <GuideShot class="cu-step-block__shot" :src="shots(s)[0].src" :label="shots(s)[0].label" :caption="shots(s)[0].caption" :zoom="shots(s)[0].zoom" />
        </template>
        <template v-else>
          <h3>{{ s.title }}</h3>
          <p v-if="s.goal" class="cu-step-block__goal" v-html="renderInline(s.goal)" />
          <ul v-if="s.action?.length" class="cu-step-block__action">
            <li v-for="(a, j) in s.action" :key="j" v-html="renderInline(a)" />
          </ul>
          <GuideUrl v-if="s.link" :url="s.link.href" :path="s.link.path" :label="s.link.label" />
          <div v-if="s.cta?.length" class="cu-cta-row">
            <a
              v-for="(l, i) in s.cta"
              :key="i"
              class="cu-btn cu-btn--ghost cu-btn--sm"
              :href="l.url"
              :target="l.external ? '_blank' : undefined"
              :rel="l.external ? 'noopener sponsored nofollow' : undefined"
              >{{ l.text }}</a
            >
          </div>
          <template v-if="shots(s).length">
            <div v-if="shots(s).length > 1" class="cu-step-block__shots">
              <template v-for="sh in shots(s)" :key="sh.src">
                <GuideShot class="cu-step-block__shot" :src="sh.src" :label="sh.label" :caption="sh.caption" :zoom="sh.zoom" />
              </template>
            </div>
            <template v-else>
              <GuideShot class="cu-step-block__shot" :src="shots(s)[0].src" :label="shots(s)[0].label" :caption="shots(s)[0].caption" :zoom="shots(s)[0].zoom" />
            </template>
          </template>
        </template>
        <!-- 非并排步骤的 notes 落在图下面（并排时已进左列，这里要排除，否则重复渲染） -->
        <ul v-if="!isAside(s) && s.notes?.length" class="cu-step-block__notes">
          <li v-for="(t, j) in s.notes" :key="j" v-html="renderInline(t)" />
        </ul>
      </div>
    </li>
  </ol>
</template>
