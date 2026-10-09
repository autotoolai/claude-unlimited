<script setup lang="ts">
/** 页脚：品牌行 + 两列导航 + 底部声明 / ICP / 主体。数据来自 config/site.ts 与 navItems。 */
import { siteConfig, navItems } from '../../../config/site'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="cu-foot">
    <div class="cu-foot__inner">
      <div class="cu-foot__brand">
        <a class="cu-brand" href="/" aria-label="返回首页">
          <BrandLogo :size="32" />
          <span class="cu-brand__text"><strong>{{ siteConfig.name }}</strong></span>
        </a>
        <p>{{ siteConfig.description }}</p>
      </div>
      <nav aria-label="站点导航">
        <h4>导航</h4>
        <ul>
          <li><a href="/">首页</a></li>
          <li v-for="n in navItems" :key="n.link"><a :href="n.link">{{ n.text }}</a></li>
        </ul>
      </nav>
      <nav aria-label="教程目录">
        <h4>教程</h4>
        <ul>
          <li><a href="/guide">使用教程</a></li>
          <li><a href="/guide/clients">接入与模型</a></li>
          <li><a href="/guide/models">模型与切换</a></li>
          <li><a href="/guide/ccswitch">CC Switch 详解</a></li>
        </ul>
      </nav>
    </div>
    <div class="cu-foot__bottom">
      <div>
        <span>© {{ year }} {{ siteConfig.legal.company || siteConfig.name }}</span>
        <span v-if="siteConfig.legal.icp">{{ siteConfig.legal.icp }}</span>
        <span>{{ siteConfig.disclaimer }}</span>
      </div>
    </div>
  </footer>
</template>