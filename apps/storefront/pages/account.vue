<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const session = useAuthSession();

async function logout() {
  await session.logout();
  await navigateTo("/login");
}
</script>

<template>
  <main>
    <h1>账户中心</h1>
    <p>你好，{{ session.user.value?.displayName }}</p>
    <button type="button" @click="logout">退出登录</button>
  </main>
</template>
