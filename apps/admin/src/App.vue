<template>
  <main class="page">
    <p class="eyebrow">MOECRAFT ADMIN</p>
    <h1>管理后台</h1>
    <ul>
      <li>商品管理</li>
      <li>预售管理</li>
      <li>订单管理</li>
      <li>用户与权限</li>
    </ul>
    <p class="note">
      当前是最小骨架页，后续可以继续接入 Element Plus、Pinia、Vue Router 和 RBAC。
    </p>
  </main>
</template>

<style scoped>
.page {
  padding: 32px;
  font-family: Arial, sans-serif;
}

.eyebrow {
  margin: 0;
  color: #7a7a7a;
  font-size: 12px;
  letter-spacing: 0.2em;
}

h1 {
  margin: 10px 0 16px;
}

ul {
  padding-left: 20px;
  line-height: 2;
}

.note {
  color: #555;
}
</style>
