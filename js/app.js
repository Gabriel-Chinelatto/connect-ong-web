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
    { id: 'inicio',    label: 'Início',    icon: 'ph-house' },
    { id: 'explorar',  label: 'Explorar',  icon: 'ph-magnifying-glass' },
    { id: 'matches',   label: 'Matches',   icon: 'ph-heart' },
    { id: 'campanhas', label: 'Campanhas', icon: 'ph-megaphone' },
    { id: 'dora',      label: 'Dora IA',   icon: 'ph-sparkle' },
  ];
  const TITULOS = {
    inicio: 'Painel de Impacto', explorar: 'Explorar Necessidades',
    matches: 'Meus Matches', campanhas: 'Campanhas', dora: 'Dora — Assistente de Doação',
  };

  function montarNav() {
    $('#nav').innerHTML = ROTAS.map((r) => `
      <button data-rota="${r.id}" data-nav="${r.id}"
        class="nav-btn w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-textGrey hover:bg-gray-50 hover:text-primary transition-colors">
        <i class="ph ${r.icon} text-2xl"></i>
        <span class="hidden lg:block">${r.label}</span>
      </button>`).join('');
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
        <div class="mb-8 slide-up">
          <p class="text-textGrey font-semibold">Olá, ${UI.esc((u?.nome || '').split(' ')[0] || 'doador')} 👋</p>
          <h3 class="text-3xl font-montserrat font-extrabold text-textDark mt-1">Pronto para transformar vidas hoje?</h3>
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
  const VIEWS = { inicio: viewInicio, explorar: viewExplorar, matches: viewMatches, campanhas: viewCampanhas, dora: viewDora };
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
  function mostrarApp() {
    $('#view-login').style.opacity = '0';
    setTimeout(() => {
      $('#view-login').hidden = true;
      $('#view-app').hidden = false;
      pintarPerfil();
      const inicial = (location.hash.replace('#/', '') || 'inicio');
      irPara(inicial);
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
      const alvo = e.target.closest('[data-rota],[data-aba],[data-necessidade],[data-interesse],[data-chat],[data-concluir],[data-pix]');
      if (!alvo) return;
      if (alvo.dataset.rota) return irPara(alvo.dataset.rota);
      if (alvo.dataset.aba) { matches.aba = alvo.dataset.aba; return pintarMatches(); }
      if (alvo.dataset.necessidade) return abrirNecessidade(Number(alvo.dataset.necessidade));
      if (alvo.dataset.interesse) return demonstrarInteresse(alvo.dataset.interesse, alvo);
      if (alvo.dataset.chat) return abrirChat(alvo.dataset.chat, alvo.dataset.ong || 'ONG');
      if (alvo.dataset.concluir) return concluirMatch(alvo.dataset.concluir);
      if (alvo.dataset.pix) return abrirPix(Number(alvo.dataset.pix));
    });

    $('#btn-perfil').addEventListener('click', () => {
      if (confirm('Deseja sair da sua conta?')) { API.sair(); location.hash = ''; mostrarLogin(); }
    });

    window.addEventListener('co:deslogado', () => { UI.toast('Sessão expirada.', 'aviso'); mostrarLogin(); });
  }

  // =========================================================================
  // Init
  // =========================================================================
  function init() {
    montarLogos();
    montarNav();
    ligarAuth();
    ligarCliques();
    if (API.logado()) { $('#view-login').hidden = true; $('#view-login').style.opacity = '0'; $('#view-app').hidden = false; pintarPerfil(); irPara(location.hash.replace('#/', '') || 'inicio'); }
    else { carregarStatsLogin(); }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
