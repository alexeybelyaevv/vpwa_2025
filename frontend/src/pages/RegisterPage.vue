<template>
  <q-page class="register-page flex flex-center">
    <div class="auth-wrapper">
      <q-card class="auth-card column">
        <q-card-section class="heading-section q-gutter-xs">
          <div class="text-h5 text-weight-bold">Create an account</div>
          <div class="subheading">Register and start building your workspace.</div>
        </q-card-section>

        <q-card-section class="form-section">
          <q-form class="auth-form" @submit.prevent="handleRegister">
            <div class="row q-col-gutter-sm">
              <div class="col">
                <q-input
                  v-model="name"
                  label="First name"
                  dense
                  outlined
                  class="dark-field"
                  autocomplete="given-name"
                  :error="nameTouched && Boolean(nameError)"
                  :error-message="nameTouched ? nameError : ''"
                  @blur="nameTouched = true"
                />
              </div>
              <div class="col">
                <q-input
                  v-model="surname"
                  label="Last name"
                  dense
                  outlined
                  class="dark-field"
                  autocomplete="family-name"
                  :error="surnameTouched && Boolean(surnameError)"
                  :error-message="surnameTouched ? surnameError : ''"
                  @blur="surnameTouched = true"
                />
              </div>
            </div>
            <q-input
              v-model="nickname"
              label="Nickname"
              dense
              outlined
              class="dark-field"
              autocomplete="nickname"
              :error="nicknameTouched && Boolean(nicknameError)"
              :error-message="nicknameTouched ? nicknameError : ''"
              @blur="nicknameTouched = true"
            />
            <q-input
              v-model="email"
              type="email"
              label="Email"
              dense
              outlined
              class="dark-field"
              autocomplete="email"
              :error="emailTouched && Boolean(emailError)"
              :error-message="emailTouched ? emailError : ''"
              @blur="emailTouched = true"
            />
            <q-input
              v-model="password"
              type="password"
              label="Password"
              dense
              outlined
              class="dark-field"
              autocomplete="new-password"
              :error="passwordTouched && Boolean(passwordError)"
              :error-message="passwordTouched ? passwordError : ''"
              @blur="passwordTouched = true"
            />
            <q-input
              v-model="confirmPassword"
              type="password"
              label="Repeat password"
              dense
              outlined
              class="dark-field"
              autocomplete="new-password"
              :error="confirmPasswordTouched && Boolean(confirmPasswordError)"
              :error-message="confirmPasswordTouched ? confirmPasswordError : ''"
              @blur="confirmPasswordTouched = true"
            />

            <div class="text-caption muted terms">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </div>

            <q-btn
              type="submit"
              color="primary"
              unelevated
              class="submit-btn"
              label="Continue"
              :disable="!isRegisterValid"
            />
          </q-form>
        </q-card-section>

        <q-card-section class="footer-section column items-center text-center q-gutter-xs">
          <div class="text-caption muted">Already have an account?</div>
          <q-btn flat color="primary" label="Log in" class="q-pa-none" @click="goToLogin" />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({ name: 'RegisterPage' });

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import type { AxiosError } from 'axios'
import { useQuasar } from 'quasar';
import type { BackendError } from 'src/types';
import { api } from '../api'
const $q = useQuasar();
const router = useRouter();

const name = ref('');
const surname = ref('');
const nickname = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const nameTouched = ref(false);
const surnameTouched = ref(false);
const nicknameTouched = ref(false);
const emailTouched = ref(false);
const passwordTouched = ref(false);
const confirmPasswordTouched = ref(false);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const nameError = computed(() => {
  if (!name.value.trim()) return 'First name is required';
  if (name.value.trim().length < 2) return 'Must be at least 2 characters';
  return '';
});

const surnameError = computed(() => {
  if (!surname.value.trim()) return 'Surname is required';
  if (surname.value.trim().length < 2) return 'Must be at least 2 characters';
  return '';
});

const nicknameError = computed(() => {
  if (!nickname.value.trim()) return 'Nickname is required';
  if (nickname.value.trim().length < 2) return 'Must be at least 2 characters';
  return '';
});

const emailError = computed(() => {
  if (!email.value.trim()) return 'Email is required';
  if (!emailPattern.test(email.value.trim())) return 'Enter a valid email address';
  return '';
});

const passwordError = computed(() => {
  if (!password.value) return 'Password is required';
  if (password.value.length < 6) return 'Password must be at least 6 characters';
  return '';
});

const confirmPasswordError = computed(() => {
  if (!confirmPassword.value) return 'Repeat password is required';
  if (confirmPassword.value !== password.value) return 'Passwords must match';
  return '';
});

const isRegisterValid = computed(
  () =>
    !nameError.value &&
    !surnameError.value &&
    !nicknameError.value &&
    !emailError.value &&
    !passwordError.value &&
    !confirmPasswordError.value,
);

async function handleRegister() {
  nameTouched.value = true;
  surnameTouched.value = true;
  nicknameTouched.value = true;
  emailTouched.value = true;
  passwordTouched.value = true;
  confirmPasswordTouched.value = true;

  if (!isRegisterValid.value) return;

  const body = {
    firstName: name.value.trim(),
    lastName: surname.value.trim(),
    nickname: nickname.value.trim(),
    email: email.value.trim(),
    password: password.value,
  };

  try {
    const res = await api.post('/register', body);

    console.log('Backend response:', res.data);
    localStorage.setItem('token', res.data.token)
    await router.push('/workspace');
  } catch (err: unknown) {
  const error = err as AxiosError<BackendError>;

  const backendMessage =
    error.response?.data?.error || 'Registration failed';

  $q.notify({
    type: 'negative',
    icon: 'warning',
    message: backendMessage,
  });
}
}

function goToLogin() {
  void router.push('/login');
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  padding: 48px 24px;
  background: radial-gradient(
    circle at top right,
    #5865f2 0%,
    rgba(88, 101, 242, 0.12) 30%,
    #1e1f22 80%,
    #1a1b1e 100%
  );
  color: #f2f3f5;
}

.auth-wrapper {
  width: 100%;
  max-width: 460px;
}

.auth-card {
  border-radius: 16px;
  min-height: 500px;
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

.terms {
  text-align: left;
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
  .register-page {
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
