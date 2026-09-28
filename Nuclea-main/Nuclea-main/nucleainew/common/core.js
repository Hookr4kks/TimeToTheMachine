// common\core.js — NucleaAI (extraído verbatim do source original)
var S = {
  model: 'openai-fast',
  chatSessions: [],
  currentSessionId: null,
  chatHist: [],
  fc: [], fcIdx: 0, fcRev: false, fcSel: null,
  prog: { total: 0, acertos: 0, erros: 0, temas: {} },
  tasks: [],
  events: {},
  calY: 0, calM: 0, selDate: '',
  selColor: '#6c8ef5',
  dpY: 0, dpM: 0, dpSel: '',
  aiConfig: { nome: 'Núclea', tom: 'didatico', idioma: 'pt-BR', extra: '' },
  fcConfig: { qtd: 5, dif: 'basico', tipoDireto: true, tipoMC: true },
  elConfig: { key: '', voiceId: '', motor: 'browser', lang: 2 },
};

try {
  var savedModel = localStorage.getItem('fl_model');
  if (savedModel) S.model = savedModel;
  else if (typeof CONFIG !== 'undefined' && CONFIG.AI_MODEL) S.model = CONFIG.AI_MODEL;
} catch(e) {}

var today = new Date();
var chatImage = null;
S.calY = today.getFullYear();
S.calM = today.getMonth();
S.selDate = today.toISOString().split('T')[0];
S.dpY = S.calY;
S.dpM = S.calM;

var MOS  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var MOS3 = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
var DYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
var PIN_COLORS = ['#6c8ef5','#4ade80','#f87171','#fbbf24','#a78bfa'];

function saveLS() {
  try {
    localStorage.setItem('fl_chats',    JSON.stringify(S.chatSessions));
    localStorage.setItem('fl_tasks',    JSON.stringify(S.tasks));
    localStorage.setItem('fl_events',   JSON.stringify(S.events));
    localStorage.setItem('fl_prog',     JSON.stringify(S.prog));
    localStorage.setItem('fl_aiConfig', JSON.stringify(S.aiConfig));
    localStorage.setItem('fl_fcConfig', JSON.stringify(S.fcConfig));
    localStorage.setItem('fl_elConfig', JSON.stringify(S.elConfig));
  } catch(e) {}
}

function loadLS() {
  try {
    var raw;
    raw = localStorage.getItem('fl_chats');
    if (raw) { try { S.chatSessions = JSON.parse(raw); } catch(e) { S.chatSessions = []; } }
    raw = localStorage.getItem('fl_tasks');
    if (raw) { try { S.tasks = JSON.parse(raw); } catch(e) { S.tasks = []; } }
    raw = localStorage.getItem('fl_events');
    if (raw) { try { S.events = JSON.parse(raw); } catch(e) { S.events = {}; } }
    raw = localStorage.getItem('fl_prog');
    if (raw) { try { S.prog = JSON.parse(raw); } catch(e) {} }
    raw = localStorage.getItem('fl_aiConfig');
    if (raw) { try { var ai = JSON.parse(raw); S.aiConfig = { nome:'Núclea', tom:'didatico', idioma:'pt-BR', extra:'', ...ai }; } catch(e) {} }
    raw = localStorage.getItem('fl_fcConfig');
    if (raw) { try { var fc = JSON.parse(raw); S.fcConfig = { qtd:5, dif:'basico', tipoDireto:true, tipoMC:true, ...fc }; } catch(e) {} }
    raw = localStorage.getItem('fl_elConfig');
    if (raw) { try { var el = JSON.parse(raw); S.elConfig = { key:'', voiceId:'', motor:'browser', lang:2, ...el }; } catch(e) {} }
  } catch(e) {}
}

function go(id, btn) {
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('on'); });
  document.querySelectorAll('.nav-i[id^="n-"]').forEach(function(b) { b.classList.remove('on'); });
  document.getElementById('p-' + id).classList.add('on');
  if (btn) btn.classList.add('on');
  if (id === 'progresso')  renderProg();
  if (id === 'agenda')     renderCal();
  if (id === 'tarefas')    renderTasks();
  if (id === 'historico')  renderHistorico('');
  if (id === 'conquistas') renderConquistas();
  if (id !== 'voz')        vozStop();
  closeDatePick();
}

function showToast(msg, type) {
  type = type || 'ok';
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._t);
  t._t = setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function fmtTs(ts) {
  if (!ts) return '';
  var d = new Date(ts), hoje = new Date(), diff = hoje - d;
  if (diff < 60000)    return 'agora';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'min atrás';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h atrás';
  return d.getDate() + ' ' + MOS3[d.getMonth()];
}
document.addEventListener('click', function(e) {
  var w = document.getElementById('date-pick-wrap');
  if (w && !w.contains(e.target)) closeDatePick();
  var ag = document.querySelector('.agenda-pick-row');
  if (ag && !ag.contains(e.target)) closeAgendaPickers();
  if (!e.target.closest || !e.target.closest('.tk-select-wrap')) closeTaskSelects();
  if (!e.target.closest || !e.target.closest('.cfg-select-wrap')) closeCfgSelects();
});
// ──────────────────────────────────────────────────────────────────
//  callAI — IA gratuita via Pollinations.ai (sem chave, CORS aberto)
//  Formato compatível com OpenAI: POST /openai → {choices[0].message}
// ──────────────────────────────────────────────────────────────────
var _aiModelsCache = null;

