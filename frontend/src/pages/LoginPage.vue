<template>
  <q-page class="login-page flex flex-center">
    <div class="auth-wrapper">
      <q-card class="auth-card column">
        <q-card-section class="heading-section q-gutter-xs">
          <div class="text-h5 text-weight-bold">Welcome back!</div>
          <div class="subheading">We're so excited to see you again.</div>
        </q-card-section>

        <q-card-section class="form-section">
          <q-form class="auth-form" @submit.prevent="handleLogin">
            <q-input
              v-model="loginEmail"
              type="email"
              label="Email"
              dense
              outlined
              class="dark-field"
              autocomplete="email"
              :error="loginEmailTouched && Boolean(loginEmailError)"
              :error-message="loginEmailTouched ? loginEmailError : ''"
              @blur="loginEmailTouched = true"
            />
            <q-input
              v-model="loginPassword"
              type="password"
              label="Password"
              dense
              outlined
              class="dark-field"
              autocomplete="current-password"
              :error="loginPasswordTouched && Boolean(loginPasswordError)"
              :error-message="loginPasswordTouched ? loginPasswordError : ''"
              @blur="loginPasswordTouched = true"
            />

            <div class="row items-center justify-between text-caption muted">
              <q-checkbox v-model="rememberMe" dense label="Keep me signed in" color="primary" />
              <q-btn flat dense label="Forgot your password?" disable class="muted" />
            </div>

            <q-btn
              type="submit"
              color="primary"
              unelevated
              class="submit-btn"
              label="Log in"
              :disable="!isLoginValid"
            />
          </q-form>
        </q-card-section>

        <q-card-section class="footer-section column items-center text-center q-gutter-xs">
          <div class="text-caption muted">Need an account?</div>
          <q-btn
            flat
            color="primary"
            label="Register"
            class="q-pa-none"
            @click="goToRegister"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'LoginPage',
});

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const loginEmail = ref('');
const loginPassword = ref('');
const rememberMe = ref(false);

const loginEmailTouched = ref(false);
const loginPasswordTouched = ref(false);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginEmailError = computed(() => {
  if (!loginEmail.value.trim()) {
    return 'Email is required';
  }

  if (!emailPattern.test(loginEmail.value.trim())) {
    return 'Enter a valid email address';
  }

  return '';
});

const loginPasswordError = computed(() => {
  if (!loginPassword.value) {
    return 'Password is required';
  }

  if (loginPassword.value.length < 6) {
    return 'Password must be at least 6 characters';
  }

  return '';
});

const isLoginValid = computed(() => !loginEmailError.value && !loginPasswordError.value);

async function handleLogin() {
  loginEmailTouched.value = true;
  loginPasswordTouched.value = true;

  if (!isLoginValid.value) {
    return;
  }

  await router.push('/workspace');
}

function goToRegister() {
  void router.push('/register');
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 48px 24px;
  background: radial-gradient(circle at top left, #5865f2 0%, rgba(88, 101, 242, 0.18) 35%, #1e1f22 80%, #1a1b1e 100%);
  color: #f2f3f5;
}

.auth-wrapper {
  width: 100%;
  max-width: 420px;
}

.auth-card {
  border-radius: 16px;
  min-height: 460px;
  background: rgba(32, 34, 37, 0.95);
  color: #f2f3f5;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.32);
}

.heading-section {
  padding: 32px 32px 16px;
}

.subheading {
  color: #b9bbbe;
}

.form-section {
  flex: 1;
  padding: 0 32px 32px;
  display: flex;
}

.auth-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.submit-btn {
  width: 100%;
  margin-top: auto;
  align-self: stretch;
  text-transform: none;
  font-weight: 600;
}

.footer-section {
  padding: 0 32px 32px;
}

.muted {
  color: #b9bbbe;
}

.dark-field :deep(.q-field__control) {
  background: #1e2124;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: border-color 0.2s ease;
}

.dark-field :deep(.q-field__native),
.dark-field :deep(.q-field__label) {
  color: #f2f3f5;
}

.dark-field :deep(.q-field__marginal) {
  color: #f2f3f5;
}

.dark-field :deep(.q-field--focused .q-field__control) {
  border-color: #5865f2;
  box-shadow: 0 0 0 2px rgba(88, 101, 242, 0.25);
}

.dark-field :deep(.q-field__bottom) {
  color: #f97070;
}

.dark-field :deep(.q-field--error .q-field__control) {
  border-color: #f97070;
}

@media (max-width: 599px) {
  .login-page {
    padding: 32px 16px;
  }

  .auth-wrapper {
    max-width: 100%;
  }

  .auth-card {
    min-height: auto;
  }

  .heading-section {
    padding: 24px 24px 12px;
  }

  .form-section {
    padding: 0 24px 24px;
  }

  .footer-section {
    padding: 0 24px 24px;
  }
}
</style>
