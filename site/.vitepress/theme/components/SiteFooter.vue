<script setup lang="ts">
/** 页脚：品牌行 + 两列导航 + 底部声明 / ICP / 主体。数据来自 config/site.ts 与 navItems。 */
import { siteConfig, navItems } from '../../../config/site'
import { guideNavItems, knowledgeFooterCats } from '../pages/data'
import { partnerUrl } from '../../../config/site'

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
        <p class="cu-foot__h">导航</p>
        <ul>
          <li><a href="/">首页</a></li>
          <li v-for="n in navItems" :key="n.link"><a :href="n.link">{{ n.text }}</a></li>
        </ul>
      </nav>
      <nav aria-label="教程目录">
        <p class="cu-foot__h">教程</p>
        <ul>
          <li v-for="g in guideNavItems" :key="g.url"><a :href="g.url">{{ g.nav }}</a></li>
        </ul>
      </nav>
      <nav aria-label="服务入口">
        <p class="cu-foot__h">服务</p>
        <ul>
          <li><a :href="partnerUrl('console')" target="_blank" rel="noopener">管理后台 ↗</a></li>
          <li><a :href="partnerUrl('ccswitch')" target="_blank" rel="noopener sponsored nofollow">CC Switch 下载 ↗</a></li>
          <li><a :href="partnerUrl('purchase')" target="_blank" rel="noopener sponsored nofollow">购买与发卡 ↗</a></li>
          <li><a href="/faq">常见问题</a></li>
          <li><a href="/faq#more">联系客服</a></li>
        </ul>
      </nav>
      <nav aria-label="知识库目录">
        <p class="cu-foot__h">知识库</p>
        <ul>
          <li v-for="c in knowledgeFooterCats" :key="c.url"><a :href="c.url">{{ c.name }}</a></li>
        </ul>
      </nav>
    </div>
    <div class="cu-foot__bottom">
      <div>
        <span>© {{ year }} {{ siteConfig.legal.company || siteConfig.name }}</span>
        <span v-if="siteConfig.legal.icp">{{ siteConfig.legal.icp }}</span>
      </div>
    </div>
  </footer>
</template>
