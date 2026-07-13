/* =========================================================================
   Helpers de UI: escape, formatação, chips de categoria, toast, avatares.
   ========================================================================= */

const UI = (() => {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function brl(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Categorias canônicas — espelham o backend e o mobile (utils/categorias.dart).
  // valor = o que trafega/armazena (sem acento, plural); rotulo = exibição.
  const CANONICAS = [
    { valor: 'Alimentos', rotulo: 'Alimentos', emoji: '🍎', cls: 'bg-green-100 text-green-700' },
    { valor: 'Roupas', rotulo: 'Roupas', emoji: '👕', cls: 'bg-blue-100 text-blue-700' },
    { valor: 'Higiene', rotulo: 'Higiene', emoji: '🧼', cls: 'bg-purple-100 text-purple-700' },
    { valor: 'Brinquedos', rotulo: 'Brinquedos', emoji: '🧸', cls: 'bg-pink-100 text-pink-700' },
    { valor: 'Educacao', rotulo: 'Educação', emoji: '📚', cls: 'bg-amber-100 text-amber-700' },
    { valor: 'Saude', rotulo: 'Saúde', emoji: '❤️', cls: 'bg-red-100 text-red-700' },
  ];
  // Chave de comparação: minúsculas e sem acento (igual ao mobile _chave).
  function chaveCat(v) {
    let s = String(v || '').trim().toLowerCase();
    const de = 'áàâãäéèêëíìîïóòôõöúùûüç', para = 'aaaaaeeeeiiiiooooouuuuc';
    for (let i = 0; i < de.length; i++) s = s.split(de[i]).join(para[i]);
    return s;
  }
  // Mapeia qualquer valor ao canônico ("alimento"/"Alimento" → "Alimentos").
  function normalizarCat(valor) {
    const k = chaveCat(valor);
    for (const c of CANONICAS) { const ck = chaveCat(c.valor); if (k === ck || k + 's' === ck) return c.valor; }
    return String(valor || '').trim();
  }
  function cat(nome) {
    const v = normalizarCat(nome);
    const c = CANONICAS.find((x) => x.valor === v);
    return c || { valor: v || 'Outros', rotulo: v || 'Outros', emoji: '📦', cls: 'bg-gray-100 text-gray-700' };
  }
  function catChip(nome) {
    const c = cat(nome);
    return `<span class="text-xs font-bold px-3 py-1 rounded-full ${c.cls}">${c.emoji} ${esc(c.rotulo)}</span>`;
  }

  // UF do Brasil + municípios IBGE (offline, do asset copiado do mobile).
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  let _municipios = null;
  async function carregarMunicipios() {
    if (_municipios) return _municipios;
    try {
      const r = await fetch('assets/dados/municipios_por_uf.json');
      _municipios = await r.json();
    } catch { _municipios = {}; }
    return _municipios;
  }

  // Avatar em iniciais com cor derivada do nome (sem depender de imagem externa).
  const AV = ['#008542', '#ff7b00', '#2563eb', '#7c3aed', '#db2777', '#0891b2'];
  function iniciais(nome) {
    const p = String(nome || '?').trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
  }
  function corNome(nome) {
    let h = 0; for (const ch of String(nome || '')) h = ch.charCodeAt(0) + ((h << 5) - h);
    return AV[Math.abs(h) % AV.length];
  }
  function fotoSrc(base64) {
    if (!base64) return null;
    return String(base64).startsWith('data:') ? base64 : 'data:image/jpeg;base64,' + base64;
  }
  function avatar(nome, tamanho = 'w-12 h-12 text-base', foto = null) {
    const src = fotoSrc(foto);
    if (src) {
      return `<img src="${src}" alt="${esc(nome)}" class="${tamanho} rounded-full object-cover flex-shrink-0 bg-gray-100">`;
    }
    return `<div class="${tamanho} rounded-full flex items-center justify-center font-montserrat font-bold text-white flex-shrink-0"
      style="background:${corNome(nome)}">${esc(iniciais(nome))}</div>`;
  }

  // Toast in-app (canto inferior direito), colorido por tipo.
  function toast(msg, tipo = 'ok') {
    const cores = {
      ok: 'bg-primary', erro: 'bg-red-600', info: 'bg-blue-600', aviso: 'bg-accent',
    };
    const icones = { ok: 'ph-check-circle', erro: 'ph-warning-circle', info: 'ph-info', aviso: 'ph-bell' };
    let box = document.getElementById('toast-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toast-box';
      box.className = 'fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end';
      document.body.appendChild(box);
    }
    const el = document.createElement('div');
    el.className = `${cores[tipo] || cores.ok} text-white px-5 py-3.5 rounded-2xl shadow-xl ` +
      'font-semibold text-sm flex items-center gap-3 slide-up max-w-sm';
    el.innerHTML = `<i class="ph-fill ${icones[tipo] || icones.ok} text-xl"></i><span>${esc(msg)}</span>`;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; }, 3200);
    setTimeout(() => el.remove(), 3800);
  }

  function dataCurta(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  function horaCurta(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Estrelas de avaliação (0..5)
  function estrelas(nota) {
    const n = Math.round(Number(nota) || 0);
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<i class="ph-fill ph-star text-sm ${i <= n ? 'text-accent' : 'text-gray-300'}"></i>`;
    return `<span class="inline-flex items-center gap-0.5">${s}</span>`;
  }

  return {
    esc, brl, cat, catChip, normalizarCat, chaveCat, CANONICAS,
    avatar, fotoSrc, iniciais, corNome, toast, dataCurta, horaCurta, estrelas,
    UFS, carregarMunicipios,
  };
})();
