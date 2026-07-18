<script setup lang="ts">
const account = ref("");
const password = ref("");
const pending = ref(false);
const error = ref("");
const session = useAuthSession();

async function submit() {
  pending.value = true;
  error.value = "";
  try {
    await session.login(account.value, password.value);
    await navigateTo("/account");
  } catch {
    error.value = "账号或密码错误";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <main class="auth">
    <form @submit.prevent="submit">
      <h1>登录 MoeCraft</h1>
      <label>账号<input v-model="account" autocomplete="username" required /></label>
      <label>密码<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="pending">{{ pending ? "登录中…" : "登录" }}</button>
      <NuxtLink to="/register">创建账号</NuxtLink>
    </form>
  </main>
</template>

<style scoped>
.auth{display:grid;min-height:100vh;place-items:center;background:#f6f2f4}form{display:grid;width:min(92vw,380px);gap:16px;padding:32px;border-radius:16px;background:white;box-shadow:0 18px 60px #42203618}label{display:grid;gap:7px}input,button{padding:12px;border:1px solid #d8ccd2;border-radius:8px}button{background:#783b5b;color:white;cursor:pointer}p{color:#a2263d}
</style>
