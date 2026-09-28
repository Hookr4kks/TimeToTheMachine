// api/chat.js — Proxy opcional para a IA gratuita Pollinations.ai
// Não precisa de chave nem App Check. Serve como alternativa caso o
// navegador bloqueie a chamada direta (CORS) em produção na Vercel.
const AI_URL = process.env.AI_BASE_URL || 'https://text.pollinations.ai/openai';
const DEFAULT_MODEL = process.env.AI_MODEL || 'openai-fast';
const MAX_BODY_CHARS = 4_500_000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body || '{}');
    }

    let messages = Array.isArray(body.messages) && body.messages.length
      ? body.messages
      : (body.content || body.prompt
          ? [{ role: 'user', content: body.content || body.prompt }]
          : null);

    if (!messages) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }

    if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
      return res.status(413).json({ error: 'Mensagem ou imagem muito grande' });
    }

    const upstream = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: body.model || DEFAULT_MODEL, messages: messages })
    });

    const data = await upstream.json().catch(function() { return {}; });

    if (!upstream.ok) {
      const err = data && data.error;
      return res.status(upstream.status).json({
        error: (err && (err.message || err)) || 'Erro na IA'
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
