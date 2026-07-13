/* =========================================================================
   Connect ONG - Web do Doador
   App: roteador SPA + telas (Início, Explorar, Matches, Campanhas, Dora).
   Todas as telas consomem o backend real via a camada API (js/api.js).
   ========================================================================= */

const App = (() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const root = () => $('#page-root');

  // Estado leve em memória (cache do que já foi buscado nesta sessão).
  const state = { rota: 'inicio', necessidades: null, categorias: null, campanhas: null };

  // -------------------------------------------------------------------------
  // Marca (injeta o SVG do <template> em todos os .logo-slot)
  // -------------------------------------------------------------------------
  function montarLogos() {
    const tpl = $('#tpl-logo');
    document.querySelectorAll('.logo-slot').forEach((slot) => {
      if (slot.childElementCount === 0) slot.appendChild(tpl.content.cloneNode(true));
    });
  }

  // -------------------------------------------------------------------------
  // Menu lateral
  // -------------------------------------------------------------------------
  const ROTAS = [
    { id: 'inicio',    label: 'Início',    icon: 'ph-house', g: 'p' },
    { id: 'explorar',  label: 'Explorar',  icon: 'ph-magnifying-glass', g: 'p' },
    { id: 'matches',   label: 'Matches',   icon: 'ph-heart', g: 'p' },
    { id: 'campanhas', label: 'Campanhas', icon: 'ph-megaphone', g: 'p' },
    { id: 'dora',      label: 'Dora IA',   icon: 'ph-sparkle', g: 'p' },
    { id: 'ongs',      label: 'ONGs',      icon: 'ph-buildings', g: 's' },
    { id: 'favoritos', label: 'Favoritos', icon: 'ph-star', g: 's' },
    { id: 'impacto',   label: 'Impacto',   icon: 'ph-chart-line-up', g: 's' },
    { id: 'ranking',   label: 'Ranking',   icon: 'ph-trophy', g: 's' },
    { id: 'doacoes',   label: 'Minhas doações', icon: 'ph-hand-heart', g: 's' },
    { id: 'config',    label: 'Ajustes',   icon: 'ph-gear', g: 's' },
  ];
  const TITULOS = {
    inicio: 'Painel de Impacto', explorar: 'Explorar Necessidades',
    matches: 'Meus Matches', campanhas: 'Campanhas', dora: 'Dora — Assistente de Doação',
    ongs: 'ONGs', favoritos: 'Favoritos', impacto: 'Seu Impacto',
    ranking: 'Ranking de Transparência', doacoes: 'Minhas Doações', config: 'Ajustes',
  };

  function botaoNav(r) {
    return `<button data-rota="${r.id}" data-nav="${r.id}"
      class="nav-btn w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-textGrey hover:bg-gray-50 hover:text-primary transition-colors">
      <i class="ph ${r.icon} text-2xl"></i><span class="hidden lg:block">${r.label}</span></button>`;
  }
  function montarNav() {
    const p = ROTAS.filter((r) => r.g === 'p').map(botaoNav).join('');
    const s = ROTAS.filter((r) => r.g === 's').map(botaoNav).join('');
    $('#nav').innerHTML = `${p}
      <p class="hidden lg:block text-[11px] font-bold text-textGrey/50 uppercase tracking-wider px-4 mt-4 mb-1">Você</p>
      <hr class="lg:hidden border-gray-100 my-2">
      ${s}`;
    // Nav inferior (celular): só as rotas principais
    $('#nav-mobile').innerHTML = ROTAS.filter((r) => r.g === 'p').map((r) => `
      <button data-rota="${r.id}" data-navm="${r.id}" class="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-textGrey">
        <i class="ph ${r.icon} text-2xl"></i><span class="text-[10px] font-semibold">${r.label}</span></button>`).join('');
  }
  function marcarNav(id) {
    document.querySelectorAll('[data-nav]').forEach((b) => {
      const ativo = b.dataset.nav === id;
      b.classList.toggle('bg-primary-light', ativo);
      b.classList.toggle('text-primary-dark', ativo);
      b.classList.toggle('font-bold', ativo);
      b.classList.toggle('text-textGrey', !ativo);
      const ic = b.querySelector('i');
      ic.className = ic.className.replace(ativo ? 'ph ' : 'ph-fill ', ativo ? 'ph-fill ' : 'ph ');
    });
    document.querySelectorAll('[data-navm]').forEach((b) => {
      const ativo = b.dataset.navm === id;
      b.classList.toggle('text-primary', ativo);
      b.classList.toggle('text-textGrey', !ativo);
      const ic = b.querySelector('i');
      ic.className = ic.className.replace(ativo ? 'ph ' : 'ph-fill ', ativo ? 'ph-fill ' : 'ph ');
    });
  }

  // -------------------------------------------------------------------------
  // Utilidades de tela
  // -------------------------------------------------------------------------
  function carregando(msg = 'Carregando…') {
    return `<div class="flex flex-col items-center justify-center py-24 text-textGrey gap-3">
      <i class="ph ph-circle-notch text-4xl text-primary spin"></i>
      <span class="font-semibold">${UI.esc(msg)}</span></div>`;
  }
  function vazio(icon, titulo, sub) {
    return `<div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary mb-4"><i class="ph ${icon} text-3xl"></i></div>
      <h3 class="font-montserrat font-bold text-lg text-textDark">${UI.esc(titulo)}</h3>
      <p class="text-textGrey font-medium mt-1 max-w-sm">${UI.esc(sub || '')}</p></div>`;
  }
  function erroBox(msg, tentarRota) {
    return `<div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <i class="ph ph-warning-circle text-3xl text-red-500"></i>
      <p class="font-semibold text-red-700 mt-2">${UI.esc(msg)}</p>
      ${tentarRota ? `<button data-rota="${tentarRota}" class="mt-3 text-sm font-bold text-primary">Tentar de novo</button>` : ''}</div>`;
  }

  // Busca (com cache) das necessidades/categorias/campanhas
  async function getNecessidades(force) {
    if (!state.necessidades || force) state.necessidades = await API.necessidades();
    return state.necessidades;
  }
  async function getCategorias() {
    if (!state.categorias) { try { state.categorias = await API.categorias(); } catch { state.categorias = []; } }
    return state.categorias;
  }
  async function getCampanhas(force) {
    if (!state.campanhas || force) state.campanhas = await API.campanhas();
    return state.campanhas;
  }

  // =========================================================================
  // TELA: INÍCIO
  // =========================================================================
  async function viewInicio() {
    root().innerHTML = carregando();
    const u = API.usuario();
    try {
      const [necUrg, camps, sug] = await Promise.all([
        getNecessidades().then((l) => l.filter((n) => n.urgente && n.status === 'ABERTA').slice(0, 4)),
        getCampanhas().then((l) => l.filter((c) => !c.encerrada).slice(0, 3)),
        API.sugestoes().catch(() => null),
      ]);

      root().innerHTML = `
        <!-- Saudação -->
        <div class="mb-6 slide-up">
          <p class="text-textGrey font-semibold">Olá, ${UI.esc((u?.nome || '').split(' ')[0] || 'doador')} 👋</p>
          <h3 class="text-2xl sm:text-3xl font-montserrat font-extrabold text-textDark mt-1">Pronto para transformar vidas hoje?</h3>
        </div>

        <!-- Acesso rápido -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-9 slide-up" style="animation-delay:.03s">
          ${[
            { r: 'ongs', i: 'ph-buildings', l: 'ONGs' },
            { r: 'favoritos', i: 'ph-star', l: 'Favoritos' },
            { r: 'impacto', i: 'ph-chart-line-up', l: 'Impacto' },
            { r: 'ranking', i: 'ph-trophy', l: 'Ranking' },
            { r: 'doacoes', i: 'ph-hand-heart', l: 'Doações' },
            { r: 'campanhas', i: 'ph-megaphone', l: 'Campanhas' },
          ].map((a) => `<button data-rota="${a.r}" class="bg-white rounded-2xl border border-gray-100 shadow-card py-4 flex flex-col items-center gap-1.5 hover:-translate-y-0.5 hover:border-primary transition-all">
            <i class="ph-fill ${a.i} text-2xl text-primary"></i><span class="text-xs font-bold text-textDark">${a.l}</span></button>`).join('')}
        </div>

        <!-- Sugestões da IA -->
        ${sug && sug.sugestoes && sug.sugestoes.length ? `
        <section class="mb-10 slide-up" style="animation-delay:.05s">
          <div class="bg-gradient-to-br from-primary to-primary-dark rounded-[24px] p-6 lg:p-8 text-white shadow-card relative overflow-hidden">
            <div class="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full"></div>
            <div class="flex items-center gap-3 mb-2 relative"><i class="ph-fill ph-sparkle text-2xl text-accent"></i>
              <h4 class="font-montserrat font-bold text-xl">Sugestões da Dora para você</h4></div>
            <p class="text-white/80 text-sm mb-5 relative">${UI.esc(sug.resposta || 'Perto de você, estas doações precisam de ajuda:')}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative">
              ${sug.sugestoes.slice(0, 6).map((s) => `
                <button data-necessidade="${s.id}" class="text-left bg-white/10 hover:bg-white/20 backdrop-blur rounded-2xl p-4 transition-colors">
                  <p class="font-bold leading-tight">${UI.esc(s.titulo)}</p>
                  <p class="text-white/70 text-xs mt-1">${UI.esc(s.subtitulo || '')}</p>
                </button>`).join('')}
            </div>
          </div>
        </section>` : ''}

        <!-- Necessidades urgentes -->
        <section class="mb-10 slide-up" style="animation-delay:.1s">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-xl font-montserrat font-bold text-textDark flex items-center gap-2"><i class="ph-fill ph-fire text-accent"></i> Urgentes perto de você</h4>
            <button data-rota="explorar" class="text-sm font-bold text-primary hover:text-primary-dark">Ver todas</button>
          </div>
          ${necUrg.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">${necUrg.map(cardNecessidade).join('')}</div>`
            : vazio('ph-check-circle', 'Nenhuma urgência agora', 'Explore outras necessidades abaixo.')}
        </section>

        <!-- Campanhas em destaque -->
        <section class="slide-up" style="animation-delay:.15s">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-xl font-montserrat font-bold text-textDark flex items-center gap-2"><i class="ph-fill ph-megaphone text-primary"></i> Campanhas ativas</h4>
            <button data-rota="campanhas" class="text-sm font-bold text-primary hover:text-primary-dark">Ver todas</button>
          </div>
          ${camps.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">${camps.map(cardCampanha).join('')}</div>`
            : vazio('ph-megaphone', 'Sem campanhas ativas', 'Volte em breve.')}
        </section>`;
    } catch (e) {
      root().innerHTML = erroBox(e.message, 'inicio');
    }
  }

  // =========================================================================
  // TELA: EXPLORAR
  // =========================================================================
  const explorar = { termo: '', categoria: 'Todos' };
  async function viewExplorar() {
    root().innerHTML = carregando();
    try {
      const [nec, cats] = await Promise.all([getNecessidades(), getCategorias()]);
      const chips = ['Todos', ...cats];
      root().innerHTML = `
        <div class="flex flex-col md:flex-row gap-3 mb-6 slide-up">
          <div class="relative w-full md:w-1/2">
            <i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-textGrey text-xl"></i>
            <input id="busca" value="${UI.esc(explorar.termo)}" placeholder="Buscar itens, ONGs, cidades…"
              class="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
          </div>
          <div class="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1" id="chips">
            ${chips.map((c) => `<button data-cat="${UI.esc(c)}" class="px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap border transition-colors
              ${c === explorar.categoria ? 'bg-textDark text-white border-textDark' : 'bg-white border-gray-200 text-textGrey hover:border-primary hover:text-primary'}">${UI.esc(c)}</button>`).join('')}
          </div>
        </div>
        <div id="grid-nec"></div>`;
      pintarGrid(nec);
      $('#busca').addEventListener('input', (e) => { explorar.termo = e.target.value; pintarGrid(nec); });
    } catch (e) {
      root().innerHTML = erroBox(e.message, 'explorar');
    }
  }
  function pintarGrid(nec) {
    const t = explorar.termo.trim().toLowerCase();
    const filtrada = nec.filter((n) => {
      if (n.status !== 'ABERTA') return false;
      const catOk = explorar.categoria === 'Todos' ||
        UI.cat(n.categoria).nome.toLowerCase().startsWith(explorar.categoria.toLowerCase().slice(0, 5));
      const txt = (n.titulo + ' ' + n.descricao + ' ' + n.ongNome + ' ' + (n.ongCidade || '')).toLowerCase();
      return catOk && (!t || txt.includes(t));
    });
    const g = $('#grid-nec');
    if (!g) return;
    g.innerHTML = filtrada.length
      ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${filtrada.map(cardNecessidade).join('')}</div>`
      : vazio('ph-magnifying-glass', 'Nada encontrado', 'Tente outra busca ou categoria.');
  }

  function cardNecessidade(n) {
    const c = UI.cat(n.categoria);
    return `<article data-necessidade="${n.id}" class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group">
      <div class="h-28 flex items-center justify-center text-5xl ${c.cls}">${c.emoji}</div>
      <div class="p-5">
        <div class="flex items-center justify-between mb-2">
          ${UI.catChip(n.categoria)}
          ${n.urgente ? '<span class="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">Urgente</span>' : ''}
        </div>
        <h4 class="font-montserrat font-bold text-textDark text-lg leading-tight group-hover:text-primary transition-colors">${UI.esc(n.titulo)}</h4>
        <p class="text-sm text-textGrey mt-1 line-clamp-2">${UI.esc(n.descricao || '')}</p>
        <div class="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          ${UI.avatar(n.ongNome, 'w-8 h-8 text-xs')}
          <div class="min-w-0">
            <p class="text-sm font-bold text-textDark truncate flex items-center gap-1">${UI.esc(n.ongNome)} ${n.ongVerificada ? '<i class="ph-fill ph-seal-check text-primary text-sm"></i>' : ''}</p>
            <p class="text-xs text-textGrey truncate"><i class="ph ph-map-pin"></i> ${UI.esc(n.ongCidade || 'Brasil')}</p>
          </div>
        </div>
      </div>
    </article>`;
  }

  // Modal de detalhe + demonstrar interesse
  function abrirNecessidade(id) {
    const n = (state.necessidades || []).find((x) => x.id === id);
    if (!n) { UI.toast('Necessidade não encontrada.', 'erro'); return; }
    const c = UI.cat(n.categoria);
    abrirModal(`
      <div class="h-32 flex items-center justify-center text-6xl ${c.cls} rounded-t-3xl">${c.emoji}</div>
      <div class="p-7">
        <div class="flex items-center gap-2 mb-3">${UI.catChip(n.categoria)} ${n.urgente ? '<span class="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">Urgente</span>' : ''}</div>
        <h3 class="text-2xl font-montserrat font-extrabold text-textDark">${UI.esc(n.titulo)}</h3>
        <p class="text-textGrey mt-2 leading-relaxed">${UI.esc(n.descricao || 'Sem descrição.')}</p>
        <div class="flex items-center gap-3 mt-5 p-4 bg-background rounded-2xl">
          ${UI.avatar(n.ongNome, 'w-11 h-11')}
          <div class="min-w-0 flex-1">
            <p class="font-bold text-textDark flex items-center gap-1">${UI.esc(n.ongNome)} ${n.ongVerificada ? '<i class="ph-fill ph-seal-check text-primary"></i>' : ''}</p>
            <p class="text-sm text-textGrey"><i class="ph ph-map-pin"></i> ${UI.esc(n.ongCidade || 'Brasil')} ${n.ongNotaMedia ? '· ' + UI.estrelas(n.ongNotaMedia) : ''}</p>
          </div>
        </div>
        <button data-interesse="${n.id}" class="btn-interesse w-full mt-6 py-4 bg-accent hover:bg-accent-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-accent/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2">
          <i class="ph-fill ph-hand-heart text-xl"></i> Quero doar isso
        </button>
        <p class="text-center text-xs text-textGrey mt-3">A ONG será avisada e vocês poderão conversar pelo chat.</p>
      </div>`);
  }

  async function demonstrarInteresse(necessidadeId, btn) {
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i> Enviando…';
    try {
      await API.demonstrarInteresse(Number(necessidadeId));
      fecharModal();
      UI.toast('Interesse enviado! Acompanhe em Matches.', 'ok');
      state.__matchesDirty = true;
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = orig;
      UI.toast(e.message, 'erro');
    }
  }

  // =========================================================================
  // TELA: MATCHES (3 abas)
  // =========================================================================
  const matches = { aba: 'ativas', dados: null };
  const GRUPOS = {
    ativas: { status: ['ACEITO'], label: 'Ativas', icon: 'ph-chats-circle' },
    aguardando: { status: ['PENDENTE', 'RECUSADO'], label: 'Aguardando', icon: 'ph-hourglass' },
    concluidas: { status: ['CONCLUIDO'], label: 'Concluídas', icon: 'ph-check-circle' },
  };
  async function viewMatches() {
    root().innerHTML = carregando();
    try {
      if (!matches.dados || state.__matchesDirty) { matches.dados = await API.meusInteresses(); state.__matchesDirty = false; }
      pintarMatches();
    } catch (e) {
      root().innerHTML = erroBox(e.message, 'matches');
    }
  }
  function pintarMatches() {
    const conta = (g) => matches.dados.filter((i) => GRUPOS[g].status.includes(i.status)).length;
    const lista = matches.dados.filter((i) => GRUPOS[matches.aba].status.includes(i.status));
    root().innerHTML = `
      <div class="flex gap-2 mb-6 border-b border-gray-100 slide-up">
        ${Object.keys(GRUPOS).map((g) => `
          <button data-aba="${g}" class="px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2
            ${g === matches.aba ? 'border-primary text-primary' : 'border-transparent text-textGrey hover:text-textDark'}">
            <i class="ph ${GRUPOS[g].icon}"></i> ${GRUPOS[g].label}
            <span class="text-xs px-2 py-0.5 rounded-full ${g === matches.aba ? 'bg-primary text-white' : 'bg-gray-100 text-textGrey'}">${conta(g)}</span>
          </button>`).join('')}
      </div>
      <div class="slide-up">${lista.length ? lista.map(cardMatch).join('') : vazio('ph-heart', 'Nada aqui ainda', 'Demonstre interesse em uma necessidade para começar um match.')}</div>`;
  }
  function cardMatch(i) {
    const badge = {
      ACEITO: 'bg-green-100 text-green-700', PENDENTE: 'bg-yellow-100 text-yellow-700',
      RECUSADO: 'bg-red-100 text-red-600', CONCLUIDO: 'bg-primary-light text-primary-dark',
    }[i.status] || 'bg-gray-100 text-gray-600';
    const rotulo = { ACEITO: 'Match aceito', PENDENTE: 'Aguardando ONG', RECUSADO: 'Recusado', CONCLUIDO: 'Concluído' }[i.status] || i.status;
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
      ${UI.avatar(i.ongNome, 'w-12 h-12')}
      <div class="flex-1 min-w-0">
        <p class="font-montserrat font-bold text-textDark text-lg leading-tight">${UI.esc(i.necessidadeTitulo || 'Doação')}</p>
        <p class="text-sm text-textGrey">para <span class="font-semibold text-textDark">${UI.esc(i.ongNome)}</span></p>
        <div class="flex items-center gap-2 mt-1 text-xs text-textGrey">
          <span class="px-2.5 py-1 rounded-full font-bold ${badge}">${rotulo}</span>
          ${i.diasEsperando ? `<span><i class="ph ph-clock"></i> ${i.diasEsperando} dia(s) esperando</span>` : ''}
        </div>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button data-chat="${i.id}" data-ong="${UI.esc(i.ongNome)}" ${i.bloqueadoPelaOng ? 'disabled' : ''}
          class="px-4 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center gap-2">
          <i class="ph-fill ph-chat-circle-text"></i> Conversar</button>
        ${i.status === 'ACEITO' ? `<button data-concluir="${i.id}" class="px-4 py-2.5 bg-white border border-primary text-primary font-bold text-sm rounded-xl hover:bg-primary-light">Concluir</button>` : ''}
      </div>
    </div>`;
  }
  async function concluirMatch(id) {
    try { await API.concluirInteresse(Number(id)); UI.toast('Doação concluída! 🎉', 'ok'); state.__matchesDirty = true; viewMatches(); }
    catch (e) { UI.toast(e.message, 'erro'); }
  }

  // Chat (modal)
  let chatPoll = null;
  async function abrirChat(interesseId, ongNome) {
    abrirModal(`
      <div class="flex items-center gap-3 p-4 border-b border-gray-100">
        ${UI.avatar(ongNome, 'w-10 h-10')}
        <div class="flex-1 min-w-0"><p class="font-bold text-textDark truncate">${UI.esc(ongNome)}</p><p class="text-xs text-textGrey">Chat da doação</p></div>
      </div>
      <div id="chat-msgs" class="h-[50vh] overflow-y-auto p-4 space-y-2 bg-background"></div>
      <form id="chat-form" class="p-3 border-t border-gray-100 flex gap-2">
        <input id="chat-input" placeholder="Escreva uma mensagem…" autocomplete="off"
          class="flex-1 px-4 py-3 bg-background rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary">
        <button class="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-2xl flex items-center justify-center flex-shrink-0"><i class="ph-fill ph-paper-plane-right text-xl"></i></button>
      </form>`, 'max-w-lg', () => { if (chatPoll) clearInterval(chatPoll); chatPoll = null; });

    const iid = Number(interesseId);
    async function carregar() {
      try {
        const msgs = await API.mensagens(iid);
        const box = $('#chat-msgs');
        if (!box) return;
        const noFim = box.scrollTop + box.clientHeight >= box.scrollHeight - 40;
        box.innerHTML = msgs.length ? msgs.map(bolhaMsg).join('') : `<p class="text-center text-sm text-textGrey py-10">Envie a primeira mensagem 👋</p>`;
        if (noFim) box.scrollTop = box.scrollHeight;
      } catch (e) { /* silencioso no poll */ }
    }
    await carregar();
    $('#chat-msgs').scrollTop = $('#chat-msgs').scrollHeight;
    chatPoll = setInterval(carregar, 4000);

    $('#chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const inp = $('#chat-input');
      const texto = inp.value.trim();
      if (!texto) return;
      inp.value = '';
      try { await API.enviarMensagem(iid, texto); await carregar(); }
      catch (err) { UI.toast(err.message, 'erro'); inp.value = texto; }
    });
  }
  function bolhaMsg(m) {
    const meu = m.remetente === 'DOADOR';
    return `<div class="flex ${meu ? 'justify-end' : 'justify-start'}">
      <div class="max-w-[75%] px-4 py-2.5 rounded-2xl ${meu ? 'bg-primary text-white rounded-br-md' : 'bg-white text-textDark rounded-bl-md shadow-sm'}">
        <p class="text-sm leading-snug">${UI.esc(m.conteudo)}</p>
        <p class="text-[10px] ${meu ? 'text-white/70' : 'text-textGrey'} text-right mt-1">${UI.horaCurta(m.dataEnvio)}</p>
      </div></div>`;
  }

  // =========================================================================
  // TELA: CAMPANHAS
  // =========================================================================
  async function viewCampanhas() {
    root().innerHTML = carregando();
    try {
      const camps = await getCampanhas(true);
      const ativas = camps.filter((c) => !c.encerrada);
      const enc = camps.filter((c) => c.encerrada);
      root().innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${ativas.map(cardCampanha).join('')}</div>
        ${enc.length ? `<h4 class="text-lg font-montserrat font-bold text-textDark mt-10 mb-4">Encerradas</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-70 slide-up">${enc.map(cardCampanha).join('')}</div>` : ''}`;
    } catch (e) {
      root().innerHTML = erroBox(e.message, 'campanhas');
    }
  }
  function cardCampanha(c) {
    const cat = UI.cat(c.categoria);
    const pct = Math.min(100, Number(c.progresso) || 0);
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
      <div class="h-24 flex items-center justify-between px-5 ${cat.cls}">
        <span class="text-4xl">${cat.emoji}</span>
        ${c.destaque ? '<span class="text-xs font-bold bg-white/70 text-textDark px-2.5 py-1 rounded-full">⭐ Destaque</span>' : ''}
      </div>
      <div class="p-5 flex flex-col flex-1">
        <p class="text-xs font-bold text-textGrey">${UI.esc(c.ongNome || '')}</p>
        <h4 class="font-montserrat font-bold text-textDark text-lg leading-tight mt-0.5">${UI.esc(c.titulo)}</h4>
        <p class="text-sm text-textGrey mt-1 line-clamp-2 flex-1">${UI.esc(c.descricao || '')}</p>
        <div class="mt-4">
          <div class="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden"><div class="bg-primary h-2.5 rounded-full" style="width:${pct}%"></div></div>
          <div class="flex justify-between text-xs font-semibold mt-2">
            <span class="text-primary">${UI.brl(c.valorArrecadado)}</span>
            <span class="text-textGrey">meta ${UI.brl(c.metaValor)}</span>
          </div>
        </div>
        ${c.encerrada
          ? '<button disabled class="mt-4 w-full py-3 bg-gray-100 text-textGrey font-bold rounded-xl">Encerrada</button>'
          : `<button data-pix="${c.id}" class="mt-4 w-full py-3 bg-accent hover:bg-accent-dark text-white font-bold rounded-xl shadow-md shadow-accent/20 transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"><i class="ph-fill ph-pix-logo"></i> Contribuir</button>`}
      </div>
    </div>`;
  }

  // PIX (modal 2 fases)
  function abrirPix(campanhaId) {
    const c = (state.campanhas || []).find((x) => x.id === campanhaId);
    if (!c) return;
    abrirModal(`
      <div class="p-7">
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-3 text-accent"><i class="ph-fill ph-pix-logo text-3xl"></i></div>
          <h3 class="text-xl font-montserrat font-bold text-textDark">Contribuir com ${UI.esc(c.titulo)}</h3>
          <p class="text-sm text-textGrey mt-1">${UI.esc(c.ongNome || '')}</p>
        </div>
        <label class="block text-sm font-bold text-textDark mb-2">Valor da doação</label>
        <div class="relative mb-4">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-textGrey">R$</span>
          <input id="pix-valor" type="number" min="1" step="1" value="25" class="w-full pl-11 pr-4 py-3.5 bg-background rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>
        <div class="grid grid-cols-4 gap-2 mb-6">
          ${[10, 25, 50, 100].map((v) => `<button data-valor="${v}" class="pix-chip py-2 rounded-xl border border-gray-200 font-bold text-sm hover:border-primary hover:text-primary">R$${v}</button>`).join('')}
        </div>
        <button id="pix-confirmar" class="w-full py-4 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2">
          <i class="ph-fill ph-pix-logo text-xl"></i> Gerar PIX
        </button>
      </div>`);

    document.querySelectorAll('.pix-chip').forEach((b) => b.addEventListener('click', () => { $('#pix-valor').value = b.dataset.valor; }));
    $('#pix-confirmar').addEventListener('click', () => gerarPix(c));
  }
  function gerarPix(c) {
    const valor = Number($('#pix-valor').value);
    if (!valor || valor < 1) { UI.toast('Informe um valor válido.', 'aviso'); return; }
    // Fase 1: "gera" o código PIX (copia e cola) para o visual da doação.
    const codigo = '00020126BR.GOV.BCB.PIX' + String(c.id).padStart(4, '0') + Math.round(valor * 100) + '5204CONNECTONG';
    $('#modal-card').innerHTML = `
      <div class="p-7 text-center">
        <h3 class="text-xl font-montserrat font-bold text-textDark mb-1">Pague ${UI.brl(valor)} via PIX</h3>
        <p class="text-sm text-textGrey mb-5">Escaneie o QR ou copie o código</p>
        <div class="w-44 h-44 mx-auto bg-white border-4 border-primary rounded-2xl flex items-center justify-center mb-4">
          <i class="ph ph-qr-code text-8xl text-primary"></i>
        </div>
        <div class="flex items-center gap-2 bg-background rounded-xl p-3 mb-5">
          <code class="text-xs text-textGrey truncate flex-1 text-left">${UI.esc(codigo)}</code>
          <button id="pix-copiar" class="text-primary font-bold text-xs flex-shrink-0"><i class="ph ph-copy"></i> Copiar</button>
        </div>
        <button id="pix-pago" class="w-full py-4 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-60 flex items-center justify-center gap-2">
          <i class="ph-fill ph-check-circle text-xl"></i> Já paguei
        </button>
      </div>`;
    $('#pix-copiar').addEventListener('click', () => { navigator.clipboard?.writeText(codigo); UI.toast('Código copiado!', 'info'); });
    $('#pix-pago').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      btn.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i> Confirmando…';
      try {
        // Fase 2: registra a contribuição real no backend.
        await API.contribuir(c.id, valor, (API.usuario()?.nome) || 'Doador');
        fecharModal();
        UI.toast('Obrigado! Sua doação de ' + UI.brl(valor) + ' foi registrada 💚', 'ok');
        state.campanhas = null;
        if (state.rota === 'campanhas') viewCampanhas();
      } catch (err) {
        btn.disabled = false; btn.innerHTML = '<i class="ph-fill ph-check-circle text-xl"></i> Já paguei';
        UI.toast(err.message, 'erro');
      }
    });
  }

  // =========================================================================
  // TELA: DORA (assistente IA)
  // =========================================================================
  const dora = { historico: [] };
  async function viewDora() {
    const u = API.usuario();
    root().innerHTML = `
      <div class="max-w-2xl mx-auto bg-white rounded-3xl shadow-card border border-gray-100 flex flex-col" style="height:calc(100vh - 190px)">
        <div class="flex items-center gap-3 p-5 border-b border-gray-100">
          <div class="w-11 h-11 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-accent"><i class="ph-fill ph-sparkle text-2xl"></i></div>
          <div><p class="font-montserrat font-bold text-textDark">Dora</p><p class="text-xs text-textGrey">Sua assistente de doações • IA</p></div>
        </div>
        <div id="dora-msgs" class="flex-1 overflow-y-auto p-5 space-y-3"></div>
        <form id="dora-form" class="p-3 border-t border-gray-100 flex gap-2">
          <input id="dora-input" placeholder="Pergunte à Dora o que doar, para quem…" autocomplete="off" class="flex-1 px-4 py-3 bg-background rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary">
          <button class="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-2xl flex items-center justify-center flex-shrink-0"><i class="ph-fill ph-paper-plane-right text-xl"></i></button>
        </form>
      </div>`;
    const box = $('#dora-msgs');
    if (!dora.historico.length) {
      box.innerHTML = doraBolha('assistente', `Oi, ${UI.esc((u?.nome || '').split(' ')[0] || '')}! Sou a Dora 🌱 Posso sugerir o que doar, achar ONGs perto de você ou tirar dúvidas. Como posso ajudar?`);
    } else {
      box.innerHTML = dora.historico.map((m) => doraBolha(m.papel, UI.esc(m.texto))).join('');
    }
    box.scrollTop = box.scrollHeight;
    $('#dora-form').addEventListener('submit', enviarDora);
  }
  function doraBolha(papel, htmlTexto) {
    const meu = papel === 'usuario';
    return `<div class="flex ${meu ? 'justify-end' : 'justify-start'}">
      <div class="max-w-[80%] px-4 py-3 rounded-2xl ${meu ? 'bg-primary text-white rounded-br-md' : 'bg-background text-textDark rounded-bl-md'}">
        <p class="text-sm leading-relaxed whitespace-pre-line">${htmlTexto}</p></div></div>`;
  }
  async function enviarDora(e) {
    e.preventDefault();
    const inp = $('#dora-input');
    const texto = inp.value.trim();
    if (!texto) return;
    inp.value = '';
    const box = $('#dora-msgs');
    box.insertAdjacentHTML('beforeend', doraBolha('usuario', UI.esc(texto)));
    box.insertAdjacentHTML('beforeend', `<div id="dora-typing" class="flex justify-start"><div class="px-4 py-3 bg-background rounded-2xl rounded-bl-md text-textGrey"><i class="ph ph-circle-notch spin"></i> Dora está pensando…</div></div>`);
    box.scrollTop = box.scrollHeight;
    try {
      const resp = await API.assistente(texto, dora.historico, API.usuario()?.cidade);
      const txt = (resp && (resp.resposta || resp.mensagem)) || 'Desculpe, não consegui responder agora.';
      dora.historico.push({ papel: 'usuario', texto }, { papel: 'assistente', texto: txt });
      $('#dora-typing')?.remove();
      box.insertAdjacentHTML('beforeend', doraBolha('assistente', UI.esc(txt)));
      box.scrollTop = box.scrollHeight;
    } catch (err) {
      $('#dora-typing')?.remove();
      box.insertAdjacentHTML('beforeend', doraBolha('assistente', UI.esc('Ops: ' + err.message)));
    }
  }

  // =========================================================================
  // ONGs (buscar) + Perfil público
  // =========================================================================
  const NIVEL = {
    OURO: { cls: 'bg-yellow-100 text-yellow-700', emoji: '🥇' },
    PRATA: { cls: 'bg-gray-200 text-gray-700', emoji: '🥈' },
    BRONZE: { cls: 'bg-orange-100 text-orange-700', emoji: '🥉' },
  };
  const buscarOng = { termo: '' };
  async function viewOngs() {
    root().innerHTML = carregando();
    try {
      const [ongs] = await Promise.all([API.ongs(), carregarFavIds()]);
      state.ongs = ongs;
      root().innerHTML = `
        <div class="relative w-full md:w-1/2 mb-6 slide-up">
          <i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-textGrey text-xl"></i>
          <input id="busca-ong" placeholder="Buscar ONGs por nome ou cidade…"
            class="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
        </div>
        <div id="grid-ong"></div>`;
      pintarOngs(ongs);
      $('#busca-ong').addEventListener('input', (e) => { buscarOng.termo = e.target.value; pintarOngs(ongs); });
    } catch (e) { root().innerHTML = erroBox(e.message, 'ongs'); }
  }
  function pintarOngs(ongs) {
    const t = buscarOng.termo.trim().toLowerCase();
    const f = ongs.filter((o) => !t || (o.nome + ' ' + (o.cidade || '')).toLowerCase().includes(t));
    $('#grid-ong').innerHTML = f.length
      ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${f.map(cardOng).join('')}</div>`
      : vazio('ph-buildings', 'Nenhuma ONG', 'Tente outro termo.');
  }
  function cardOng(o) {
    const fav = state.favIds && state.favIds.has(o.id);
    return `<div data-perfil-ong="${o.id}" class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer">
      <div class="flex items-start gap-3">
        ${UI.avatar(o.nome, 'w-12 h-12')}
        <div class="flex-1 min-w-0">
          <p class="font-montserrat font-bold text-textDark leading-tight flex items-center gap-1">${UI.esc(o.nome)} ${o.verificada ? '<i class="ph-fill ph-seal-check text-primary"></i>' : ''}</p>
          <p class="text-xs text-textGrey"><i class="ph ph-map-pin"></i> ${UI.esc(o.cidade || 'Brasil')}</p>
          <div class="mt-1">${UI.estrelas(o.notaMedia)} <span class="text-xs text-textGrey">${o.totalAvaliacoes || 0}</span></div>
        </div>
        <button data-fav="${o.id}" class="w-9 h-9 rounded-full flex items-center justify-center ${fav ? 'text-accent' : 'text-gray-300 hover:text-accent'}"><i class="ph${fav ? '-fill' : ''} ph-star text-xl"></i></button>
      </div>
      <p class="text-sm text-textGrey mt-3 line-clamp-2">${UI.esc(o.descricao || '')}</p>
    </div>`;
  }

  async function abrirPerfilOng(ongId) {
    abrirModal(carregando('Carregando perfil…'), 'max-w-2xl');
    try {
      const [p] = await Promise.all([API.perfilOng(ongId), carregarFavIds()]);
      const fav = state.favIds.has(Number(ongId));
      const nv = NIVEL[p.nivelTransparencia] || {};
      const necAbertas = (p.necessidades || []).filter((n) => n.status === 'ABERTA');
      $('#modal-card').innerHTML = `
        <div class="h-24 bg-gradient-to-r from-primary to-primary-dark rounded-t-3xl"></div>
        <div class="px-6 pb-6 -mt-10">
          <div class="flex items-end justify-between">
            <div class="w-20 h-20 rounded-2xl border-4 border-white shadow">${UI.avatar(p.nome, 'w-full h-full text-2xl rounded-xl')}</div>
            <div class="flex gap-2 mb-1">
              <button data-fav="${p.id}" class="px-3 py-2 rounded-xl border text-sm font-bold flex items-center gap-1 ${fav ? 'bg-accent-light text-accent border-accent' : 'border-gray-200 text-textGrey hover:border-accent hover:text-accent'}"><i class="ph${fav ? '-fill' : ''} ph-star"></i> ${fav ? 'Favorita' : 'Favoritar'}</button>
              <button data-avaliar="${p.id}" data-ong="${UI.esc(p.nome)}" class="px-3 py-2 rounded-xl border border-gray-200 text-textGrey hover:border-primary hover:text-primary text-sm font-bold flex items-center gap-1"><i class="ph ph-star-half"></i> Avaliar</button>
            </div>
          </div>
          <h3 class="text-2xl font-montserrat font-extrabold text-textDark mt-3 flex items-center gap-2">${UI.esc(p.nome)} ${p.verificada ? '<i class="ph-fill ph-seal-check text-primary"></i>' : ''}</h3>
          <div class="flex flex-wrap items-center gap-3 mt-1 text-sm text-textGrey">
            <span><i class="ph ph-map-pin"></i> ${UI.esc(p.cidade || 'Brasil')}</span>
            <span>${UI.estrelas(p.notaMedia)} ${(p.notaMedia || 0).toFixed(1)} (${p.totalAvaliacoes || 0})</span>
            ${p.nivelTransparencia ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${nv.cls || 'bg-gray-100'}">${nv.emoji || ''} ${p.nivelTransparencia} · ${p.transparenciaScore || 0} pts</span>` : ''}
          </div>
          <div class="grid grid-cols-3 gap-3 mt-5 text-center">
            <div class="bg-background rounded-2xl py-3"><p class="text-2xl font-montserrat font-black text-primary">${p.totalNecessidades || necAbertas.length}</p><p class="text-xs text-textGrey font-semibold">Necessidades</p></div>
            <div class="bg-background rounded-2xl py-3"><p class="text-2xl font-montserrat font-black text-primary">${p.totalCampanhas || (p.campanhas || []).length}</p><p class="text-xs text-textGrey font-semibold">Campanhas</p></div>
            <div class="bg-background rounded-2xl py-3"><p class="text-2xl font-montserrat font-black text-primary">${p.totalPrestacoes || (p.prestacoes || []).length}</p><p class="text-xs text-textGrey font-semibold">Prestações</p></div>
          </div>
          ${p.descricao ? `<div class="mt-5"><h4 class="font-montserrat font-bold text-textDark mb-1">Sobre</h4><p class="text-sm text-textGrey leading-relaxed whitespace-pre-line">${UI.esc(p.descricao)}</p></div>` : ''}
          ${(p.telefone || p.email || p.endereco) ? `<div class="mt-4 flex flex-wrap gap-3 text-sm">
            ${p.telefone ? `<span class="text-textGrey"><i class="ph ph-phone text-primary"></i> ${UI.esc(p.telefone)}</span>` : ''}
            ${p.email ? `<span class="text-textGrey"><i class="ph ph-envelope text-primary"></i> ${UI.esc(p.email)}</span>` : ''}
            ${p.endereco ? `<a target="_blank" href="https://www.google.com/maps/search/${encodeURIComponent(p.endereco + ' ' + (p.cidade || ''))}" class="text-primary font-semibold"><i class="ph ph-map-pin-line"></i> Ver no Maps</a>` : ''}
          </div>` : ''}
          ${necAbertas.length ? `<div class="mt-6"><h4 class="font-montserrat font-bold text-textDark mb-2">Precisa de</h4>
            <div class="space-y-2">${necAbertas.slice(0, 5).map((n) => `<button data-necessidade="${n.id}" class="w-full text-left flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-primary-light transition-colors">
              <span class="text-2xl">${UI.cat(n.categoria).emoji}</span>
              <span class="flex-1 min-w-0"><span class="block font-bold text-sm text-textDark truncate">${UI.esc(n.titulo)}</span><span class="block text-xs text-textGrey truncate">${UI.esc(n.descricao || '')}</span></span>
              ${n.urgente ? '<span class="text-xs font-bold text-accent">Urgente</span>' : ''}</button>`).join('')}</div></div>` : ''}
          ${(p.avaliacoes || []).length ? `<div class="mt-6"><h4 class="font-montserrat font-bold text-textDark mb-2">Avaliações</h4>
            <div class="space-y-2">${p.avaliacoes.slice(0, 4).map((a) => `<div class="p-3 bg-background rounded-xl"><div class="flex items-center justify-between"><span class="font-bold text-sm text-textDark">${UI.esc(a.doadorNome || 'Doador')}</span>${UI.estrelas(a.nota)}</div>${a.comentario ? `<p class="text-sm text-textGrey mt-1">${UI.esc(a.comentario)}</p>` : ''}</div>`).join('')}</div></div>` : ''}
        </div>`;
    } catch (e) { $('#modal-card').innerHTML = `<div class="p-6">${erroBox(e.message)}</div>`; }
  }

  async function carregarFavIds(force) {
    if (state.favIds && !force) return state.favIds;
    try { const ids = await API.favoritosIds(); state.favIds = new Set((ids || []).map(Number)); }
    catch { state.favIds = new Set(); }
    return state.favIds;
  }
  async function toggleFav(alvoId, btn) {
    const id = Number(alvoId);
    await carregarFavIds();
    const jaEra = state.favIds.has(id);
    try {
      if (jaEra) { await API.desfavoritar(id); state.favIds.delete(id); UI.toast('Removida dos favoritos', 'info'); }
      else { await API.favoritar(id); state.favIds.add(id); UI.toast('Adicionada aos favoritos ⭐', 'ok'); }
      // Repinta a tela/modal aberto
      if (state.rota === 'ongs' && state.ongs) pintarOngs(state.ongs);
      if (state.rota === 'favoritos') viewFavoritos();
      // Atualiza estrela dentro do modal se aberto
      document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => {
        const on = state.favIds.has(id);
        const ic = b.querySelector('i');
        if (ic) ic.className = `ph${on ? '-fill' : ''} ph-star` + (b.classList.contains('text-xl') ? ' text-xl' : '');
      });
    } catch (e) { UI.toast(e.message, 'erro'); }
  }

  function abrirAvaliar(ongId, ongNome) {
    let nota = 5;
    abrirModal(`<div class="p-7">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center">Avaliar ${UI.esc(ongNome)}</h3>
      <p class="text-sm text-textGrey text-center mt-1">Sua nota ajuda outros doadores.</p>
      <div id="estrelas-input" class="flex justify-center gap-2 my-6">
        ${[1, 2, 3, 4, 5].map((i) => `<button data-nota="${i}" class="text-4xl ${i <= nota ? 'text-accent' : 'text-gray-300'}"><i class="ph-fill ph-star"></i></button>`).join('')}
      </div>
      <textarea id="aval-coment" rows="3" placeholder="Comentário (opcional)" class="w-full p-4 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
      <button id="aval-enviar" class="w-full mt-4 py-4 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-60">Enviar avaliação</button>
    </div>`);
    $('#estrelas-input').addEventListener('click', (e) => {
      const b = e.target.closest('[data-nota]'); if (!b) return;
      nota = Number(b.dataset.nota);
      $('#estrelas-input').querySelectorAll('button').forEach((btn, idx) => {
        btn.querySelector('i').className = 'ph-fill ph-star';
        btn.className = 'text-4xl ' + (idx < nota ? 'text-accent' : 'text-gray-300');
      });
    });
    $('#aval-enviar').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        await API.avaliar(Number(ongId), nota, $('#aval-coment').value.trim());
        fecharModal(); UI.toast('Avaliação enviada! Obrigado 💚', 'ok');
      } catch (err) { btn.disabled = false; btn.textContent = 'Enviar avaliação'; UI.toast(err.message, 'erro'); }
    });
  }

  // =========================================================================
  // FAVORITOS
  // =========================================================================
  async function viewFavoritos() {
    root().innerHTML = carregando();
    try {
      const favs = await API.favoritos();
      await carregarFavIds(true);
      root().innerHTML = favs.length
        ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${favs.map(cardOng).join('')}</div>`
        : vazio('ph-star', 'Sem favoritos ainda', 'Favorite ONGs para acompanhá-las aqui.');
    } catch (e) { root().innerHTML = erroBox(e.message, 'favoritos'); }
  }

  // =========================================================================
  // IMPACTO (métricas do doador)
  // =========================================================================
  async function viewImpacto() {
    root().innerHTML = carregando();
    try {
      const [inter, conq] = await Promise.all([API.meusInteresses(), API.conquistas().catch(() => [])]);
      const concl = inter.filter((i) => i.status === 'CONCLUIDO').length;
      const ativos = inter.filter((i) => i.status === 'ACEITO').length;
      const ongsAjudadas = new Set(inter.filter((i) => i.status === 'CONCLUIDO').map((i) => i.ongId)).size;
      root().innerHTML = `
        <div class="bg-gradient-to-br from-primary to-primary-dark rounded-[24px] p-8 text-white shadow-card mb-8 slide-up relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full"></div>
          <p class="font-semibold text-white/80 relative">Seu impacto no Connect ONG</p>
          <div class="flex items-end gap-3 mt-2 relative">
            <span class="text-6xl font-montserrat font-black">${concl}</span>
            <span class="text-xl font-bold mb-2">doações concluídas 🎉</span>
          </div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 slide-up" style="animation-delay:.05s">
          ${statCard('ph-heart', ativos, 'Matches ativos', 'text-accent')}
          ${statCard('ph-hourglass', inter.filter((i) => i.status === 'PENDENTE').length, 'Aguardando', 'text-yellow-600')}
          ${statCard('ph-buildings', ongsAjudadas, 'ONGs ajudadas', 'text-primary')}
          ${statCard('ph-handshake', inter.length, 'Interações totais', 'text-blue-600')}
        </div>
        <h4 class="text-xl font-montserrat font-bold text-textDark mb-4 flex items-center gap-2 slide-up"><i class="ph-fill ph-medal text-accent"></i> Conquistas</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 slide-up" style="animation-delay:.1s">
          ${(conq || []).map(cardConquista).join('') || vazio('ph-medal', 'Sem conquistas ainda', 'Faça sua primeira doação!')}
        </div>`;
    } catch (e) { root().innerHTML = erroBox(e.message, 'impacto'); }
  }
  function statCard(icon, valor, label, cor) {
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
      <i class="ph-fill ${icon} text-2xl ${cor}"></i>
      <p class="text-3xl font-montserrat font-black text-textDark mt-2">${valor}</p>
      <p class="text-sm text-textGrey font-semibold">${label}</p></div>`;
  }
  function cardConquista(c) {
    const on = c.conquistada;
    return `<div class="rounded-2xl p-5 border ${on ? 'bg-accent-light border-accent/30' : 'bg-white border-gray-100 opacity-60'}">
      <div class="w-11 h-11 rounded-full flex items-center justify-center ${on ? 'bg-accent text-white' : 'bg-gray-100 text-gray-400'}"><i class="ph-fill ph-medal text-xl"></i></div>
      <p class="font-montserrat font-bold text-textDark mt-3 leading-tight">${UI.esc(c.titulo)}</p>
      <p class="text-xs text-textGrey mt-1">${UI.esc(c.descricao || '')}</p>
      ${on ? '<span class="inline-block mt-2 text-xs font-bold text-accent"><i class="ph-fill ph-check-circle"></i> Conquistada</span>' : ''}</div>`;
  }

  // =========================================================================
  // RANKING de transparência
  // =========================================================================
  async function viewRanking() {
    root().innerHTML = carregando();
    try {
      const r = await API.ranking(20);
      root().innerHTML = `
        <p class="text-textGrey font-medium mb-5 slide-up">ONGs mais transparentes da plataforma — pontuação por prestações de contas, campanhas concluídas e avaliações.</p>
        <div class="space-y-3 slide-up" style="animation-delay:.05s">
          ${r.map((o, i) => cardRanking(o, i)).join('')}
        </div>`;
    } catch (e) { root().innerHTML = erroBox(e.message, 'ranking'); }
  }
  function cardRanking(o, i) {
    const nv = NIVEL[o.nivel] || {};
    const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}º`;
    return `<div data-perfil-ong="${o.ongId}" class="bg-white rounded-2xl shadow-card border border-gray-100 p-4 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
      <div class="text-2xl font-montserrat font-black text-textGrey w-10 text-center">${medal}</div>
      ${UI.avatar(o.nome, 'w-12 h-12')}
      <div class="flex-1 min-w-0">
        <p class="font-montserrat font-bold text-textDark truncate flex items-center gap-1">${UI.esc(o.nome)} ${o.verificada ? '<i class="ph-fill ph-seal-check text-primary"></i>' : ''}</p>
        <p class="text-xs text-textGrey"><i class="ph ph-map-pin"></i> ${UI.esc(o.cidade || 'Brasil')} · ${o.totalPrestacoes || 0} prestações</p>
      </div>
      <div class="text-right">
        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${nv.cls || 'bg-gray-100'}">${nv.emoji || ''} ${o.nivel || ''}</span>
        <p class="text-lg font-montserrat font-black text-primary mt-1">${o.score} pts</p>
      </div>
    </div>`;
  }

  // =========================================================================
  // MINHAS DOAÇÕES (itens)
  // =========================================================================
  async function viewDoacoes() {
    root().innerHTML = carregando();
    try {
      const doacoes = await API.minhasDoacoes();
      root().innerHTML = `
        <div class="flex justify-end mb-5 slide-up">
          <button id="nova-doacao" class="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md shadow-accent/20 flex items-center gap-2"><i class="ph-bold ph-plus"></i> Cadastrar doação</button>
        </div>
        ${doacoes.length
          ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${doacoes.map(cardDoacao).join('')}</div>`
          : vazio('ph-hand-heart', 'Você ainda não cadastrou doações', 'Cadastre um item que deseja doar e apareça para as ONGs.')}`;
      $('#nova-doacao').addEventListener('click', abrirNovaDoacao);
    } catch (e) { root().innerHTML = erroBox(e.message, 'doacoes'); }
  }
  function cardDoacao(d) {
    const c = UI.cat(d.categoria);
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      <div class="h-24 flex items-center justify-center text-4xl ${c.cls}">${c.emoji}</div>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-2">${UI.catChip(d.categoria)} ${d.urgente ? '<span class="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">Urgente</span>' : ''}</div>
        <h4 class="font-montserrat font-bold text-textDark text-lg">${UI.esc(d.nome)}</h4>
        <p class="text-sm text-textGrey mt-1 line-clamp-2">${UI.esc(d.descricao || '')}</p>
        ${d.quantidade ? `<p class="text-xs text-textGrey mt-2 font-semibold"><i class="ph ph-stack"></i> Quantidade: ${d.quantidade}</p>` : ''}
      </div></div>`;
  }
  function abrirNovaDoacao() {
    abrirModal(`<form id="form-doacao" class="p-7 space-y-4">
      <div class="text-center mb-2">
        <div class="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3 text-primary"><i class="ph-fill ph-gift text-3xl"></i></div>
        <h3 class="text-xl font-montserrat font-bold text-textDark">O que você quer doar?</h3>
      </div>
      <input name="nome" required placeholder="Item (ex: Cobertores)" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <div class="grid grid-cols-2 gap-3">
        <select name="categoria" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
          ${(state.categorias || ['Alimentos', 'Roupas', 'Higiene', 'Brinquedos', 'Educacao', 'Saude']).map((c) => `<option>${UI.esc(c)}</option>`).join('')}
        </select>
        <input name="quantidade" type="number" min="1" placeholder="Quantidade" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      </div>
      <textarea name="descricao" rows="3" required placeholder="Descrição / estado de conservação" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
      <label class="flex items-center gap-2 text-sm font-semibold text-textDark"><input type="checkbox" name="urgente" class="w-4 h-4 accent-primary"> Marcar como urgente</label>
      <button class="btn-submit w-full py-4 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-60">Publicar doação</button>
    </form>`);
    $('#form-doacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('.btn-submit'); btn.disabled = true; btn.textContent = 'Publicando…';
      const fd = Object.fromEntries(new FormData(e.target));
      try {
        await API.cadastrarDoacao({
          nome: fd.nome, descricao: fd.descricao, categoria: fd.categoria,
          quantidade: Number(fd.quantidade) || 1, urgente: fd.urgente === 'on', tipo: 'Nova',
        });
        fecharModal(); UI.toast('Doação publicada! 🎁', 'ok');
        if (state.rota === 'doacoes') viewDoacoes();
      } catch (err) { btn.disabled = false; btn.textContent = 'Publicar doação'; UI.toast(err.message, 'erro'); }
    });
  }

  // =========================================================================
  // AJUSTES (acessibilidade — client-side, persiste no localStorage)
  // =========================================================================
  const PREFS_KEY = 'co_prefs';
  function lerPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }
  function salvarPrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); aplicarPrefs(p); }
  function aplicarPrefs(p) {
    const r = document.documentElement;
    r.style.fontSize = ({ pequeno: '14px', normal: '16px', grande: '18px' }[p.fonte] || '16px');
    document.body.classList.toggle('alto-contraste', !!p.contraste);
    document.body.classList.toggle('reduz-motion', !!p.semAnim);
  }
  function viewConfig() {
    const p = lerPrefs();
    root().innerHTML = `
      <div class="max-w-xl mx-auto space-y-5 slide-up">
        <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <h4 class="font-montserrat font-bold text-textDark mb-4 flex items-center gap-2"><i class="ph-fill ph-text-aa text-primary"></i> Tamanho da fonte</h4>
          <div class="flex gap-2">
            ${['pequeno', 'normal', 'grande'].map((f) => `<button data-pref-fonte="${f}" class="flex-1 py-3 rounded-xl border font-bold capitalize ${(p.fonte || 'normal') === f ? 'bg-primary text-white border-primary' : 'border-gray-200 text-textGrey'}">${f}</button>`).join('')}
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
          ${toggleLinha('contraste', 'ph-circle-half', 'Alto contraste', 'Realça bordas e textos', p.contraste)}
          ${toggleLinha('semAnim', 'ph-personsimplerun', 'Reduzir animações', 'Menos movimento na tela', p.semAnim)}
        </div>
        <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <button id="btn-sair-config" class="w-full py-3 text-red-600 font-bold rounded-xl hover:bg-red-50 flex items-center justify-center gap-2"><i class="ph ph-sign-out"></i> Sair da conta</button>
        </div>
        <p class="text-center text-xs text-textGrey">Connect ONG • Web do Doador • conectado a ${UI.esc(API.BASE)}</p>
      </div>`;
    root().querySelectorAll('[data-pref-fonte]').forEach((b) => b.addEventListener('click', () => { const pr = lerPrefs(); pr.fonte = b.dataset.prefFonte; salvarPrefs(pr); viewConfig(); }));
    root().querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const pr = lerPrefs(); pr[b.dataset.toggle] = !pr[b.dataset.toggle]; salvarPrefs(pr); viewConfig(); }));
    $('#btn-sair-config').addEventListener('click', () => { if (confirm('Deseja sair?')) { API.sair(); location.hash = ''; mostrarLogin(); } });
  }
  function toggleLinha(chave, icon, titulo, sub, ativo) {
    return `<div class="flex items-center justify-between">
      <div class="flex items-center gap-3"><i class="ph ${icon} text-xl text-primary"></i><div><p class="font-bold text-textDark">${titulo}</p><p class="text-xs text-textGrey">${sub}</p></div></div>
      <button data-toggle="${chave}" class="w-12 h-7 rounded-full transition-colors ${ativo ? 'bg-primary' : 'bg-gray-300'} relative"><span class="absolute top-1 ${ativo ? 'right-1' : 'left-1'} w-5 h-5 bg-white rounded-full transition-all"></span></button>
    </div>`;
  }

  // =========================================================================
  // NOTIFICAÇÕES (sino)
  // =========================================================================
  async function atualizarSino() {
    try {
      const r = await API.naoLidas();
      const n = typeof r === 'number' ? r : (r && (r.total ?? r.count ?? r.naoLidas)) || 0;
      const badge = $('#sino-badge');
      if (n > 0) { badge.textContent = n > 9 ? '9+' : n; badge.classList.remove('hidden'); }
      else badge.classList.add('hidden');
    } catch { /* silencioso */ }
  }
  async function abrirNotificacoes() {
    abrirModal(carregando('Carregando…'), 'max-w-md');
    try {
      const lista = await API.notificacoes();
      $('#modal-card').innerHTML = `
        <div class="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 class="font-montserrat font-bold text-textDark flex items-center gap-2"><i class="ph-fill ph-bell text-primary"></i> Notificações</h3>
          ${lista.some((n) => !n.lida) ? '<button id="marcar-todas" class="text-sm font-bold text-primary">Marcar todas</button>' : ''}
        </div>
        <div class="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          ${lista.length ? lista.map(cardNotif).join('') : `<p class="text-center text-textGrey py-10">Nenhuma notificação.</p>`}
        </div>`;
      const bt = $('#marcar-todas');
      if (bt) bt.addEventListener('click', async () => { try { await API.marcarTodas(); atualizarSino(); abrirNotificacoes(); } catch (e) { UI.toast(e.message, 'erro'); } });
    } catch (e) { $('#modal-card').innerHTML = `<div class="p-6">${erroBox(e.message)}</div>`; }
  }
  const NOTIF_ICON = { MATCH: 'ph-heart', MENSAGEM: 'ph-chat-circle', SISTEMA: 'ph-info', AVALIACAO: 'ph-star' };
  function cardNotif(n) {
    return `<button data-notif="${n.id}" class="w-full text-left flex gap-3 p-3 rounded-xl transition-colors ${n.lida ? 'hover:bg-gray-50' : 'bg-primary-light/60 hover:bg-primary-light'}">
      <div class="w-9 h-9 rounded-full bg-white flex items-center justify-center text-primary flex-shrink-0"><i class="ph-fill ${NOTIF_ICON[n.tipo] || 'ph-bell'}"></i></div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-sm text-textDark ${n.lida ? '' : ''}">${UI.esc(n.titulo)} ${n.lida ? '' : '<span class="inline-block w-2 h-2 bg-accent rounded-full align-middle ml-1"></span>'}</p>
        <p class="text-sm text-textGrey leading-snug">${UI.esc(n.mensagem)}</p>
        <p class="text-[11px] text-textGrey/70 mt-0.5">${UI.dataCurta(n.dataCriacao)} ${UI.horaCurta(n.dataCriacao)}</p>
      </div></button>`;
  }
  async function tocarNotif(id) {
    try { await API.marcarLida(Number(id)); atualizarSino(); const el = document.querySelector(`[data-notif="${id}"]`); if (el) el.classList.remove('bg-primary-light/60'); } catch {}
  }

  // =========================================================================
  // Modal genérico
  // =========================================================================
  let onFecharModal = null;
  function abrirModal(htmlInterno, maxW = 'max-w-md', aoFechar = null) {
    onFecharModal = aoFechar;
    $('#modal-root').innerHTML = `
      <div id="modal-bg" class="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 fade-in">
        <div id="modal-card" class="bg-white rounded-3xl shadow-2xl w-full ${maxW} max-h-[92vh] overflow-y-auto relative slide-up">
          <button id="modal-x" class="absolute top-4 right-4 z-10 w-9 h-9 bg-white/80 hover:bg-gray-100 rounded-full flex items-center justify-center text-textDark shadow"><i class="ph ph-x text-lg"></i></button>
          ${htmlInterno}
        </div>
      </div>`;
    $('#modal-x').addEventListener('click', fecharModal);
    $('#modal-bg').addEventListener('click', (e) => { if (e.target.id === 'modal-bg') fecharModal(); });
  }
  function fecharModal() {
    if (onFecharModal) { try { onFecharModal(); } catch {} onFecharModal = null; }
    $('#modal-root').innerHTML = '';
  }

  // =========================================================================
  // Roteador
  // =========================================================================
  const VIEWS = {
    inicio: viewInicio, explorar: viewExplorar, matches: viewMatches, campanhas: viewCampanhas, dora: viewDora,
    ongs: viewOngs, favoritos: viewFavoritos, impacto: viewImpacto, ranking: viewRanking,
    doacoes: viewDoacoes, config: viewConfig,
  };
  function irPara(rota) {
    if (!VIEWS[rota]) rota = 'inicio';
    state.rota = rota;
    $('#header-title').textContent = TITULOS[rota] || 'Connect ONG';
    marcarNav(rota);
    location.hash = '#/' + rota;
    VIEWS[rota]();
  }

  // =========================================================================
  // Autenticação (login / cadastro / logout)
  // =========================================================================
  function pintarPerfil() {
    const u = API.usuario();
    if (!u) return;
    $('#perfil-nome').textContent = u.nome || 'Doador';
    $('#perfil-avatar').innerHTML = UI.avatar(u.nome, 'w-10 h-10');
  }
  let sinoPoll = null;
  function aoEntrar() {
    pintarPerfil();
    atualizarSino();
    if (sinoPoll) clearInterval(sinoPoll);
    sinoPoll = setInterval(atualizarSino, 30000);
    irPara(location.hash.replace('#/', '') || 'inicio');
  }
  function mostrarApp() {
    $('#view-login').style.opacity = '0';
    setTimeout(() => {
      $('#view-login').hidden = true;
      $('#view-app').hidden = false;
      aoEntrar();
    }, 300);
  }
  function mostrarLogin() {
    $('#view-app').hidden = true;
    const vl = $('#view-login');
    vl.hidden = false; vl.style.opacity = '1';
  }

  async function carregarStatsLogin() {
    try {
      const s = await API.estatisticas();
      const itens = [
        { n: s.totalDoacoes ?? s.doacoes ?? s.totalInteresses, l: 'doações' },
        { n: s.totalOngs ?? s.ongs, l: 'ONGs' },
        { n: s.totalDoadores ?? s.doadores ?? s.totalUsuarios, l: 'doadores' },
      ].filter((x) => x.n != null);
      if (itens.length) $('#login-stats').innerHTML = itens.map((x) => `
        <div><p class="text-3xl font-montserrat font-black text-white">${UI.esc(x.n)}</p><p class="text-sm text-gray-400 font-semibold uppercase tracking-wide">${x.l}</p></div>`).join('');
    } catch { /* opcional */ }
  }

  function submitAuth(form, fn) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.btn-submit');
      const erro = form.querySelector('[data-erro]');
      erro.classList.add('hidden');
      const orig = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i>';
      try {
        await fn(Object.fromEntries(new FormData(form)));
      } catch (err) {
        erro.textContent = err.message; erro.classList.remove('hidden');
        btn.disabled = false; btn.innerHTML = orig;
      }
    });
  }

  function ligarAuth() {
    submitAuth($('#form-login'), async (d) => {
      const r = await API.login(d.email, d.senha);
      if (r.tipo && r.tipo !== 'DOADOR') { API.sair(); throw new Error('Esta conta é de ONG. A web é a experiência do doador.'); }
      API.salvarSessao(r);
      UI.toast('Bem-vindo, ' + (r.nome || '').split(' ')[0] + '!', 'ok');
      mostrarApp();
    });
    submitAuth($('#form-cadastro'), async (d) => {
      const payload = { nome: d.nome, email: d.email, senha: d.senha, tipo: 'DOADOR',
        cidade: d.cidade || null, uf: (d.uf || '').toUpperCase() || null };
      await API.registrar(payload);
      const r = await API.login(d.email, d.senha); // entra direto
      API.salvarSessao(r);
      UI.toast('Conta criada! Bem-vindo 💚', 'ok');
      mostrarApp();
    });

    // Alternar login <-> cadastro
    document.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
      const alvo = b.dataset.ir;
      $('#form-login').hidden = alvo !== 'login';
      $('#form-cadastro').hidden = alvo !== 'cadastro';
    }));

    // Conta demo
    $('[data-demo]').addEventListener('click', () => {
      const f = $('#form-login');
      f.email.value = 'demo.joao@connectong.com';
      f.senha.value = 'demo123';
      f.requestSubmit();
    });
  }

  // =========================================================================
  // Delegação global de cliques (data-attributes)
  // =========================================================================
  function ligarCliques() {
    document.addEventListener('click', (e) => {
      const alvo = e.target.closest('[data-rota],[data-aba],[data-necessidade],[data-interesse],[data-chat],[data-concluir],[data-pix],[data-perfil-ong],[data-fav],[data-avaliar],[data-notif]');
      if (!alvo) return;
      if (alvo.dataset.fav) { e.stopPropagation(); return toggleFav(alvo.dataset.fav, alvo); }
      if (alvo.dataset.avaliar) return abrirAvaliar(alvo.dataset.avaliar, alvo.dataset.ong || 'ONG');
      if (alvo.dataset.notif) return tocarNotif(alvo.dataset.notif);
      if (alvo.dataset.perfilOng) return abrirPerfilOng(Number(alvo.dataset.perfilOng));
      if (alvo.dataset.rota) return irPara(alvo.dataset.rota);
      if (alvo.dataset.aba) { matches.aba = alvo.dataset.aba; return pintarMatches(); }
      if (alvo.dataset.necessidade) return abrirNecessidade(Number(alvo.dataset.necessidade));
      if (alvo.dataset.interesse) return demonstrarInteresse(alvo.dataset.interesse, alvo);
      if (alvo.dataset.chat) return abrirChat(alvo.dataset.chat, alvo.dataset.ong || 'ONG');
      if (alvo.dataset.concluir) return concluirMatch(alvo.dataset.concluir);
      if (alvo.dataset.pix) return abrirPix(Number(alvo.dataset.pix));
    });

    $('#btn-perfil').addEventListener('click', () => { irPara('config'); });
    $('#btn-sino').addEventListener('click', abrirNotificacoes);

    window.addEventListener('co:deslogado', () => { UI.toast('Sessão expirada.', 'aviso'); mostrarLogin(); });
  }

  // =========================================================================
  // Init
  // =========================================================================
  function init() {
    aplicarPrefs(lerPrefs());
    montarLogos();
    montarNav();
    ligarAuth();
    ligarCliques();
    if (API.logado()) { $('#view-login').hidden = true; $('#view-login').style.opacity = '0'; $('#view-app').hidden = false; aoEntrar(); }
    else { carregarStatsLogin(); }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
