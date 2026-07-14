<template>
  <main class="page">
    <p class="eyebrow">MOECRAFT</p>
    <h1>同人手办商城前台</h1>
    <p class="lead">
      当前是 Monorepo 的基础首页，后续会逐步补商品列表、详情页、预售流程、购物车和订单系统。
    </p>
    <div class="links">
      <a href="http://localhost:3001" target="_blank">管理后台</a>
      <a href="http://localhost:3002/health" target="_blank">后端健康检查</a>
    </div>
  </main>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px;
  font-family: Arial, sans-serif;
}

.eyebrow {
  margin: 0;
  color: #7a7a7a;
  font-size: 12px;
  letter-spacing: 0.2em;
}

h1 {
  margin: 12px 0 16px;
  font-size: 40px;
}

.lead {
  max-width: 720px;
  color: #555;
  line-height: 1.8;
}

.links {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.links a {
  color: #111;
}
</style>
