<script setup lang="ts">
const username = ref("");
const displayName = ref("");
const password = ref("");
const error = ref("");
const session = useAuthSession();

async function submit() {
  error.value = "";
  try {
    await session.register(username.value, displayName.value, password.value);
    await navigateTo("/account");
  } catch {
    error.value = "注册失败，请检查账号和密码";
  }
}
</script>

<template>
  <main class="auth">
    <form @submit.prevent="submit">
      <h1>创建账号</h1>
      <label>账号<input v-model="username" minlength="3" required /></label>
      <label>昵称<input v-model="displayName" required /></label>
      <label>密码（至少 12 位）<input v-model="password" type="password" minlength="12" required /></label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button>注册</button>
      <NuxtLink to="/login">已有账号</NuxtLink>
    </form>
  </main>
</template>

<style scoped>
.auth{display:grid;min-height:100vh;place-items:center;background:#f6f2f4}form{display:grid;width:min(92vw,380px);gap:16px;padding:32px;border-radius:16px;background:#fff}label{display:grid;gap:7px}input,button{padding:12px;border:1px solid #d8ccd2;border-radius:8px}button{background:#783b5b;color:#fff}p{color:#a2263d}
</style>