function aiEndpoint() {
  return (typeof CONFIG !== 'undefined' && CONFIG.AI_BASE_URL) || 'https://text.pollinations.ai/openai';
}
function aiModelsUrl() {
  return (typeof CONFIG !== 'undefined' && CONFIG.AI_MODELS_URL) || 'https://text.pollinations.ai/models';
}
function aiDefaultModel() {
  return (typeof CONFIG !== 'undefined' && CONFIG.AI_MODEL) || 'openai-fast';
}
function aiErrorMessage(data, status) {
  var err = (data && data.error) || (data && data.message) || '';
  if (err && typeof err === 'object') err = err.message || JSON.stringify(err);
  if (typeof err !== 'string') err = '';
  return 'IA ' + status + ': ' + (err || 'sem resposta do servidor');
}
async function aiModels() {
  if (_aiModelsCache) return _aiModelsCache;
  try {
    var r = await fetch(aiModelsUrl());
    var list = await r.json();
    if (Array.isArray(list)) _aiModelsCache = list;
  } catch(e) {}
  return _aiModelsCache || [];
}
async function aiHasVision(model) {
  var list = await aiModels();
  var found = null;
  for (var i = 0; i < list.length; i++) {
    var m = list[i];
    if (m.name === model || (m.aliases || []).indexOf(model) >= 0) { found = m; break; }
  }
  if (!found) return true; // modelo desconhecido: deixa tentar
  return found.vision === true;
}
async function aiTryChat(url, model, content) {
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: content }] })
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) return { ok: false, error: aiErrorMessage(data, res.status) };
    var msg = data.choices && data.choices[0] && data.choices[0].message;
    var text = msg && typeof msg.content === 'string' ? msg.content.trim() : '';
    if (!text) return { ok: false, error: 'A IA devolveu resposta vazia.' };
    return { ok: true, text: text };
  } catch(e) {
    // rede/CORS bloqueado → tenta a próxima rota (proxy /api/chat)
    return { ok: false, error: '' };
  }
}
async function callAI(prompt, image) {
  var model = S.model || aiDefaultModel();
  var content = image
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: image.dataUrl }]
    : prompt;

  if (image && !(await aiHasVision(model))) {
    throw new Error('O modelo gratuito "' + model + '" não analisa imagens. Apague o anexo ou escolha outro modelo em Configurações.');
  }

  // Tenta o modelo escolhido e, se ele não estiver liberado, o padrão gratuito.
  var models = [model];
  if (model !== aiDefaultModel()) models.push(aiDefaultModel());

  var lastError = '';
  for (var i = 0; i < models.length; i++) {
    var routes = [aiEndpoint(), '/api/chat'];
    for (var j = 0; j < routes.length; j++) {
      var out = await aiTryChat(routes[j], models[i], content);
      if (out.ok) return out.text;
      if (out.error) lastError = out.error;
    }
  }

  // Último recurso: endpoint de texto puro (não precisa de JSON).
  // Só serve para texto — a URL não comporta imagem nem prompt gigante.
  if (!image) {
    try {
      var plain = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt.slice(0, 1800)));
      if (plain.ok) {
        var t = (await plain.text()).trim();
        if (t) return t;
      }
    } catch(e) {}
  }

  throw new Error(lastError || 'Não consegui falar com a IA. Tente de novo em alguns segundos.');
}
function toggleTheme() {
  var isLight = document.body.classList.toggle('light');
  localStorage.setItem('fl_theme', isLight ? 'light' : 'dark');
  var sw = document.getElementById('theme-sw'), lbl = document.getElementById('theme-label');
  if (sw) sw.classList.toggle('on', isLight);
  if (lbl) lbl.textContent = isLight ? 'Claro' : 'Escuro';
  applyAvatarVideo('idle'); // atualiza o vídeo ao trocar tema
  document.getElementById('badge-ap').textContent = isLight ? 'Claro' : 'Escuro';
}
// ──────────────────────────────────────────────────────────────────
// PATCH 1: toggleSb — não aplica .col no mobile (impede sumiço do ☰)
// ──────────────────────────────────────────────────────────────────
function toggleSb() {
  if (window.innerWidth <= 640) return; // ignora em mobile
  document.getElementById('sb').classList.toggle('col');
}

// ──────────────────────────────────────────────────────────────────
// PATCH 2: openMobSb / closeMobSb — gerenciam apenas mob-open
// ──────────────────────────────────────────────────────────────────
function openMobSb() {
  document.getElementById('sb').classList.add('mob-open');
  document.getElementById('sb-overlay').classList.add('mob-open');
}
function closeMobSb() {
  document.getElementById('sb').classList.remove('mob-open');
  document.getElementById('sb-overlay').classList.remove('mob-open');
}

