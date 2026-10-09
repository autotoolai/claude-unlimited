<script setup lang="ts">
/** 页脚：品牌行 + 两列导航 + 底部声明 / ICP / 主体。数据来自 config/site.ts 与 navItems。 */
import { siteConfig, navItems } from '../../../config/site'
import { guideNavItems } from '../pages/data'

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
          <li v-for="g in guideNavItems" :key="g.url"><a :href="g.url">{{ g.nav }}</a></li>
        </ul>
      </nav>
    </div>
    <div class="cu-foot__bottom">
      <div>
        <span>© {{ year }} {{ siteConfig.legal.company || siteConfig.name }}</span>
        <span v-if="siteConfig.legal.icp">{{ siteConfig.legal.icp }}</span>
        <span>{{ siteConfig.shortDisclaimer }}。Claude 与 Anthropic 为 Anthropic, Inc. 的商标。</span>
        <span>本站不处理支付与账号，商品信息与最终价格以下单页为准。</span>
      </div>
    </div>
  </footer>
</template>
