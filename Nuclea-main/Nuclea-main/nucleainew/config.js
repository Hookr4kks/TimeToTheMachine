// ============================================================
//  config.js — Configurações da IA
//  API GRATUITA Pollinations.ai — não precisa de chave nem cadastro.
//  Compatível com OpenAI (mesmo formato de request/response).
//  Docs: https://text.pollinations.ai
// ============================================================

const CONFIG = {
  // Endpoint de chat (formato OpenAI). Troque se quiser outro provedor genérico.
  AI_BASE_URL: 'https://text.pollinations.ai/openai',

  // Lista de modelos disponíveis (usado para montar o select em Configurações).
  AI_MODELS_URL: 'https://text.pollinations.ai/models',

  // Modelo padrão. No plano anônimo (grátis) o disponível é o openai-fast (GPT-OSS 20B).
  AI_MODEL: 'openai-fast',

  // Firebase App Check (reCAPTCHA v3) — usado apenas pelo login/sync do Firebase.
  // Cole aqui a SITE KEY publica do reCAPTCHA v3 depois de registrar o App Check.
  FIREBASE_APP_CHECK_SITE_KEY: '6LeyABktAAAAAG9ytSc1jHJ2wC1UVkbBAWO7Jj4L',

  // Use somente em localhost/desenvolvimento. Deixe false em producao.
  // Para gerar um token local, troque para true, abra o site e copie o token do console.
  FIREBASE_APP_CHECK_DEBUG_TOKEN: false,
};
