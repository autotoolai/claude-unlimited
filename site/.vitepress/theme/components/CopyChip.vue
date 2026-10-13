<script setup lang="ts">
/**
 * 「复制」小按钮：把一段文本（model ID、命令、链接）复制到剪贴板。
 * 点击处理只在客户端触发，SSR 产物里只是一个普通按钮，不引用 navigator。
 */
import { ref } from 'vue'
import { copyTextOrPrompt } from '../utils/copy'

const props = withDefaults(defineProps<{ text: string; label?: string; cta?: string }>(), {
  label: '复制',
  // 缺省按 label 归类：调用点不写 cta 时，「复制网址」记成 copy_url，「复制」记成 copy_model
  cta: undefined,
})
const copied = ref(false)
const failed = ref(false)

async function onCopy() {
  const ok = await copyTextOrPrompt(props.text)
  copied.value = ok
  failed.value = !ok
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <button
    type="button"
    class="cu-copychip"
    :class="{ 'is-copied': copied, 'is-failed': failed }"
    :data-copied="copied ? '1' : undefined"
    :data-cta="cta ?? (label === '复制网址' ? 'copy_url' : 'copy_model')"
    @click="onCopy"
  >
    {{ copied ? '已复制' : label }}
  </button>
</template>
