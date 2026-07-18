<script setup lang="ts">definePageMeta({middleware:"auth"}); const session=useAuthSession();</script>
<template><main><h1>账户中心</h1><p>你好，{{session.user.value?.displayName}}</p><button @click="session.logout().then(()=>navigateTo('/login'))">退出登录</button></main></template>
