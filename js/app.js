/* =========================================================================
   Connect ONG - Web do Doador
   App: roteador SPA + telas (Início, Explorar, Matches, Campanhas, Dora).
   Todas as telas consomem o backend real via a camada API (js/api.js).
   ========================================================================= */

const App = (() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const root = () => $('#page-root');

  // Lê um arquivo de imagem, redimensiona (canvas) e devolve base64 CRU (sem
  // prefixo data:), igual ao mobile (base64 de bytes reduzidos). max=lado maior.
  function arquivoParaBase64(file, max = 800, q = 0.8) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width: w, height: h } = img;
          if (w > h && w > max) { h = Math.round(h * max / w); w = max; }
          else if (h > max) { w = Math.round(w * max / h); h = max; }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL('image/jpeg', q);
          resolve(dataUrl.split(',')[1]); // remove "data:image/jpeg;base64,"
        };
        img.onerror = reject;
        img.src = fr.result;
      };
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  // Estado leve em memória (cache do que já foi buscado nesta sessão).
  const state = { rota: 'inicio', necessidades: null, categorias: null, campanhas: null };

  // -------------------------------------------------------------------------
  // Marca (injeta o SVG do <template> em todos os .logo-slot)
  // -------------------------------------------------------------------------
  function montarLogos() {
    const tpl = $('#tpl-logo');
    document.querySelectorAll('.logo-slot').forEach((slot) => {
      if (slot.childElementCount) return;
      // Usa a logo real (logo.jpg); se faltar, cai no SVG da marca.
      const img = document.createElement('img');
      img.src = 'assets/img/logo.jpg';
      img.alt = 'Connect ONG';
      img.className = 'w-full h-full object-cover rounded-full';
      img.onerror = () => { const svg = tpl.content.cloneNode(true); img.replaceWith(svg); };
      slot.appendChild(img);
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
    // Grupo exclusivo da web (recursos que só fazem sentido em tela larga)
    { id: 'mapa',      label: 'Mapa de ONGs', icon: 'ph-map-trifold', g: 'w' },
    { id: 'comparar',  label: 'Comparar ONGs', icon: 'ph-scales', g: 'w' },
    { id: 'showcase',  label: 'Modo Quiosque', icon: 'ph-presentation-chart', g: 'w' },
  ];
  const TITULOS = {
    inicio: 'Painel de Impacto', explorar: 'Explorar Necessidades',
    matches: 'Meus Matches', campanhas: 'Campanhas', dora: 'Dora — Assistente de Doação',
    ongs: 'ONGs', favoritos: 'Favoritos', impacto: 'Seu Impacto',
    ranking: 'Ranking de Transparência', doacoes: 'Minhas Doações', config: 'Ajustes',
    sobre: 'Sobre o Connect ONG', atividades: 'Atividades da Comunidade',
    mapa: 'Mapa de ONGs', comparar: 'Comparar ONGs',
  };

  function botaoNav(r) {
    return `<button data-rota="${r.id}" data-nav="${r.id}"
      class="nav-btn w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-textGrey hover:bg-gray-50 hover:text-primary transition-colors">
      <i class="ph ${r.icon} text-2xl"></i><span class="hidden lg:block">${r.label}</span></button>`;
  }
  function montarNav() {
    const p = ROTAS.filter((r) => r.g === 'p').map(botaoNav).join('');
    const s = ROTAS.filter((r) => r.g === 's').map(botaoNav).join('');
    const w = ROTAS.filter((r) => r.g === 'w').map(botaoNav).join('');
    $('#nav').innerHTML = `${p}
      <p class="hidden lg:block text-[11px] font-bold text-textGrey/50 uppercase tracking-wider px-4 mt-4 mb-1">Você</p>
      <hr class="lg:hidden border-gray-100 my-2">
      ${s}
      <p class="hidden lg:flex items-center gap-1 text-[11px] font-bold text-primary/70 uppercase tracking-wider px-4 mt-4 mb-1"><i class="ph-fill ph-globe-hemisphere-west"></i> Exclusivo da web</p>
      <hr class="lg:hidden border-gray-100 my-2">
      ${w}`;
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
  // Mapa necessidadeId -> interesse ({status,id}) do doador, para o botão 3 estados.
  async function getInteresseMapa(force) {
    if (state.interMap && !force) return state.interMap;
    const lista = await API.meusInteresses();
    matches.dados = lista; // reaproveita na tela de Matches
    state.interMap = {};
    for (const i of lista) {
      // guarda o interesse mais relevante por necessidade (ativo > recusado)
      const atual = state.interMap[i.necessidadeId];
      if (!atual || peso(i.status) >= peso(atual.status)) state.interMap[i.necessidadeId] = { status: i.status, id: i.id };
    }
    return state.interMap;
  }
  const peso = (s) => ({ RECUSADO: 1, CONCLUIDO: 2, PENDENTE: 3, ACEITO: 4 }[s] || 0);
  // Estado do botão de interesse de uma necessidade: 'nenhum' | 'demonstrado' | 'reabrir'
  function estadoInteresse(necId) {
    const i = state.interMap && state.interMap[necId];
    if (!i) return 'nenhum';
    if (i.status === 'RECUSADO') return 'reabrir';
    return 'demonstrado';
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
            { r: 'atividades', i: 'ph-pulse', l: 'Atividades' },
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
  const explorar = { termo: '', categoria: 'Todos', urgentes: false };
  async function viewExplorar() {
    root().innerHTML = carregando();
    try {
      const [nec, cats] = await Promise.all([getNecessidades(), getCategorias()]);
      await getInteresseMapa().catch(() => {});
      // Só categorias realmente presentes nos dados (normalizadas, sem duplicar).
      const presentes = [];
      for (const n of nec) { const v = UI.normalizarCat(n.categoria); if (v && !presentes.includes(v)) presentes.push(v); }
      const ordem = UI.CANONICAS.map((c) => c.valor);
      presentes.sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b));
      const chips = ['Todos', ...presentes];
      root().innerHTML = `
        <div class="flex flex-col md:flex-row gap-3 mb-6 slide-up">
          <div class="relative w-full md:w-1/2">
            <i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-textGrey text-xl"></i>
            <input id="busca" value="${UI.esc(explorar.termo)}" placeholder="Buscar itens, ONGs, cidades…"
              class="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 shadow-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary">
          </div>
          <div class="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-1" id="chips">
            ${chips.map((c) => { const rot = c === 'Todos' ? 'Todos' : UI.cat(c).rotulo; const em = c === 'Todos' ? '' : UI.cat(c).emoji + ' ';
              return `<button data-cat="${UI.esc(c)}" class="px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap border transition-colors
              ${c === explorar.categoria ? 'bg-textDark text-white border-textDark' : 'bg-white border-gray-200 text-textGrey hover:border-primary hover:text-primary'}">${em}${UI.esc(rot)}</button>`; }).join('')}
            <button data-urg class="px-4 py-2.5 rounded-full font-bold text-sm whitespace-nowrap border transition-colors ${explorar.urgentes ? 'bg-accent text-white border-accent' : 'bg-white border-gray-200 text-textGrey hover:border-accent hover:text-accent'}">🔥 Urgentes</button>
          </div>
        </div>
        <div id="grid-nec"></div>`;
      pintarGrid(nec);
      $('#busca').addEventListener('input', (e) => { explorar.termo = e.target.value; pintarGrid(nec); });
      $('[data-urg]').addEventListener('click', () => { explorar.urgentes = !explorar.urgentes; viewExplorar(); });
    } catch (e) {
      root().innerHTML = erroBox(e.message, 'explorar');
    }
  }
  function pintarGrid(nec) {
    const t = explorar.termo.trim().toLowerCase();
    const filtrada = nec.filter((n) => {
      if (n.status !== 'ABERTA') return false;
      const catOk = explorar.categoria === 'Todos' || UI.normalizarCat(n.categoria) === explorar.categoria;
      const urgOk = !explorar.urgentes || n.urgente;
      const txt = (n.titulo + ' ' + n.descricao + ' ' + n.ongNome + ' ' + (n.ongCidade || '')).toLowerCase();
      return catOk && urgOk && (!t || txt.includes(t));
    });
    // Ordenação como no mobile: disponíveis primeiro; urgentes acima; recentes antes;
    // quem já tem interesse ativo vai para o fim.
    const grupo = (n) => { const e = estadoInteresse(n.id); return e === 'demonstrado' ? 2 : 0; };
    filtrada.sort((a, b) => grupo(a) - grupo(b)
      || (b.urgente === a.urgente ? 0 : b.urgente ? 1 : -1)
      || new Date(b.dataCriacao) - new Date(a.dataCriacao));
    const g = $('#grid-nec');
    if (!g) return;
    g.innerHTML = filtrada.length
      ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${filtrada.map(cardNecessidade).join('')}</div>`
      : vazio('ph-magnifying-glass', 'Nada encontrado', 'Tente outra busca ou categoria.');
  }

  function seloEstadoNec(necId) {
    const e = estadoInteresse(necId);
    if (e === 'demonstrado') return '<span class="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full flex items-center gap-1"><i class="ph-fill ph-check-circle"></i> Interesse demonstrado</span>';
    if (e === 'reabrir') return '<span class="text-xs font-bold text-textGrey bg-gray-100 px-2.5 py-1 rounded-full">Recusado</span>';
    return '';
  }
  function cardNecessidade(n) {
    const c = UI.cat(n.categoria);
    const selo = seloEstadoNec(n.id);
    return `<article data-necessidade="${n.id}" class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group">
      <div class="h-28 flex items-center justify-center text-5xl ${c.cls}">${c.emoji}</div>
      <div class="p-5">
        <div class="flex items-center justify-between mb-2">
          ${UI.catChip(n.categoria)}
          ${n.urgente ? '<span class="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">Urgente</span>' : ''}
        </div>
        <h4 class="font-montserrat font-bold text-textDark text-lg leading-tight group-hover:text-primary transition-colors">${UI.esc(n.titulo)}</h4>
        <p class="text-sm text-textGrey mt-1 line-clamp-2">${UI.esc(n.descricao || '')}</p>
        ${selo ? `<div class="mt-3">${selo}</div>` : ''}
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
        <div id="area-interesse">${botaoInteresse(n.id)}</div>
      </div>`);
  }
  function botaoInteresse(necId) {
    const e = estadoInteresse(necId);
    if (e === 'demonstrado') {
      return `<button disabled class="w-full mt-6 py-4 bg-primary-light text-primary-dark font-montserrat font-bold uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2">
        <i class="ph-fill ph-check-circle text-xl"></i> Interesse demonstrado</button>
        <button data-rota="matches" class="w-full text-center text-sm font-bold text-primary mt-3">Acompanhar em Matches →</button>`;
    }
    const rot = e === 'reabrir' ? 'Demonstrar novamente' : 'Quero doar isso';
    return `<button data-interesse="${necId}" class="btn-interesse w-full mt-6 py-4 bg-accent hover:bg-accent-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-accent/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2">
      <i class="ph-fill ph-hand-heart text-xl"></i> ${rot}</button>
    <p class="text-center text-xs text-textGrey mt-3">A ONG será avisada e vocês poderão conversar pelo chat.</p>`;
  }

  async function demonstrarInteresse(necessidadeId, btn) {
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i> Enviando…';
    try {
      await API.demonstrarInteresse(Number(necessidadeId));
      state.__matchesDirty = true;
      await getInteresseMapa(true).catch(() => {});
      UI.toast('Interesse enviado! Acompanhe em Matches.', 'ok');
      // Atualiza o botão dentro do modal (sem fechar) e a tela ao fundo.
      const area = $('#area-interesse');
      if (area) area.innerHTML = botaoInteresse(Number(necessidadeId));
      if (state.rota === 'explorar' && state.necessidades) pintarGrid(state.necessidades);
      if (state.rota === 'inicio') viewInicio();
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
      state.interMap = null; await getInteresseMapa().catch(() => {});
      pintarMatches();
    } catch (e) {
      root().innerHTML = erroBox(e.message, 'matches');
    }
  }
  function pintarMatches() {
    const conta = (g) => matches.dados.filter((i) => GRUPOS[g].status.includes(i.status)).length;
    const lista = matches.dados.filter((i) => GRUPOS[matches.aba].status.includes(i.status));
    // Agrupa por ONG (resolve "tudo jogado").
    const grupos = {};
    for (const i of lista) { (grupos[i.ongId] = grupos[i.ongId] || { ong: i, itens: [] }).itens.push(i); }
    root().innerHTML = `
      <div class="flex gap-2 mb-6 border-b border-gray-100 slide-up overflow-x-auto no-scrollbar">
        ${Object.keys(GRUPOS).map((g) => `
          <button data-aba="${g}" class="px-4 py-3 font-bold text-sm border-b-2 whitespace-nowrap transition-colors flex items-center gap-2
            ${g === matches.aba ? 'border-primary text-primary' : 'border-transparent text-textGrey hover:text-textDark'}">
            <i class="ph ${GRUPOS[g].icon}"></i> ${GRUPOS[g].label}
            <span class="text-xs px-2 py-0.5 rounded-full ${g === matches.aba ? 'bg-primary text-white' : 'bg-gray-100 text-textGrey'}">${conta(g)}</span>
          </button>`).join('')}
      </div>
      <div class="slide-up space-y-5">${lista.length ? Object.values(grupos).map(grupoOngCard).join('')
        : vazio('ph-heart', 'Nada aqui ainda', 'Demonstre interesse em uma necessidade para começar um match.')}</div>`;
  }
  function grupoOngCard(g) {
    const o = g.ong;
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
      <button data-perfil-ong="${o.ongId}" class="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 text-left">
        ${UI.avatar(o.ongNome, 'w-11 h-11')}
        <div class="flex-1 min-w-0"><p class="font-montserrat font-bold text-textDark truncate">${UI.esc(o.ongNome)}</p>
          <p class="text-xs text-textGrey">${g.itens.length} doação(ões) · ver perfil</p></div>
        <i class="ph ph-caret-right text-textGrey"></i>
      </button>
      <div class="divide-y divide-gray-100">${g.itens.map(rowMatch).join('')}</div>
    </div>`;
  }
  function rowMatch(i) {
    const badge = { ACEITO: 'bg-green-100 text-green-700', PENDENTE: 'bg-yellow-100 text-yellow-700',
      RECUSADO: 'bg-red-100 text-red-600', CONCLUIDO: 'bg-primary-light text-primary-dark' }[i.status] || 'bg-gray-100 text-gray-600';
    const rotulo = { ACEITO: 'Match aceito', PENDENTE: 'Aguardando ONG', RECUSADO: 'Recusado', CONCLUIDO: 'Concluído' }[i.status] || i.status;
    let acoes = '';
    if (i.status === 'ACEITO') acoes = `
      <button data-chat="${i.id}" data-ong="${UI.esc(i.ongNome)}" data-ongid="${i.ongId}" class="px-3 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl flex items-center gap-1"><i class="ph-fill ph-chat-circle-text"></i> Conversar</button>
      <button data-concluir="${i.id}" class="px-3 py-2 bg-white border border-primary text-primary font-bold text-sm rounded-xl hover:bg-primary-light">Concluir</button>`;
    else if (i.status === 'CONCLUIDO') acoes = `
      <button data-avaliar="${i.ongId}" data-ong="${UI.esc(i.ongNome)}" class="px-3 py-2 bg-accent hover:bg-accent-dark text-white font-bold text-sm rounded-xl flex items-center gap-1"><i class="ph-fill ph-star"></i> Avaliar</button>
      <button data-prestacao="${i.id}" data-ong="${UI.esc(i.ongNome)}" class="px-3 py-2 bg-white border border-gray-200 text-textGrey hover:border-primary hover:text-primary font-bold text-sm rounded-xl">Prestação</button>
      <button data-chat="${i.id}" data-ong="${UI.esc(i.ongNome)}" data-ongid="${i.ongId}" data-concluido="1" class="px-3 py-2 bg-white border border-gray-200 text-textGrey hover:border-primary hover:text-primary font-bold text-sm rounded-xl">Histórico</button>`;
    else if (i.status === 'RECUSADO') acoes = `
      <button data-redemo="${i.necessidadeId}" class="px-3 py-2 bg-accent hover:bg-accent-dark text-white font-bold text-sm rounded-xl flex items-center gap-1"><i class="ph ph-arrow-counter-clockwise"></i> Demonstrar novamente</button>`;
    return `<div class="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-bold text-textDark leading-tight">${UI.esc(i.necessidadeTitulo || 'Doação')}</p>
        <div class="flex items-center gap-2 mt-1 text-xs text-textGrey">
          <span class="px-2.5 py-1 rounded-full font-bold ${badge}">${rotulo}</span>
          ${i.diasEsperando ? `<span><i class="ph ph-clock"></i> ${i.diasEsperando} dia(s)</span>` : ''}
        </div>
      </div>
      <div class="flex gap-2 flex-shrink-0 flex-wrap">${acoes}</div>
    </div>`;
  }
  async function concluirMatch(id) {
    if (!confirm('Confirmar que esta doação foi concluída?')) return;
    try { await API.concluirInteresse(Number(id)); UI.toast('Doação concluída! 🎉', 'ok'); state.__matchesDirty = true; viewMatches(); }
    catch (e) { UI.toast(e.message, 'erro'); }
  }
  async function reDemonstrarMatch(necId) {
    try { await API.demonstrarInteresse(Number(necId)); UI.toast('Interesse reenviado!', 'ok'); state.__matchesDirty = true; viewMatches(); }
    catch (e) { UI.toast(e.message, 'erro'); }
  }
  async function abrirPrestacoes(interesseId, ongNome) {
    abrirModal(carregando('Carregando…'), 'max-w-lg');
    try {
      const lista = await API.prestacoes(Number(interesseId));
      $('#modal-card').innerHTML = `<div class="p-6">
        <h3 class="text-xl font-montserrat font-bold text-textDark mb-4">Prestação de contas · ${UI.esc(ongNome)}</h3>
        ${(lista && lista.length) ? `<div class="space-y-3">${lista.map((pr) => `<div class="p-4 bg-background rounded-2xl">
          <div class="flex items-center justify-between"><p class="font-bold text-textDark">${UI.esc(pr.titulo || 'Prestação')}</p><span class="text-xs text-textGrey">${UI.dataCurta(pr.dataCriacao)}</span></div>
          ${pr.descricao ? `<p class="text-sm text-textGrey mt-1">${UI.esc(pr.descricao)}</p>` : ''}
          ${(pr.fotos && pr.fotos.length) ? `<div class="flex gap-2 mt-2 overflow-x-auto no-scrollbar">${pr.fotos.map((f) => `<img src="${UI.fotoSrc(f)}" data-ver-img="${UI.fotoSrc(f)}" class="w-24 h-24 rounded-lg object-cover cursor-pointer flex-shrink-0">`).join('')}</div>` : ''}
        </div>`).join('')}</div>` : vazio('ph-receipt', 'Sem prestação ainda', 'A ONG ainda não publicou a prestação de contas desta doação.')}
      </div>`;
    } catch (e) { $('#modal-card').innerHTML = `<div class="p-6">${erroBox(e.message)}</div>`; }
  }

  // =========================================================================
  // CHAT (completo: foto, digitando, visto por último, reações, só-leitura)
  // =========================================================================
  const REACOES = { LIKE: '👍', LOVE: '❤️', LAUGH: '😂', WOW: '😮', SAD: '😢', PRAY: '🙏' };
  let chatPoll = null, chatBloqueado = false, chatDigitou = 0;
  function textoVisto(s) {
    if (!s) return 'Chat da doação';
    if (s.digitando) return 'digitando…';
    if (s.online) return 'online';
    const ep = s.ultimoVistoEpoch || s.ultimoVisto;
    if (!ep) return 'Chat da doação';
    const d = new Date(ep); const hoje = new Date();
    const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === hoje.toDateString()) return 'visto hoje às ' + hm;
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === ontem.toDateString()) return 'visto ontem às ' + hm;
    return 'visto em ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + hm;
  }
  async function abrirChat(interesseId, ongNome, ongId, concluido) {
    const iid = Number(interesseId);
    chatBloqueado = false;
    abrirModal(`
      <div class="flex items-center gap-3 p-4 border-b border-gray-100">
        ${ongId ? `<button data-perfil-ong="${ongId}" class="flex items-center gap-3 flex-1 min-w-0 text-left">` : '<div class="flex items-center gap-3 flex-1 min-w-0">'}
          ${UI.avatar(ongNome, 'w-10 h-10')}
          <div class="flex-1 min-w-0"><p class="font-bold text-textDark truncate">${UI.esc(ongNome)}</p><p id="chat-status" class="text-xs text-textGrey truncate">${concluido ? 'Histórico da conversa' : 'Chat da doação'}</p></div>
        ${ongId ? '</button>' : '</div>'}
      </div>
      <div id="chat-msgs" class="h-[52vh] overflow-y-auto p-4 space-y-1 bg-background"></div>
      ${concluido ? `<div class="p-4 text-center text-sm text-textGrey border-t border-gray-100"><i class="ph ph-check-circle text-primary"></i> Doação concluída — histórico somente leitura.</div>`
        : `<div id="chat-bloqueio" class="hidden p-4 text-center text-sm text-red-600 border-t border-gray-100"><i class="ph ph-prohibit"></i> Você não pode enviar mensagens para esta ONG.</div>
      <form id="chat-form" class="p-3 border-t border-gray-100 flex items-center gap-2">
        <button type="button" id="chat-anexo-btn" class="w-11 h-11 flex-shrink-0 rounded-2xl bg-background hover:bg-gray-100 text-textGrey flex items-center justify-center"><i class="ph ph-image text-xl"></i></button>
        <input id="chat-anexo" type="file" accept="image/*" class="hidden">
        <input id="chat-input" placeholder="Escreva uma mensagem…" autocomplete="off" class="flex-1 px-4 py-3 bg-background rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary">
        <button class="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-2xl flex items-center justify-center flex-shrink-0"><i class="ph-fill ph-paper-plane-right text-xl"></i></button>
      </form>`}`, 'max-w-lg', () => { if (chatPoll) clearInterval(chatPoll); chatPoll = null; });

    async function carregar() {
      try {
        const [msgs, st] = await Promise.all([API.mensagens(iid), concluido ? Promise.resolve(null) : API.statusChat(iid).catch(() => null)]);
        const box = $('#chat-msgs'); if (!box) return;
        const noFim = box.scrollTop + box.clientHeight >= box.scrollHeight - 60;
        box.innerHTML = msgs.length ? msgs.map(bolhaMsg).join('') : `<p class="text-center text-sm text-textGrey py-10">Envie a primeira mensagem 👋</p>`;
        if (noFim) box.scrollTop = box.scrollHeight;
        const stEl = $('#chat-status'); if (stEl && st) stEl.textContent = textoVisto(st);
      } catch (e) { /* silencioso */ }
    }
    await carregar();
    const box0 = $('#chat-msgs'); if (box0) box0.scrollTop = box0.scrollHeight;
    chatPoll = setInterval(carregar, 3000);

    if (concluido) return;
    // Envio de texto
    $('#chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const inp = $('#chat-input'); const texto = inp.value.trim();
      if (!texto || chatBloqueado) return;
      inp.value = '';
      try { await API.enviarMensagem(iid, texto); await carregar(); }
      catch (err) { tratarEnvioErro(err, texto, inp); }
    });
    // "Digitando" (throttle 2s)
    $('#chat-input').addEventListener('input', () => {
      const agora = Date.now();
      if (agora - chatDigitou > 2000) { chatDigitou = agora; API.digitando(iid).catch(() => {}); }
    });
    // Anexo de foto
    $('#chat-anexo-btn').addEventListener('click', () => $('#chat-anexo').click());
    $('#chat-anexo').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f || chatBloqueado) return;
      try {
        const b64 = await arquivoParaBase64(f, 800, 0.8);
        await API.enviarMensagem(iid, '', b64); await carregar();
      } catch (err) { tratarEnvioErro(err); }
      e.target.value = '';
    });
  }
  function tratarEnvioErro(err, texto, inp) {
    if (/bloque|403/i.test(err.message)) {
      chatBloqueado = true;
      const bl = $('#chat-bloqueio'), fm = $('#chat-form');
      if (bl) bl.classList.remove('hidden'); if (fm) fm.classList.add('hidden');
    } else { UI.toast(err.message, 'erro'); if (inp && texto) inp.value = texto; }
  }
  function bolhaMsg(m) {
    const meu = m.remetente === 'DOADOR';
    const img = m.anexoBase64 ? `<img src="${UI.fotoSrc(m.anexoBase64)}" data-ver-img="${UI.fotoSrc(m.anexoBase64)}" class="rounded-xl max-w-full mb-1 cursor-pointer" style="max-height:220px">` : '';
    // Reações agregadas
    const rc = {};
    (m.reacoes || []).forEach((r) => { const e = REACOES[r.emoji] || r.emoji; rc[e] = (rc[e] || 0) + 1; });
    const chips = Object.entries(rc).map(([e, n]) => `<span class="text-xs bg-white/90 text-textDark rounded-full px-1.5 py-0.5 shadow-sm">${e}${n > 1 ? ' ' + n : ''}</span>`).join('');
    const check = meu ? `<i class="ph${m.lida ? '-fill' : ''} ph-checks text-[13px] ${m.lida ? 'text-sky-300' : 'text-white/70'}"></i>` : '';
    return `<div class="group flex ${meu ? 'justify-end' : 'justify-start'} items-end gap-1">
      ${!meu ? `<button data-reagir="${m.id}" class="opacity-0 group-hover:opacity-100 transition-opacity text-textGrey hover:text-primary mb-1"><i class="ph ph-smiley text-lg"></i></button>` : ''}
      <div class="relative max-w-[75%] px-3 py-2 rounded-2xl ${meu ? 'bg-primary text-white rounded-br-md' : 'bg-white text-textDark rounded-bl-md shadow-sm'}">
        ${img}
        ${m.conteudo ? `<p class="text-sm leading-snug">${UI.esc(m.conteudo)}</p>` : ''}
        <p class="text-[10px] ${meu ? 'text-white/70' : 'text-textGrey'} text-right mt-1 flex items-center justify-end gap-1">${UI.horaCurta(m.dataEnvio)} ${check}</p>
        ${chips ? `<div class="absolute -bottom-2 ${meu ? 'left-2' : 'right-2'} flex gap-1">${chips}</div>` : ''}
      </div>
      ${meu ? `<button data-reagir="${m.id}" class="opacity-0 group-hover:opacity-100 transition-opacity text-textGrey hover:text-primary mb-1"><i class="ph ph-smiley text-lg"></i></button>` : ''}
    </div>`;
  }
  function abrirReacao(mensagemId) {
    abrirModal(`<div class="p-6 text-center">
      <h3 class="font-bold text-textDark mb-4">Reagir</h3>
      <div class="flex justify-center gap-3">${Object.entries(REACOES).map(([cod, em]) => `<button data-emoji="${cod}" class="text-3xl hover:scale-125 transition-transform">${em}</button>`).join('')}</div>
    </div>`, 'max-w-xs');
    $('#modal-card').querySelectorAll('[data-emoji]').forEach((b) => b.addEventListener('click', async () => {
      try { await API.reagir(Number(mensagemId), b.dataset.emoji); fecharModal(); }
      catch (e) { UI.toast(e.message, 'erro'); }
    }));
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
  async function gerarPix(c) {
    const valor = Number($('#pix-valor').value);
    if (!valor || valor < 1) { UI.toast('Informe um valor válido.', 'aviso'); return; }
    const btn0 = $('#pix-confirmar'); if (btn0) { btn0.disabled = true; btn0.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i> Gerando…'; }
    let codigo;
    try { const r = await API.gerarCodigoPix(valor); codigo = (r && r.codigoPix) || ''; }
    catch (e) { UI.toast(e.message, 'erro'); if (btn0) { btn0.disabled = false; btn0.innerHTML = '<i class="ph-fill ph-pix-logo text-xl"></i> Gerar PIX'; } return; }
    // Fase 2: mostra o código PIX real (copia e cola) + QR.
    $('#modal-card').innerHTML = `
      <div class="p-7 text-center">
        <h3 class="text-xl font-montserrat font-bold text-textDark mb-1">Pague ${UI.brl(valor)} via PIX</h3>
        <p class="text-sm text-textGrey mb-5">Copie o código e pague no seu banco</p>
        <div class="w-44 h-44 mx-auto bg-white border-4 border-primary rounded-2xl flex items-center justify-center mb-4"><i class="ph ph-qr-code text-8xl text-primary"></i></div>
        <div class="flex items-center gap-2 bg-background rounded-xl p-3 mb-5">
          <code class="text-xs text-textGrey truncate flex-1 text-left">${UI.esc(codigo)}</code>
          <button id="pix-copiar" class="text-primary font-bold text-xs flex-shrink-0"><i class="ph ph-copy"></i> Copiar</button>
        </div>
        <button id="pix-pago" class="w-full py-4 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-60 flex items-center justify-center gap-2"><i class="ph-fill ph-check-circle text-xl"></i> Já paguei</button>
      </div>`;
    $('#pix-copiar').addEventListener('click', () => { navigator.clipboard?.writeText(codigo); UI.toast('Código copiado!', 'info'); });
    $('#pix-pago').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i> Confirmando…';
      try {
        // Fase 3: registra a doação financeira real e recebe o comprovante.
        const comp = await API.doarFinanceiro({ ongId: c.ongId, doadorId: API.usuario().id, valor, codigoPix: codigo, campanhaId: c.id });
        mostrarComprovante(comp || { valor, ongNome: c.ongNome, campanhaTitulo: c.titulo });
        state.campanhas = null;
        if (state.rota === 'campanhas') viewCampanhas();
      } catch (err) {
        btn.disabled = false; btn.innerHTML = '<i class="ph-fill ph-check-circle text-xl"></i> Já paguei'; UI.toast(err.message, 'erro');
      }
    });
  }
  function mostrarComprovante(d) {
    $('#modal-card').innerHTML = `
      <div class="p-7 text-center">
        <div class="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3 text-primary"><i class="ph-fill ph-check-circle text-4xl"></i></div>
        <h3 class="text-xl font-montserrat font-extrabold text-textDark">Doação confirmada!</h3>
        <p class="text-4xl font-montserrat font-black text-primary my-3">${UI.brl(d.valor)}</p>
        <div class="bg-background rounded-2xl p-4 text-left text-sm space-y-2">
          <div class="flex justify-between"><span class="text-textGrey">Para</span><span class="font-bold text-textDark">${UI.esc(d.ongNome || '')}</span></div>
          ${d.campanhaTitulo ? `<div class="flex justify-between"><span class="text-textGrey">Campanha</span><span class="font-bold text-textDark">${UI.esc(d.campanhaTitulo)}</span></div>` : ''}
          <div class="flex justify-between"><span class="text-textGrey">Status</span><span class="font-bold text-primary">${UI.esc(d.status || 'CONFIRMADO')}</span></div>
          ${d.dataCriacao ? `<div class="flex justify-between"><span class="text-textGrey">Data</span><span class="font-bold text-textDark">${UI.dataCurta(d.dataCriacao)} ${UI.horaCurta(d.dataCriacao)}</span></div>` : ''}
          ${d.id ? `<div class="flex justify-between"><span class="text-textGrey">Comprovante</span><span class="font-bold text-textDark">#${d.id}</span></div>` : ''}
        </div>
        <button id="comp-ok" class="w-full mt-5 py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl">Concluir</button>
      </div>`;
    $('#comp-ok').addEventListener('click', () => { fecharModal(); UI.toast('Obrigado pela sua doação 💚', 'ok'); });
  }

  // =========================================================================
  // TELA: DORA (assistente IA) — com histórico de conversas (localStorage)
  // Espelha conversas_dora_service.dart do mobile.
  // =========================================================================
  const DORA_KEY = 'dora_conversas_v2';
  const DoraStore = {
    _ler() { try { return JSON.parse(localStorage.getItem(DORA_KEY) || '[]'); } catch { return []; } },
    _gravar(l) { localStorage.setItem(DORA_KEY, JSON.stringify(l)); },
    listar() { return this._ler().sort((a, b) => (b.fixado - a.fixado) || (b.atualizadoEm - a.atualizadoEm)); },
    obter(id) { return this._ler().find((c) => c.id === id) || null; },
    salvar(conv) {
      if (!conv.mensagens.some((m) => m.papel === 'user')) return; // não grava sem msg do usuário
      const l = this._ler(); const i = l.findIndex((c) => c.id === conv.id);
      conv.atualizadoEm = (l[i] ? l[i].atualizadoEm : 0) + 1; // contador monotônico (Date.now indisponível)
      if (!conv.titulo) conv.titulo = this.tituloDerivado(conv.mensagens);
      if (i >= 0) l[i] = conv; else l.push(conv);
      this._gravar(l);
    },
    excluir(id) { this._gravar(this._ler().filter((c) => c.id !== id)); },
    renomear(id, titulo) { const l = this._ler(); const c = l.find((x) => x.id === id); if (c) { c.titulo = titulo; this._gravar(l); } },
    fixar(id) { const l = this._ler(); const c = l.find((x) => x.id === id); if (c) { c.fixado = !c.fixado; this._gravar(l); } },
    tituloDerivado(msgs) { const m = msgs.find((x) => x.papel === 'user'); const t = (m && m.texto || 'Conversa').trim(); return t.length > 40 ? t.slice(0, 40) + '…' : t; },
  };
  let doraSeq = 1;
  const dora = { conv: null, anexo: null, historico: [] };
  function doraNova() { dora.conv = { id: 'c' + (doraSeq++) + '_' + (DoraStore.listar().length), titulo: '', fixado: false, atualizadoEm: 0, mensagens: [] }; dora.anexo = null; }

  async function viewDora() {
    if (!dora.conv) { const ult = DoraStore.listar()[0]; if (ult) dora.conv = ult; else doraNova(); }
    root().innerHTML = `
      <div class="flex gap-4" style="height:calc(100vh - 170px)">
        <aside class="hidden md:flex w-64 flex-col bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex-shrink-0">
          <div class="p-3 border-b border-gray-100"><button id="dora-nova" class="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"><i class="ph ph-plus"></i> Nova conversa</button></div>
          <div id="dora-lista" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
        </aside>
        <div class="flex-1 flex flex-col bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden min-w-0">
          <div class="flex items-center gap-3 p-4 border-b border-gray-100">
            <button id="dora-menu" class="md:hidden w-9 h-9 rounded-lg bg-background flex items-center justify-center"><i class="ph ph-list text-lg"></i></button>
            <div class="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center overflow-hidden flex-shrink-0"><img src="assets/img/dora_mascote.svg" alt="Dora" class="w-full h-full object-contain" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'ph-fill ph-sparkle text-xl text-primary'}))"></div>
            <div class="flex-1 min-w-0"><p class="font-montserrat font-bold text-textDark truncate">Dora</p><p class="text-xs text-textGrey">Assistente de doações • IA</p></div>
            <button id="dora-nova2" class="md:hidden w-9 h-9 rounded-lg bg-background flex items-center justify-center"><i class="ph ph-plus text-lg"></i></button>
          </div>
          <div id="dora-msgs" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
          <div id="dora-preview" class="hidden px-4 pt-2"></div>
          <form id="dora-form" class="p-3 border-t border-gray-100 flex items-center gap-2">
            <button type="button" id="dora-anexo-btn" class="w-11 h-11 flex-shrink-0 rounded-2xl bg-background hover:bg-gray-100 text-textGrey flex items-center justify-center"><i class="ph ph-image text-xl"></i></button>
            <input id="dora-anexo" type="file" accept="image/*" class="hidden">
            <input id="dora-input" placeholder="Pergunte à Dora o que doar, para quem…" autocomplete="off" class="flex-1 px-4 py-3 bg-background rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary">
            <button class="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-2xl flex items-center justify-center flex-shrink-0"><i class="ph-fill ph-paper-plane-right text-xl"></i></button>
          </form>
        </div>
      </div>`;
    renderDoraLista();
    renderDoraMsgs();
    $('#dora-nova').addEventListener('click', () => { doraNova(); viewDora(); });
    $('#dora-nova2').addEventListener('click', () => { doraNova(); viewDora(); });
    $('#dora-menu').addEventListener('click', abrirDoraListaModal);
    $('#dora-form').addEventListener('submit', enviarDora);
    $('#dora-anexo-btn').addEventListener('click', () => $('#dora-anexo').click());
    $('#dora-anexo').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      dora.anexo = await arquivoParaBase64(f, 1024, 0.7);
      const pv = $('#dora-preview'); pv.classList.remove('hidden');
      pv.innerHTML = `<div class="inline-flex items-center gap-2 bg-background rounded-xl p-1.5"><img src="${UI.fotoSrc(dora.anexo)}" class="w-12 h-12 rounded-lg object-cover"><button type="button" id="dora-rm-anexo" class="text-textGrey hover:text-red-500 pr-1"><i class="ph ph-x"></i></button></div>`;
      $('#dora-rm-anexo').addEventListener('click', () => { dora.anexo = null; pv.classList.add('hidden'); pv.innerHTML = ''; });
      e.target.value = '';
    });
  }
  function itemConversa(c) {
    const ativo = dora.conv && c.id === dora.conv.id;
    return `<div class="group flex items-center rounded-xl ${ativo ? 'bg-primary-light' : 'hover:bg-gray-50'}">
      <button data-dora-abrir="${c.id}" class="flex-1 min-w-0 text-left px-3 py-2.5 flex items-center gap-2">
        ${c.fixado ? '<i class="ph-fill ph-push-pin text-xs text-accent"></i>' : ''}
        <span class="truncate text-sm font-semibold ${ativo ? 'text-primary-dark' : 'text-textDark'}">${UI.esc(c.titulo || 'Nova conversa')}</span>
      </button>
      <button data-dora-menu="${c.id}" class="opacity-0 group-hover:opacity-100 px-2 text-textGrey hover:text-textDark"><i class="ph ph-dots-three-vertical"></i></button>
    </div>`;
  }
  function renderDoraLista() {
    const el = $('#dora-lista'); if (!el) return;
    const l = DoraStore.listar();
    el.innerHTML = l.length ? l.map(itemConversa).join('') : '<p class="text-xs text-textGrey text-center p-4">Nenhuma conversa ainda.</p>';
  }
  function abrirDoraListaModal() {
    const l = DoraStore.listar();
    abrirModal(`<div class="p-4">
      <div class="flex items-center justify-between mb-3"><h3 class="font-bold text-textDark">Conversas</h3><button id="dm-nova" class="text-sm font-bold text-primary">+ Nova</button></div>
      <div class="space-y-1 max-h-[60vh] overflow-y-auto">${l.length ? l.map(itemConversa).join('') : '<p class="text-xs text-textGrey text-center p-4">Nenhuma conversa.</p>'}</div>
    </div>`, 'max-w-xs');
    $('#dm-nova').addEventListener('click', () => { doraNova(); fecharModal(); viewDora(); });
  }
  function doraMenuConversa(id) {
    const c = DoraStore.obter(id); if (!c) return;
    abrirModal(`<div class="p-4 space-y-1">
      <button id="dmc-fixar" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 font-semibold text-textDark flex items-center gap-2"><i class="ph ph-push-pin"></i> ${c.fixado ? 'Desafixar' : 'Fixar'}</button>
      <button id="dmc-renomear" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 font-semibold text-textDark flex items-center gap-2"><i class="ph ph-pencil-simple"></i> Renomear</button>
      <button id="dmc-excluir" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 font-semibold text-red-600 flex items-center gap-2"><i class="ph ph-trash"></i> Excluir</button>
    </div>`, 'max-w-xs');
    $('#dmc-fixar').addEventListener('click', () => { DoraStore.fixar(id); fecharModal(); viewDora(); });
    $('#dmc-excluir').addEventListener('click', () => { DoraStore.excluir(id); if (dora.conv && dora.conv.id === id) dora.conv = null; fecharModal(); viewDora(); });
    $('#dmc-renomear').addEventListener('click', () => {
      const novo = prompt('Novo nome da conversa:', c.titulo || '');
      if (novo != null && novo.trim()) { DoraStore.renomear(id, novo.trim()); if (dora.conv && dora.conv.id === id) dora.conv.titulo = novo.trim(); }
      fecharModal(); viewDora();
    });
  }
  function renderDoraMsgs() {
    const box = $('#dora-msgs'); if (!box) return;
    const u = API.usuario();
    if (!dora.conv.mensagens.length) {
      const chips = ['Tenho roupas para doar', 'ONGs perto de mim', 'Quero ajudar animais', 'Como funciona a doação?'];
      box.innerHTML = doraBolha({ papel: 'assistente', texto: `Oi, ${UI.esc((u?.nome || '').split(' ')[0] || '')}! Sou a Dora 🌱 Posso sugerir o que doar, achar ONGs perto de você ou tirar dúvidas.` })
        + `<div class="flex flex-wrap gap-2 mt-2">${chips.map((c) => `<button data-dora-chip="${UI.esc(c)}" class="px-3 py-2 bg-background hover:bg-primary-light rounded-full text-sm font-semibold text-textDark border border-gray-200">${c}</button>`).join('')}</div>`;
      box.querySelectorAll('[data-dora-chip]').forEach((b) => b.addEventListener('click', () => { $('#dora-input').value = b.dataset.doraChip; $('#dora-form').requestSubmit(); }));
    } else {
      box.innerHTML = dora.conv.mensagens.map(doraBolha).join('');
    }
    box.scrollTop = box.scrollHeight;
  }
  function doraBolha(m) {
    const meu = m.papel === 'user';
    const img = m.imagemBase64 ? `<img src="${UI.fotoSrc(m.imagemBase64)}" data-ver-img="${UI.fotoSrc(m.imagemBase64)}" class="rounded-xl max-w-[200px] mb-2 cursor-pointer">` : '';
    const cards = (m.sugestoes && m.sugestoes.length) ? `<div class="mt-2 space-y-2">${m.sugestoes.map((s) => {
      const attr = s.tipo === 'ONG' ? `data-perfil-ong="${s.id}"` : `data-necessidade="${s.id}"`;
      const ic = s.tipo === 'ONG' ? 'ph-buildings' : 'ph-hand-heart';
      return `<button ${attr} class="w-full text-left flex items-center gap-2 bg-white/90 hover:bg-white text-textDark rounded-xl p-2.5 border border-gray-200"><i class="ph-fill ${ic} text-primary text-lg"></i><span class="flex-1 min-w-0"><span class="block font-bold text-sm truncate">${UI.esc(s.titulo)}</span><span class="block text-xs text-textGrey truncate">${UI.esc(s.subtitulo || '')}</span></span><i class="ph ph-caret-right text-textGrey"></i></button>`;
    }).join('')}</div>` : '';
    const regras = m.modoRegras ? '<span class="inline-block mt-1 text-[10px] font-bold text-textGrey bg-gray-100 rounded-full px-2 py-0.5">Modo básico</span>' : '';
    return `<div class="flex ${meu ? 'justify-end' : 'justify-start'}">
      <div class="max-w-[85%] px-4 py-3 rounded-2xl ${meu ? 'bg-primary text-white rounded-br-md' : 'bg-background text-textDark rounded-bl-md'}">
        ${img}${m.texto ? `<p class="text-sm leading-relaxed whitespace-pre-line">${UI.esc(m.texto)}</p>` : ''}${cards}${regras}
      </div></div>`;
  }
  async function enviarDora(e) {
    e.preventDefault();
    const inp = $('#dora-input');
    const texto = inp.value.trim();
    const anexo = dora.anexo;
    if (!texto && !anexo) return;
    inp.value = ''; dora.anexo = null;
    const pv = $('#dora-preview'); if (pv) { pv.classList.add('hidden'); pv.innerHTML = ''; }
    dora.conv.mensagens.push({ papel: 'user', texto: texto || (anexo ? 'O que você acha desta imagem?' : ''), imagemBase64: anexo });
    renderDoraMsgs();
    const box = $('#dora-msgs');
    box.insertAdjacentHTML('beforeend', `<div id="dora-typing" class="flex justify-start"><div class="px-4 py-3 bg-background rounded-2xl rounded-bl-md text-textGrey"><i class="ph ph-circle-notch spin"></i> ${anexo ? 'Analisando a imagem…' : 'Dora está pensando…'}</div></div>`);
    box.scrollTop = box.scrollHeight;
    try {
      const hist = dora.conv.mensagens.slice(-12).map((m) => ({ papel: m.papel, texto: m.texto }));
      const resp = await API.assistente(texto || 'Analise esta imagem.', hist, API.usuario()?.cidade, anexo);
      const txt = (resp && (resp.resposta || resp.mensagem)) || 'Desculpe, não consegui responder agora.';
      dora.conv.mensagens.push({ papel: 'assistente', texto: txt, sugestoes: resp && resp.sugestoes || [], modoRegras: resp && resp.modo === 'regras' });
      DoraStore.salvar(dora.conv);
      renderDoraLista(); renderDoraMsgs();
    } catch (err) {
      $('#dora-typing')?.remove();
      dora.conv.mensagens.push({ papel: 'assistente', texto: 'Ops: ' + err.message });
      renderDoraMsgs();
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
    const capa = UI.fotoSrc(o.capaBase64);
    return `<div data-perfil-ong="${o.id}" class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer group">
      <div class="h-16 relative ${capa ? '' : 'bg-gradient-to-r from-primary to-primary-dark'}" ${capa ? `style="background-image:url('${capa}');background-size:cover;background-position:center"` : ''}>
        <button data-fav="${o.id}" class="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center ${fav ? 'text-accent' : 'text-gray-400 hover:text-accent'} shadow"><i class="ph${fav ? '-fill' : ''} ph-star text-lg"></i></button>
      </div>
      <div class="px-5 pb-5">
        <div class="w-14 h-14 rounded-2xl border-4 border-white -mt-7 relative bg-white">${UI.avatar(o.nome, 'w-full h-full text-base rounded-xl')}
          ${o.verificada ? '<span class="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center"><i class="ph-fill ph-seal-check text-primary text-sm"></i></span>' : ''}
        </div>
        <p class="font-montserrat font-bold text-textDark leading-tight mt-2 group-hover:text-primary transition-colors">${UI.esc(o.nome)}</p>
        <p class="text-xs text-textGrey mt-0.5"><i class="ph ph-map-pin"></i> ${UI.esc(o.cidade || 'Brasil')}</p>
        <div class="mt-1">${UI.estrelas(o.notaMedia)} <span class="text-xs text-textGrey">${(Number(o.notaMedia) || 0).toFixed(1)} (${o.totalAvaliacoes || 0})</span></div>
        <p class="text-sm text-textGrey mt-2 line-clamp-2">${UI.esc(o.descricao || 'Sem descrição.')}</p>
      </div>
    </div>`;
  }

  async function abrirPerfilOng(ongId) {
    abrirModal(carregando('Carregando perfil…'), 'max-w-2xl');
    try {
      const [p] = await Promise.all([API.perfilOng(ongId), carregarFavIds()]);
      if (p.bloqueado) { $('#modal-card').innerHTML = `<div class="p-8 text-center">${vazio('ph-prohibit', 'Perfil indisponível', 'Esta ONG não está disponível no momento.')}</div>`; return; }
      state.perfilOngAtual = p;
      const fav = state.favIds.has(Number(ongId));
      const nv = NIVEL[p.nivelTransparencia] || {};
      const necAbertas = (p.necessidades || []).filter((n) => n.status === 'ABERTA');
      const capa = UI.fotoSrc(p.capaBase64);
      const enderecoQ = encodeURIComponent((p.endereco || '') + ' ' + (p.cidade || ''));
      $('#modal-card').innerHTML = `
        <!-- Capa -->
        <div class="h-32 rounded-t-3xl relative overflow-hidden ${capa ? '' : 'bg-gradient-to-r from-primary to-primary-dark'}"
          ${capa ? `style="background-image:url('${capa}');background-size:cover;background-position:center"` : ''}>
          ${capa ? '<div class="absolute inset-0 bg-black/45"></div>' : ''}
        </div>
        <div class="px-6 pb-6">
          <!-- Avatar sobreposto -->
          <div class="w-20 h-20 rounded-2xl border-4 border-white shadow -mt-10 relative bg-white">${UI.avatar(p.nome, 'w-full h-full text-2xl rounded-xl')}
            ${p.verificada ? '<span class="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center"><i class="ph-fill ph-seal-check text-primary"></i></span>' : ''}
          </div>
          <h3 class="text-2xl font-montserrat font-extrabold text-textDark mt-3">${UI.esc(p.nome)}</h3>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-textGrey">
            <span><i class="ph ph-map-pin"></i> ${UI.esc(p.cidade || 'Brasil')}</span>
            <span>${UI.estrelas(p.notaMedia)} ${(p.notaMedia || 0).toFixed(1)} (${p.totalAvaliacoes || 0})</span>
            ${p.nivelTransparencia ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold ${nv.cls || 'bg-gray-100'}">${nv.emoji || ''} ${p.nivelTransparencia} · ${p.transparenciaScore || 0} pts</span>` : ''}
            ${p.diasNoTopo ? `<span class="text-accent font-bold">🔥 ${p.diasNoTopo}d no topo</span>` : ''}
          </div>

          <!-- Ações (linha própria, sem sobrepor a capa) -->
          <div class="grid grid-cols-4 gap-2 mt-4">
            <button data-fav="${p.id}" class="py-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 ${fav ? 'bg-accent-light text-accent border-accent' : 'border-gray-200 text-textGrey hover:border-accent hover:text-accent'}"><i class="ph${fav ? '-fill' : ''} ph-star text-lg"></i> ${fav ? 'Favorita' : 'Favoritar'}</button>
            <button data-avaliar="${p.id}" data-ong="${UI.esc(p.nome)}" class="py-2.5 rounded-xl border border-gray-200 text-textGrey hover:border-primary hover:text-primary text-xs font-bold flex flex-col items-center gap-1"><i class="ph ph-star-half text-lg"></i> Avaliar</button>
            <button data-share-ong="${p.id}" class="py-2.5 rounded-xl border border-gray-200 text-textGrey hover:border-primary hover:text-primary text-xs font-bold flex flex-col items-center gap-1"><i class="ph ph-share-network text-lg"></i> Compartilhar</button>
            <button data-denunciar="${p.id}" data-ong="${UI.esc(p.nome)}" class="py-2.5 rounded-xl border border-gray-200 text-textGrey hover:border-red-400 hover:text-red-500 text-xs font-bold flex flex-col items-center gap-1"><i class="ph ph-flag text-lg"></i> Denunciar</button>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-3 mt-5 text-center">
            <div class="bg-background rounded-2xl py-3"><p class="text-2xl font-montserrat font-black text-primary">${p.totalNecessidades ?? necAbertas.length}</p><p class="text-xs text-textGrey font-semibold">Necessidades</p></div>
            <div class="bg-background rounded-2xl py-3"><p class="text-2xl font-montserrat font-black text-primary">${p.totalCampanhas ?? (p.campanhas || []).length}</p><p class="text-xs text-textGrey font-semibold">Campanhas</p></div>
            <div class="bg-background rounded-2xl py-3"><p class="text-2xl font-montserrat font-black text-primary">${p.totalPrestacoes ?? (p.prestacoes || []).length}</p><p class="text-xs text-textGrey font-semibold">Prestações</p></div>
          </div>

          <!-- Resumo de impacto (IA) -->
          <div id="resumo-ia" class="mt-5"></div>

          ${p.descricao ? `<div class="mt-5"><h4 class="font-montserrat font-bold text-textDark mb-1">Sobre</h4><p class="text-sm text-textGrey leading-relaxed whitespace-pre-line">${UI.esc(p.descricao)}</p></div>` : ''}

          <!-- Contato + localização -->
          ${(p.telefone || p.email || p.endereco) ? `<div class="mt-5">
            <h4 class="font-montserrat font-bold text-textDark mb-2">Contato</h4>
            <div class="space-y-1 text-sm text-textGrey">
              ${p.telefone ? `<p><i class="ph ph-phone text-primary"></i> ${UI.esc(p.telefone)}</p>` : ''}
              ${p.email ? `<p><i class="ph ph-envelope text-primary"></i> ${UI.esc(p.email)}</p>` : ''}
              ${p.cnpj ? `<p><i class="ph ph-identification-card text-primary"></i> CNPJ ${UI.esc(p.cnpj)}</p>` : ''}
              ${p.endereco ? `<p><i class="ph ph-map-pin-line text-primary"></i> ${UI.esc(p.endereco)}</p>` : ''}
            </div>
            <div class="grid grid-cols-3 gap-2 mt-3">
              <a target="_blank" href="https://www.google.com/maps/search/?api=1&query=${enderecoQ}" class="py-2.5 rounded-xl bg-background hover:bg-primary-light text-center text-xs font-bold text-textDark flex flex-col items-center gap-1"><i class="ph ph-map-pin text-lg text-primary"></i> Abrir no Maps</a>
              <a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=${enderecoQ}" class="py-2.5 rounded-xl bg-background hover:bg-primary-light text-center text-xs font-bold text-textDark flex flex-col items-center gap-1"><i class="ph ph-navigation-arrow text-lg text-primary"></i> Como chegar</a>
              <button data-frete-ong="${p.id}" class="py-2.5 rounded-xl bg-background hover:bg-primary-light text-center text-xs font-bold text-textDark flex flex-col items-center gap-1"><i class="ph ph-truck text-lg text-primary"></i> Simular frete</button>
            </div>
          </div>` : ''}

          <!-- Fotos do local -->
          ${(p.fotosLocal || []).length ? `<div class="mt-5"><h4 class="font-montserrat font-bold text-textDark mb-2">Fotos do local</h4>
            <div class="flex gap-3 overflow-x-auto no-scrollbar pb-1">${p.fotosLocal.map((f) => `<img src="${UI.fotoSrc(f)}" data-ver-img="${UI.fotoSrc(f)}" class="w-40 h-28 rounded-xl object-cover cursor-pointer flex-shrink-0">`).join('')}</div></div>` : ''}

          <!-- Precisa de -->
          ${necAbertas.length ? `<div class="mt-6"><h4 class="font-montserrat font-bold text-textDark mb-2">Precisa de</h4>
            <div class="space-y-2">${necAbertas.slice(0, 6).map((n) => `<button data-necessidade="${n.id}" class="w-full text-left flex items-center gap-3 p-3 bg-background rounded-xl hover:bg-primary-light transition-colors">
              <span class="text-2xl">${UI.cat(n.categoria).emoji}</span>
              <span class="flex-1 min-w-0"><span class="block font-bold text-sm text-textDark truncate">${UI.esc(n.titulo)}</span><span class="block text-xs text-textGrey truncate">${UI.esc(n.descricao || '')}</span></span>
              ${n.urgente ? '<span class="text-xs font-bold text-accent">Urgente</span>' : ''}</button>`).join('')}</div></div>` : ''}

          <!-- Campanhas -->
          ${(p.campanhas || []).length ? `<div class="mt-6"><h4 class="font-montserrat font-bold text-textDark mb-2">Campanhas</h4>
            <div class="space-y-2">${p.campanhas.slice(0, 4).map((c) => { const pct = Math.min(100, Number(c.progresso) || 0); return `<div class="p-3 bg-background rounded-xl">
              <div class="flex items-center justify-between"><span class="font-bold text-sm text-textDark">${UI.esc(c.titulo)}</span><span class="text-xs font-bold text-primary">${pct}%</span></div>
              <div class="w-full bg-gray-200 rounded-full h-2 mt-2"><div class="bg-primary h-2 rounded-full" style="width:${pct}%"></div></div></div>`; }).join('')}</div></div>` : ''}

          <!-- Avaliações -->
          ${(p.avaliacoes || []).length ? `<div class="mt-6"><h4 class="font-montserrat font-bold text-textDark mb-2">Avaliações</h4>
            <div class="space-y-2">${p.avaliacoes.slice(0, 5).map((a) => `<div class="p-3 bg-background rounded-xl"><div class="flex items-center justify-between"><span class="font-bold text-sm text-textDark">${UI.esc(a.doadorNome || 'Doador')}</span>${UI.estrelas(a.nota)}</div>${a.comentario ? `<p class="text-sm text-textGrey mt-1">${UI.esc(a.comentario)}</p>` : ''}</div>`).join('')}</div>
            <p class="text-xs text-textGrey mt-2"><i class="ph ph-info"></i> Só quem concluiu uma doação pode avaliar.</p></div>` : ''}
        </div>`;

      // Resumo de impacto (IA) — carrega em segundo plano.
      API.resumoImpacto(ongId).then((r) => {
        const box = $('#resumo-ia');
        if (box && r && r.resumo) box.innerHTML = `<div class="bg-primary-light/60 rounded-2xl p-4 border border-primary/20">
          <div class="flex items-center gap-2 mb-1"><i class="ph-fill ph-sparkle text-accent"></i><span class="font-bold text-sm text-primary-dark">Resumo de impacto · IA</span></div>
          <p class="text-sm text-textDark leading-relaxed">${UI.esc(r.resumo)}</p></div>`;
      }).catch(() => {});
    } catch (e) { $('#modal-card').innerHTML = `<div class="p-6">${erroBox(e.message)}</div>`; }
  }

  // Simular frete (origem = cidade do doador; destino = cidade da ONG)
  function abrirFrete(ongId) {
    const p = state.perfilOngAtual;
    if (!p) return;
    const u = API.usuario() || {};
    const primeira = (p.necessidades || []).find((n) => n.status === 'ABERTA');
    abrirModal(`<form id="f-frete" class="p-7 space-y-3">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center mb-1">Simular frete</h3>
      <p class="text-xs text-textGrey text-center mb-3">Estimativa para enviar sua doação até ${UI.esc(p.nome)}.</p>
      <div class="grid grid-cols-2 gap-3">
        <input name="origem" value="${UI.esc(u.cidade || '')}" placeholder="Sua cidade" class="p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
        <input value="${UI.esc(p.cidade || '')}" disabled class="p-3 bg-gray-100 rounded-xl text-textGrey">
      </div>
      <input name="item" value="${UI.esc(primeira ? primeira.titulo : '')}" placeholder="O que vai doar" class="w-full p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <div class="grid grid-cols-2 gap-3">
        <select name="categoria" class="p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
          ${UI.CANONICAS.map((c) => `<option value="${c.valor}" ${primeira && UI.normalizarCat(primeira.categoria) === c.valor ? 'selected' : ''}>${c.emoji} ${c.rotulo}</option>`).join('')}
        </select>
        <input name="quantidade" type="number" min="1" value="1" placeholder="Qtd" class="p-3 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      </div>
      <button class="btn-submit w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl disabled:opacity-60">Calcular estimativa</button>
      <div id="frete-resultado"></div>
    </form>`, 'max-w-md');
    $('#f-frete').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target, b = f.querySelector('.btn-submit');
      b.disabled = true; b.textContent = 'Calculando…';
      try {
        const r = await API.estimarFrete({
          origemCidade: f.origem.value, origemUf: u.estado || null, destinoCidade: p.cidade,
          item: f.item.value, categoria: f.categoria.value, quantidade: Number(f.quantidade.value) || 1,
        });
        $('#frete-resultado').innerHTML = `
          <div class="mt-3 space-y-2">
            <div class="flex items-center justify-between text-sm text-textGrey"><span>${UI.esc(r.origem)} → ${UI.esc(r.destino)}</span><span>${r.distanciaKm ? r.distanciaKm + ' km' : 'mesma cidade'} · ${r.pesoKg}kg${r.pesoEstimado ? ' (est.)' : ''}</span></div>
            ${r.categoriaDetectada && UI.normalizarCat(r.categoriaDetectada) !== UI.normalizarCat(r.categoria) ? `<p class="text-xs text-accent bg-accent-light rounded-lg p-2">A IA detectou que parece "${UI.esc(r.categoriaDetectada)}".</p>` : ''}
            ${(r.modalidades || []).map((m) => `<div class="flex items-center justify-between p-3 bg-background rounded-xl">
              <div><p class="font-bold text-sm text-textDark">${UI.esc(m.nome)}</p><p class="text-xs text-textGrey">${UI.esc(m.detalhe || '')}${m.prazoDias ? ' · ' + m.prazoDias + ' dia(s)' : ''}</p></div>
              <span class="font-montserrat font-black ${(m.valor <= 0) ? 'text-primary' : 'text-textDark'}">${m.valor <= 0 ? 'Grátis' : UI.brl(m.valor)}</span></div>`).join('')}
            <p class="text-[11px] text-textGrey">${UI.esc(r.aviso || '')} ${r.modo === 'ia' ? '· estimado por IA' : ''}</p>
          </div>`;
        b.disabled = false; b.textContent = 'Recalcular';
      } catch (err) { b.disabled = false; b.textContent = 'Calcular estimativa'; UI.toast(err.message, 'erro'); }
    });
  }

  function abrirDenuncia(ongId, ongNome) {
    const MOTIVOS = [['CONTEUDO_INADEQUADO', 'Conteúdo inadequado'], ['FRAUDE', 'Fraude'], ['SPAM', 'Spam'], ['ABUSO', 'Abuso'], ['OUTRO', 'Outro']];
    abrirModal(`<form id="f-denuncia" class="p-7 space-y-3">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center mb-1">Denunciar ${UI.esc(ongNome)}</h3>
      <select name="motivo" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
        ${MOTIVOS.map(([v, r]) => `<option value="${v}">${r}</option>`).join('')}
      </select>
      <textarea name="descricao" rows="3" placeholder="Descreva o que aconteceu (opcional)" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
      <button class="btn-submit w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl disabled:opacity-60">Enviar denúncia</button>
    </form>`, 'max-w-sm');
    $('#f-denuncia').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector('.btn-submit'); b.disabled = true; b.textContent = 'Enviando…';
      try {
        await API.denunciar({ tipoAlvo: 'ONG', alvoId: Number(ongId), motivo: f.motivo.value, descricao: f.descricao.value });
        fecharModal(); UI.toast('Denúncia enviada. Obrigado por avisar.', 'ok');
      } catch (err) { b.disabled = false; b.textContent = 'Enviar denúncia'; UI.toast(err.message, 'erro'); }
    });
  }

  function verImagem(src) {
    abrirModal(`<div class="bg-black flex items-center justify-center"><img src="${src}" class="max-h-[85vh] w-auto object-contain"></div>`, 'max-w-3xl');
  }

  function compartilharOng(ongId) {
    const link = location.origin + location.pathname + '#/ong/' + ongId;
    if (navigator.clipboard) navigator.clipboard.writeText(link);
    UI.toast('Link da ONG copiado!', 'info');
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
      const [favs, ongs] = await Promise.all([API.favoritos(), API.ongs()]);
      await carregarFavIds(true);
      const porId = {};
      for (const o of ongs) porId[o.id] = o;
      // O endpoint devolve {alvoNome, alvoId} — enriquece com os dados reais da ONG.
      const cards = favs.map((f) => porId[f.alvoId] || { id: f.alvoId, nome: f.alvoNome, cidade: '', notaMedia: 0, totalAvaliacoes: 0, descricao: '' });
      root().innerHTML = cards.length
        ? `<p class="text-textGrey font-medium mb-5 slide-up">${cards.length} ONG(s) favorita(s) — acompanhe suas necessidades e campanhas.</p>
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${cards.map(cardOng).join('')}</div>`
        : vazio('ph-star', 'Sem favoritos ainda', 'Toque na estrela de uma ONG para acompanhá-la aqui.');
    } catch (e) { root().innerHTML = erroBox(e.message, 'favoritos'); }
  }

  // =========================================================================
  // IMPACTO (métricas do doador)
  // =========================================================================
  async function viewImpacto() {
    root().innerHTML = carregando();
    try {
      const [inter, conq, fin] = await Promise.all([
        API.meusInteresses(), API.conquistas().catch(() => []), API.minhasDoacoesFinanceiras().catch(() => []),
      ]);
      const concl = inter.filter((i) => i.status === 'CONCLUIDO').length;
      const ativos = inter.filter((i) => i.status === 'ACEITO').length;
      const ongsAjudadas = new Set(inter.filter((i) => i.status === 'CONCLUIDO').map((i) => i.ongId)).size;
      const totalDinheiro = (fin || []).reduce((s, d) => s + (Number(d.valor) || 0), 0);
      root().innerHTML = `
        <div class="flex justify-end mb-3 slide-up">
          <button id="btn-relatorio" class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-primary hover:text-primary font-bold text-sm shadow-sm transition-colors">
            <i class="ph ph-printer text-lg"></i> Gerar relatório (PDF) <span class="hidden sm:inline text-[10px] font-bold text-textGrey bg-gray-100 rounded px-1.5 py-0.5 ml-1">web</span>
          </button>
        </div>
        <div class="bg-gradient-to-br from-primary to-primary-dark rounded-[24px] p-8 text-white shadow-card mb-8 slide-up relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full"></div>
          <p class="font-semibold text-white/80 relative">Seu impacto no Connect ONG</p>
          <div class="flex items-end gap-3 mt-2 relative">
            <span class="text-6xl font-montserrat font-black">${concl}</span>
            <span class="text-xl font-bold mb-2">doações concluídas 🎉</span>
          </div>
          ${totalDinheiro > 0 ? `<p class="text-white/90 font-semibold mt-2 relative">+ ${UI.brl(totalDinheiro)} doados em dinheiro</p>` : ''}
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 slide-up" style="animation-delay:.05s">
          ${statCard('ph-heart', ativos, 'Matches ativos', 'text-accent', 'matches')}
          ${statCard('ph-hourglass', inter.filter((i) => i.status === 'PENDENTE').length, 'Aguardando', 'text-yellow-600', 'matches')}
          ${statCard('ph-buildings', ongsAjudadas, 'ONGs ajudadas', 'text-primary', 'ongs')}
          ${statCard('ph-hand-heart', (fin || []).length, 'Doações $ feitas', 'text-blue-600', 'doacoes')}
        </div>
        <h4 class="text-xl font-montserrat font-bold text-textDark mb-4 flex items-center gap-2 slide-up"><i class="ph-fill ph-medal text-accent"></i> Conquistas</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 slide-up" style="animation-delay:.1s">
          ${(conq || []).map(cardConquista).join('') || vazio('ph-medal', 'Sem conquistas ainda', 'Faça sua primeira doação!')}
        </div>`;
      const br = $('#btn-relatorio'); if (br) br.addEventListener('click', gerarRelatorio);
    } catch (e) { root().innerHTML = erroBox(e.message, 'impacto'); }
  }
  function statCard(icon, valor, label, cor, rota) {
    const clic = rota ? `data-rota="${rota}"` : '';
    return `<div ${clic} class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 ${rota ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all' : ''}">
      <i class="ph-fill ${icon} text-2xl ${cor}"></i>
      <p class="text-3xl font-montserrat font-black text-textDark mt-2">${valor}</p>
      <p class="text-sm text-textGrey font-semibold">${label} ${rota ? '<i class="ph ph-arrow-right text-xs"></i>' : ''}</p></div>`;
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
      const [doacoes, fin] = await Promise.all([API.minhasDoacoes(), API.minhasDoacoesFinanceiras().catch(() => [])]);
      state.minhasDoacoes = doacoes;
      root().innerHTML = `
        <div class="flex items-center justify-between mb-4 slide-up">
          <h4 class="text-lg font-montserrat font-bold text-textDark flex items-center gap-2"><i class="ph-fill ph-package text-primary"></i> Itens para doar</h4>
          <button id="nova-doacao" class="bg-accent hover:bg-accent-dark text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-md shadow-accent/20 flex items-center gap-2"><i class="ph-bold ph-plus"></i> Cadastrar</button>
        </div>
        ${doacoes.length
          ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 slide-up">${doacoes.map(cardDoacao).join('')}</div>`
          : vazio('ph-hand-heart', 'Você ainda não cadastrou itens', 'Cadastre um item que deseja doar e apareça para as ONGs.')}

        <h4 class="text-lg font-montserrat font-bold text-textDark flex items-center gap-2 mt-10 mb-4 slide-up"><i class="ph-fill ph-pix-logo text-primary"></i> Doações em dinheiro</h4>
        ${(fin || []).length
          ? `<div class="space-y-3 slide-up">${fin.map(cardDoacaoFinanceira).join('')}</div>`
          : vazio('ph-currency-circle-dollar', 'Nenhuma doação em dinheiro', 'Contribua com uma campanha via PIX na aba Campanhas.')}`;
      $('#nova-doacao').addEventListener('click', () => abrirNovaDoacao());
    } catch (e) { root().innerHTML = erroBox(e.message, 'doacoes'); }
  }
  function cardDoacao(d) {
    const c = UI.cat(d.categoria);
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition-all">
      <div class="h-28 flex items-center justify-center text-5xl ${c.cls} relative">${c.emoji}
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
        <div class="absolute top-2.5 right-2.5 flex gap-1.5">
          <button data-editdoacao="${d.id}" title="Editar" class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-textGrey hover:text-primary shadow-md transition-colors"><i class="ph-bold ph-pencil-simple text-base"></i></button>
          <button data-deldoacao="${d.id}" title="Excluir" class="w-9 h-9 bg-white rounded-full flex items-center justify-center text-textGrey hover:text-red-500 shadow-md transition-colors"><i class="ph-bold ph-trash text-base"></i></button>
        </div>
      </div>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-2">${UI.catChip(d.categoria)} ${d.urgente ? '<span class="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">Urgente</span>' : ''}</div>
        <h4 class="font-montserrat font-bold text-textDark text-lg">${UI.esc(d.nome)}</h4>
        <p class="text-sm text-textGrey mt-1 line-clamp-2">${UI.esc(d.descricao || '')}</p>
        ${d.quantidade ? `<p class="text-xs text-textGrey mt-3 font-semibold inline-flex items-center gap-1 bg-background px-2.5 py-1 rounded-full"><i class="ph ph-stack text-primary"></i> ${d.quantidade} unidade(s)</p>` : ''}
      </div></div>`;
  }
  function cardDoacaoFinanceira(d) {
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0"><i class="ph-fill ph-pix-logo text-2xl"></i></div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-textDark truncate">${UI.esc(d.ongNome || 'ONG')}</p>
        <p class="text-xs text-textGrey truncate">${d.campanhaTitulo ? UI.esc(d.campanhaTitulo) + ' · ' : ''}${UI.dataCurta(d.dataCriacao)}</p>
      </div>
      <div class="text-right">
        <p class="font-montserrat font-black text-primary">${UI.brl(d.valor)}</p>
        <span class="text-[10px] font-bold ${d.status === 'CONFIRMADO' ? 'text-primary' : 'text-textGrey'}">${UI.esc(d.status || '')}</span>
      </div></div>`;
  }
  function abrirNovaDoacao(doacao) {
    const editar = !!doacao;
    const cats = state.categorias || UI.CANONICAS.map((c) => c.valor);
    abrirModal(`<form id="form-doacao" class="p-7 space-y-4">
      <div class="text-center mb-2">
        <div class="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3 text-primary"><i class="ph-fill ph-gift text-3xl"></i></div>
        <h3 class="text-xl font-montserrat font-bold text-textDark">${editar ? 'Editar doação' : 'O que você quer doar?'}</h3>
      </div>
      <input name="nome" required value="${editar ? UI.esc(doacao.nome) : ''}" placeholder="Item (ex: Cobertores)" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <div class="grid grid-cols-2 gap-3">
        <select name="categoria" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
          ${cats.map((c) => `<option value="${UI.esc(c)}" ${editar && UI.normalizarCat(doacao.categoria) === UI.normalizarCat(c) ? 'selected' : ''}>${UI.cat(c).emoji} ${UI.esc(UI.cat(c).rotulo)}</option>`).join('')}
        </select>
        <input name="quantidade" type="number" min="1" value="${editar ? (doacao.quantidade || 1) : ''}" placeholder="Quantidade" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      </div>
      <textarea name="descricao" rows="3" required placeholder="Descrição / estado de conservação" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none">${editar ? UI.esc(doacao.descricao || '') : ''}</textarea>
      <label class="flex items-center gap-2 text-sm font-semibold text-textDark"><input type="checkbox" name="urgente" ${editar && doacao.urgente ? 'checked' : ''} class="w-4 h-4 accent-primary"> Marcar como urgente</label>
      <button class="btn-submit w-full py-4 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-60">${editar ? 'Salvar alterações' : 'Publicar doação'}</button>
    </form>`);
    $('#form-doacao').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('.btn-submit'); btn.disabled = true; btn.textContent = 'Salvando…';
      const fd = Object.fromEntries(new FormData(e.target));
      const dto = { nome: fd.nome, descricao: fd.descricao, categoria: fd.categoria,
        quantidade: Number(fd.quantidade) || 1, urgente: fd.urgente === 'on', tipo: doacao ? (doacao.tipo || 'Nova') : 'Nova' };
      try {
        if (editar) await API.atualizarDoacao(doacao.id, dto); else await API.cadastrarDoacao(dto);
        fecharModal(); UI.toast(editar ? 'Doação atualizada ✓' : 'Doação publicada! 🎁', 'ok');
        if (state.rota === 'doacoes') viewDoacoes();
      } catch (err) { btn.disabled = false; btn.textContent = editar ? 'Salvar alterações' : 'Publicar doação'; UI.toast(err.message, 'erro'); }
    });
  }
  function editarDoacao(id) { const d = (state.minhasDoacoes || []).find((x) => x.id === Number(id)); if (d) abrirNovaDoacao(d); }
  async function excluirDoacao(id) {
    if (!confirm('Excluir esta doação?')) return;
    try { await API.excluirDoacao(Number(id)); UI.toast('Doação excluída.', 'info'); viewDoacoes(); }
    catch (e) { UI.toast(e.message, 'erro'); }
  }

  // =========================================================================
  // AJUSTES / PREFERÊNCIAS — paridade com o mobile (configuracoes_screen)
  // Fonte de verdade = backend (/usuarios/{id}/preferencias); cache local p/
  // aplicar tema/fonte antes do login e offline.
  // =========================================================================
  const PREF_CACHE = 'co_prefs_v2';
  const PREFS_PADRAO = {
    tema: 'CLARO', tamanhoFonte: 'MEDIA', altoContraste: false, fonteDislexia: false,
    navegacaoSimplificada: false, notifMensagens: true, notifMatch: true, notifCampanhas: true,
    notifNecessidades: true, notifNoticias: true, mostrarTelefone: true, mostrarEmail: false,
    perfilPublico: true, receberContatos: true, receberSugestoes: true, doisFatores: 0,
  };
  function lerPrefsCache() { try { return { ...PREFS_PADRAO, ...JSON.parse(localStorage.getItem(PREF_CACHE) || '{}') }; } catch { return { ...PREFS_PADRAO }; } }
  function aplicarPreferencias(p) {
    p = p || lerPrefsCache();
    const escuro = p.tema === 'ESCURO' ||
      (p.tema === 'AUTOMATICO' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('tema-escuro', escuro);
    document.documentElement.style.fontSize = ({ PEQUENA: '14.4px', MEDIA: '16px', GRANDE: '19.2px' }[p.tamanhoFonte] || '16px');
    document.body.classList.toggle('alto-contraste', !!p.altoContraste);
    document.body.classList.toggle('fonte-dislexia', !!p.fonteDislexia);
    document.body.classList.toggle('reduz-motion', !!p.navegacaoSimplificada);
    localStorage.setItem(PREF_CACHE, JSON.stringify(p));
  }

  // Compara só os campos de preferência (ignora id/usuarioId e normaliza null/0/false).
  const CAMPOS_PREF = ['tema', 'tamanhoFonte', 'altoContraste', 'fonteDislexia', 'navegacaoSimplificada',
    'notifMensagens', 'notifMatch', 'notifCampanhas', 'notifNecessidades', 'notifNoticias',
    'mostrarTelefone', 'mostrarEmail', 'perfilPublico', 'receberContatos', 'receberSugestoes', 'doisFatores'];
  function prefsIguais(a, b) {
    if (!a || !b) return false;
    for (const k of CAMPOS_PREF) {
      let va = a[k], vb = b[k];
      if (k === 'doisFatores') { va = va ? 1 : 0; vb = vb ? 1 : 0; }
      else if (typeof PREFS_PADRAO[k] === 'boolean') { va = !!va; vb = !!vb; }
      if (va !== vb) return false;
    }
    return true;
  }
  let cfgDraft = null;
  function viewConfig() {
    const base = state.prefs || lerPrefsCache();
    if (!cfgDraft) cfgDraft = { ...base };
    const p = cfgDraft;
    const mudou = !prefsIguais(base, p);
    const u = API.usuario() || {};
    root().innerHTML = `
      <div class="max-w-2xl mx-auto space-y-5 slide-up pb-4">
        <!-- Perfil resumo -->
        <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 flex items-center gap-4">
          ${UI.avatar(u.nome, 'w-14 h-14 text-lg', u.fotoBase64)}
          <div class="flex-1 min-w-0"><p class="font-montserrat font-bold text-textDark truncate">${UI.esc(u.nome || '')}</p><p class="text-sm text-textGrey truncate">${UI.esc(u.email || '')}</p></div>
          <button id="cfg-editar" class="px-4 py-2 rounded-xl border border-gray-200 text-textGrey hover:border-primary hover:text-primary font-bold text-sm">Editar</button>
        </div>

        ${secaoCfg('ph-paint-brush', 'Aparência', `
          ${segCfg('tema', 'Tema', [['CLARO', 'Claro'], ['ESCURO', 'Escuro'], ['AUTOMATICO', 'Auto']], p.tema)}
          ${segCfg('tamanhoFonte', 'Tamanho da fonte', [['PEQUENA', 'Pequena'], ['MEDIA', 'Média'], ['GRANDE', 'Grande']], p.tamanhoFonte)}
        `)}

        ${secaoCfg('ph-hand-heart', 'Acessibilidade', `
          ${swCfg('altoContraste', 'Alto contraste', 'Realça bordas e textos', p.altoContraste)}
          ${swCfg('fonteDislexia', 'Fonte para dislexia', 'Usa a fonte Lexend, mais legível', p.fonteDislexia)}
          ${swCfg('navegacaoSimplificada', 'Navegação simplificada', 'Menos animações e movimento', p.navegacaoSimplificada)}
        `)}

        ${secaoCfg('ph-bell', 'Notificações', `
          ${swCfg('notifMensagens', 'Mensagens', 'Novas mensagens no chat', p.notifMensagens)}
          ${swCfg('notifMatch', 'Matches', 'Quando a ONG aceita seu interesse', p.notifMatch)}
          ${swCfg('notifCampanhas', 'Campanhas', 'Novidades de campanhas', p.notifCampanhas)}
          ${swCfg('notifNecessidades', 'Necessidades', 'Novas necessidades perto de você', p.notifNecessidades)}
          ${swCfg('notifNoticias', 'Novidades', 'Novidades do Connect ONG', p.notifNoticias)}
        `)}

        ${secaoCfg('ph-lock-simple', 'Privacidade', `
          ${swCfg('mostrarTelefone', 'Mostrar telefone', 'No seu perfil público', p.mostrarTelefone)}
          ${swCfg('mostrarEmail', 'Mostrar e-mail', 'No seu perfil público', p.mostrarEmail)}
          ${swCfg('perfilPublico', 'Perfil público', 'Permite que ONGs vejam seu perfil', p.perfilPublico)}
          ${swCfg('receberContatos', 'Receber contatos', 'ONGs podem falar com você', p.receberContatos)}
          ${swCfg('receberSugestoes', 'Sugestões da Dora', 'Recomendações personalizadas', p.receberSugestoes)}
        `)}

        ${secaoCfg('ph-shield-check', 'Segurança', `
          ${swCfg('doisFatores', 'Verificação em 2 fatores', 'Código extra ao entrar', !!p.doisFatores)}
          <button id="cfg-senha" class="w-full text-left flex items-center justify-between py-1"><span class="flex items-center gap-3"><i class="ph ph-key text-xl text-primary"></i><span class="font-bold text-textDark">Alterar senha</span></span><i class="ph ph-caret-right text-textGrey"></i></button>
          <button id="cfg-email" class="w-full text-left flex items-center justify-between py-1"><span class="flex items-center gap-3"><i class="ph ph-envelope text-xl text-primary"></i><span class="font-bold text-textDark">Alterar e-mail</span></span><i class="ph ph-caret-right text-textGrey"></i></button>
        `)}

        ${secaoCfg('ph-user-circle', 'Conta', `
          ${linkCfg('cfg-perfil-publico', 'ph-identification-card', 'Meu perfil público')}
          ${linkCfg('cfg-doacoes', 'ph-hand-heart', 'Minhas doações')}
          ${linkCfg('cfg-favoritos', 'ph-star', 'Favoritos')}
          ${linkCfg('cfg-conquistas', 'ph-medal', 'Conquistas')}
        `)}

        ${secaoCfg('ph-info', 'Sobre', `
          ${linkCfg('cfg-sobre', 'ph-heart', 'Sobre o Connect ONG')}
          ${linkCfg('cfg-integrantes', 'ph-users-three', 'Integrantes do projeto')}
        `)}

        <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-4 space-y-2">
          <button id="cfg-sair" class="w-full py-3 text-red-600 font-bold rounded-xl hover:bg-red-50 flex items-center justify-center gap-2"><i class="ph ph-sign-out"></i> Sair da conta</button>
          <button id="cfg-excluir" class="w-full py-3 text-red-500 font-semibold text-sm rounded-xl hover:bg-red-50 flex items-center justify-center gap-2"><i class="ph ph-trash"></i> Excluir minha conta</button>
        </div>
        <p class="text-center text-xs text-textGrey">Connect ONG • Web do Doador • conectada a ${UI.esc(API.BASE)}</p>
      </div>

      <!-- Barra Salvar -->
      <div id="cfg-bar" class="${mudou ? '' : 'hidden'} fixed bottom-0 md:bottom-0 inset-x-0 md:left-64 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] px-6 py-3 flex items-center justify-between">
        <span class="text-sm font-semibold text-textGrey">Você tem alterações não salvas</span>
        <div class="flex gap-2">
          <button id="cfg-descartar" class="px-4 py-2.5 rounded-xl font-bold text-textGrey hover:bg-gray-100">Descartar</button>
          <button id="cfg-salvar" class="px-6 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark disabled:opacity-60">Salvar</button>
        </div>
      </div>`;

    // Segmentos (tema/fonte)
    root().querySelectorAll('[data-seg]').forEach((b) => b.addEventListener('click', () => {
      cfgDraft[b.dataset.seg] = b.dataset.val; aplicarPreferencias(cfgDraft); viewConfig();
    }));
    // Toggles
    root().querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.sw;
      if (k === 'doisFatores') cfgDraft[k] = cfgDraft[k] ? 0 : 1;
      else cfgDraft[k] = !cfgDraft[k];
      aplicarPreferencias(cfgDraft); viewConfig();
    }));
    // Barra salvar
    const bs = $('#cfg-salvar');
    if (bs) bs.addEventListener('click', async () => {
      bs.disabled = true; bs.textContent = 'Salvando…';
      try {
        const salvo = await API.salvarPreferencias(cfgDraft);
        state.prefs = salvo && salvo.tema ? salvo : { ...cfgDraft };
        cfgDraft = null; aplicarPreferencias(state.prefs);
        UI.toast('Preferências salvas ✓', 'ok'); viewConfig();
      } catch (e) { bs.disabled = false; bs.textContent = 'Salvar'; UI.toast(e.message, 'erro'); }
    });
    const bd = $('#cfg-descartar');
    if (bd) bd.addEventListener('click', () => { cfgDraft = { ...base }; aplicarPreferencias(base); viewConfig(); });

    // Ações
    $('#cfg-editar').addEventListener('click', abrirEditarPerfil);
    $('#cfg-senha').addEventListener('click', abrirAlterarSenha);
    $('#cfg-email').addEventListener('click', abrirAlterarEmail);
    $('#cfg-perfil-publico').addEventListener('click', () => abrirPerfilDoador());
    $('#cfg-doacoes').addEventListener('click', () => irPara('doacoes'));
    $('#cfg-favoritos').addEventListener('click', () => irPara('favoritos'));
    $('#cfg-conquistas').addEventListener('click', () => irPara('impacto'));
    $('#cfg-sobre').addEventListener('click', () => irPara('sobre'));
    $('#cfg-integrantes').addEventListener('click', () => abrirIntegrantes());
    $('#cfg-sair').addEventListener('click', () => { if (confirm('Deseja sair da sua conta?')) { API.sair(); location.hash = ''; mostrarLogin(); } });
    $('#cfg-excluir').addEventListener('click', excluirConta);
  }
  function secaoCfg(icon, titulo, conteudo) {
    return `<div class="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
      <h4 class="font-montserrat font-bold text-textDark mb-4 flex items-center gap-2"><i class="ph-fill ${icon} text-primary"></i> ${titulo}</h4>
      <div class="space-y-4">${conteudo}</div></div>`;
  }
  function segCfg(chave, titulo, opcoes, valor) {
    return `<div><p class="text-sm font-semibold text-textDark mb-2">${titulo}</p>
      <div class="flex gap-2">${opcoes.map(([v, r]) => `<button data-seg="${chave}" data-val="${v}" class="flex-1 py-2.5 rounded-xl border font-bold text-sm ${valor === v ? 'bg-primary text-white border-primary' : 'border-gray-200 text-textGrey hover:border-primary'}">${r}</button>`).join('')}</div></div>`;
  }
  function swCfg(chave, titulo, sub, ativo) {
    return `<div class="flex items-center justify-between gap-3">
      <div><p class="font-bold text-textDark">${titulo}</p><p class="text-xs text-textGrey">${sub}</p></div>
      <button data-sw="${chave}" class="w-12 h-7 rounded-full flex-shrink-0 transition-colors ${ativo ? 'bg-primary' : 'bg-gray-300'} relative"><span class="absolute top-1 ${ativo ? 'right-1' : 'left-1'} w-5 h-5 bg-white rounded-full transition-all"></span></button>
    </div>`;
  }
  function linkCfg(id, icon, titulo) {
    return `<button id="${id}" class="w-full text-left flex items-center justify-between py-1"><span class="flex items-center gap-3"><i class="ph ${icon} text-xl text-primary"></i><span class="font-bold text-textDark">${titulo}</span></span><i class="ph ph-caret-right text-textGrey"></i></button>`;
  }

  // Modais de segurança / perfil
  function abrirAlterarSenha() {
    abrirModal(`<form id="f-senha" class="p-7 space-y-4">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center">Alterar senha</h3>
      <input name="atual" type="password" required placeholder="Senha atual" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <input name="nova" type="password" required minlength="4" placeholder="Nova senha" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <p data-erro class="text-sm font-semibold text-red-600 hidden"></p>
      <button class="btn-submit w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl disabled:opacity-60">Salvar nova senha</button>
    </form>`, 'max-w-sm');
    $('#f-senha').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector('.btn-submit'), er = f.querySelector('[data-erro]');
      er.classList.add('hidden'); b.disabled = true;
      try { await API.alterarSenha(f.atual.value, f.nova.value); fecharModal(); UI.toast('Senha alterada ✓', 'ok'); }
      catch (x) { er.textContent = x.message; er.classList.remove('hidden'); b.disabled = false; }
    });
  }
  function abrirAlterarEmail() {
    abrirModal(`<form id="f-email" class="p-7 space-y-4">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center">Alterar e-mail</h3>
      <input name="email" type="email" required placeholder="Novo e-mail" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <input name="senha" type="password" required placeholder="Sua senha" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <p data-erro class="text-sm font-semibold text-red-600 hidden"></p>
      <button class="btn-submit w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl disabled:opacity-60">Salvar novo e-mail</button>
    </form>`, 'max-w-sm');
    $('#f-email').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector('.btn-submit'), er = f.querySelector('[data-erro]');
      er.classList.add('hidden'); b.disabled = true;
      try { await API.alterarEmail(f.email.value, f.senha.value); API.mesclarUsuario({ email: f.email.value }); fecharModal(); UI.toast('E-mail alterado ✓', 'ok'); }
      catch (x) { er.textContent = x.message; er.classList.remove('hidden'); b.disabled = false; }
    });
  }
  async function excluirConta() {
    if (!confirm('Tem certeza? Sua conta será desativada e você sairá.')) return;
    try { await API.excluirConta(); API.sair(); location.hash = ''; mostrarLogin(); UI.toast('Conta excluída.', 'info'); }
    catch (e) { UI.toast(e.message, 'erro'); }
  }
  async function abrirEditarPerfil() {
    const u = API.usuario() || {};
    abrirModal(`<form id="f-perfil" class="p-7 space-y-4">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center mb-1">Editar perfil</h3>
      <div class="flex justify-center">
        <label class="relative cursor-pointer">
          <span id="ep-avatar">${UI.avatar(u.nome, 'w-24 h-24 text-2xl', u.fotoBase64)}</span>
          <span class="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center"><i class="ph ph-camera"></i></span>
          <input id="ep-foto" type="file" accept="image/*" class="hidden">
        </label>
      </div>
      <input name="nome" required maxlength="80" value="${UI.esc(u.nome || '')}" placeholder="Nome" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <input name="telefone" value="${UI.esc(u.telefone || '')}" placeholder="Telefone" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <div class="grid grid-cols-3 gap-2">
        <select id="ep-uf" class="col-span-1 p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"><option value="">UF</option></select>
        <input id="ep-cidade" list="ep-cidades" value="${UI.esc(u.cidade || '')}" placeholder="Cidade" class="col-span-2 p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"><datalist id="ep-cidades"></datalist>
      </div>
      <textarea name="bio" rows="2" maxlength="200" placeholder="Bio (opcional)" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none">${UI.esc(u.bio || '')}</textarea>
      <p data-erro class="text-sm font-semibold text-red-600 hidden"></p>
      <button class="btn-submit w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl disabled:opacity-60">Salvar</button>
    </form>`, 'max-w-md');
    let fotoNova = null;
    const selUf = $('#ep-uf');
    UI.UFS.forEach((uf) => { const o = document.createElement('option'); o.value = uf; o.textContent = uf; if (uf === u.estado) o.selected = true; selUf.appendChild(o); });
    async function encherCidades() { const m = await UI.carregarMunicipios(); $('#ep-cidades').innerHTML = (m[selUf.value] || []).map((c) => `<option value="${UI.esc(c)}">`).join(''); }
    if (u.estado) encherCidades();
    selUf.addEventListener('change', encherCidades);
    $('#ep-foto').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      fotoNova = await arquivoParaBase64(f, 800, 0.8);
      $('#ep-avatar').innerHTML = UI.avatar(u.nome, 'w-24 h-24 text-2xl', fotoNova);
    });
    $('#f-perfil').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, b = f.querySelector('.btn-submit'), er = f.querySelector('[data-erro]');
      er.classList.add('hidden'); b.disabled = true; b.textContent = 'Salvando…';
      try {
        const dto = { nome: f.nome.value, telefone: f.telefone.value, cidade: $('#ep-cidade').value,
          estado: selUf.value, bio: f.bio.value };
        if (fotoNova) dto.fotoBase64 = fotoNova;
        await API.atualizarPerfil(dto);
        API.mesclarUsuario({ nome: dto.nome, telefone: dto.telefone, cidade: dto.cidade, estado: dto.estado, bio: dto.bio, ...(fotoNova ? { fotoBase64: fotoNova } : {}) });
        pintarPerfil(); fecharModal(); UI.toast('Perfil atualizado ✓', 'ok');
        if (state.rota === 'config') viewConfig();
      } catch (x) { b.disabled = false; b.textContent = 'Salvar'; er.textContent = x.message; er.classList.remove('hidden'); }
    });
  }

  // Perfil público do doador (reputação estilo Uber)
  async function abrirPerfilDoador(id) {
    abrirModal(carregando('Carregando…'), 'max-w-md');
    const u = API.usuario() || {};
    try {
      const [p, avals] = await Promise.all([
        API.perfilPublicoDoador(id).catch(() => ({})),
        API.avaliacoesDoador(id).catch(() => []),
      ]);
      const nota = p.notaMediaDoador ?? p.notaMedia ?? 0;
      const total = p.totalAvaliacoesDoador ?? p.totalAvaliacoes ?? (avals || []).length;
      $('#modal-card').innerHTML = `
        <div class="p-7 text-center">
          <div class="flex justify-center mb-3">${UI.avatar(p.nome || u.nome, 'w-24 h-24 text-2xl', p.fotoBase64 || u.fotoBase64)}</div>
          <h3 class="text-2xl font-montserrat font-extrabold text-textDark">${UI.esc(p.nome || u.nome || 'Doador')}</h3>
          <div class="mt-1">${UI.estrelas(nota)} <span class="text-textGrey font-semibold">${Number(nota).toFixed(1)} · ${total} avaliação(ões)</span></div>
          ${(avals || []).length ? `<div class="mt-5 space-y-2 text-left">${avals.map((a) => `
            <div class="p-3 bg-background rounded-xl">
              <div class="flex items-center justify-between"><span class="font-bold text-sm text-textDark">${UI.esc(a.ongNome || 'ONG')}</span>${UI.estrelas(a.nota)}</div>
              ${a.comentario ? `<p class="text-sm text-textGrey mt-1">${UI.esc(a.comentario)}</p>` : ''}
              ${(a.fotos && a.fotos.length) ? `<div class="flex gap-2 mt-2">${a.fotos.map((f) => `<img src="${UI.fotoSrc(f)}" class="w-16 h-16 rounded-lg object-cover">`).join('')}</div>` : ''}
            </div>`).join('')}</div>` : `<p class="text-textGrey text-sm mt-4">Você ainda não recebeu avaliações de ONGs.</p>`}
        </div>`;
    } catch (e) { $('#modal-card').innerHTML = `<div class="p-6">${erroBox(e.message)}</div>`; }
  }

  // Integrantes do projeto (equipe)
  const EQUIPE = [
    { nome: 'Gabriel Chinelatto', papel: 'Back-end e Designer', img: 'assets/img/gabriel.jpg' },
    { nome: 'Arthur Souza', papel: 'Designer e Tester', img: 'assets/img/arthur.jpg' },
    { nome: 'Luan Felipe', papel: 'Back-end e Designer', img: 'assets/img/luan.png' },
    { nome: 'Abner Viola', papel: 'Front-end', img: 'assets/img/abner.jpg' },
  ];
  function abrirIntegrantes() {
    abrirModal(`<div class="p-7">
      <h3 class="text-xl font-montserrat font-bold text-textDark text-center mb-1">Integrantes do projeto</h3>
      <p class="text-sm text-textGrey text-center mb-5">4º DSN — COTIL / UNICAMP</p>
      <div class="grid grid-cols-2 gap-4">
        ${EQUIPE.map((m) => `<div class="text-center bg-background rounded-2xl p-4">
          <img src="${m.img}" alt="${UI.esc(m.nome)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold',innerText:'${UI.iniciais(m.nome)}'}))" class="w-16 h-16 mx-auto rounded-full object-cover">
          <p class="font-bold text-textDark text-sm mt-2 leading-tight">${UI.esc(m.nome)}</p>
          <p class="text-xs text-textGrey">${UI.esc(m.papel)}</p></div>`).join('')}
      </div>
    </div>`, 'max-w-md');
  }

  // =========================================================================
  // SOBRE O CONNECT ONG (institucional)
  // =========================================================================
  const ODS = [
    { n: 1, t: 'Erradicação da pobreza', cor: '#e5243b' },
    { n: 2, t: 'Fome zero', cor: '#dda63a' },
    { n: 10, t: 'Redução das desigualdades', cor: '#dd1367' },
    { n: 17, t: 'Parcerias e meios de implementação', cor: '#19486a' },
  ];
  const KVERSOES = [
    { numero: 'v2.0', titulo: 'Recursos exclusivos da web', atual: true, mudancas: ['Mapa interativo de ONGs (localize quem ajudar perto de você)', 'Comparador de ONGs lado a lado, com link compartilhável', 'Modo Quiosque em tela cheia para eventos e feiras', 'Relatório de impacto imprimível / em PDF', 'Busca rápida com atalho de teclado (Ctrl/Cmd + K)'] },
    { numero: 'v1.9', titulo: 'Frete inteligente e mais IA', mudancas: ['Navegação mais fluida com resposta ao toque', 'Simulador de frete no perfil da ONG (distância + peso)', 'IA estima o peso e avisa se a categoria não combina', 'Resumo de impacto da ONG escrito por IA', '"Sugestões para você" por perfil e cidade'] },
    { numero: 'v1.8', titulo: 'Revisão final de segurança', mudancas: ['Sessão protegida (volta ao login se expirar)', 'Privacidade real: telefone/e-mail só quando a ONG permite', 'Proteção contra abuso em contribuições/cadastro/senha'] },
    { numero: 'v1.7', titulo: 'Assistente com Inteligência Artificial', mudancas: ['Dora, assistente de doação com IA', 'Análise de foto: identifica o item e sugere ONGs', 'Histórico de conversas estilo ChatGPT'] },
    { numero: 'v1.6', titulo: 'Tempo real & Segurança extra', mudancas: ['Matches e interesses em tempo real', '2FA no login', 'Alterar e-mail com confirmação de senha'] },
    { numero: 'v1.5', titulo: 'Comunidade & Controle', mudancas: ['Bloqueio de doador (estilo WhatsApp)', 'Estado e Cidade pelo IBGE (offline)', 'Alto contraste e navegação simplificada', '"Como chegar" no Google Maps'] },
    { numero: 'v1.4', titulo: 'Experiência renovada', mudancas: ['Redesenho do app do doador (5 abas)', 'Matches em 3 abas', 'Perfil público do doador (avaliação estilo Uber)', 'PIX em 2 fases + streak no ranking', 'Chat estilo WhatsApp'] },
    { numero: 'v1.3', titulo: 'Segurança & Conformidade', mudancas: ['Login com JWT e autorização por dono', 'LGPD + papel de administrador', 'Exclusão segura de conta', '"Esqueci a senha" + limite de tentativas'] },
    { numero: 'v1.2', titulo: 'Engajamento & Doações', mudancas: ['Feed com busca e filtros', 'Campanhas + PIX', 'Timeline, Mural, Ranking, Conquistas e Favoritos'] },
    { numero: 'v1.1', titulo: 'Confiança & Transparência', mudancas: ['Verificação de ONG (selo)', 'Prestação de contas', 'Avaliações das ONGs', 'Central de notificações'] },
    { numero: 'v1.0', titulo: 'Fundação & Match', mudancas: ['Cadastro de doadores e ONGs', 'Publicação de necessidades', 'Match (interesse e aceite)', 'Chat entre as partes'] },
  ];
  const FAQ = [
    ['O Connect ONG cobra alguma taxa?', 'Não. A plataforma é gratuita para doadores e ONGs.'],
    ['Como sei que a ONG é confiável?', 'ONGs verificadas têm selo, nota de avaliações e score de transparência com prestação de contas.'],
    ['Que tipos de doação posso fazer?', 'Itens (roupas, alimentos, higiene, etc.) e doações em dinheiro via PIX para campanhas.'],
    ['E meus dados (LGPD)?', 'Você controla o que aparece no seu perfil e pode excluir sua conta a qualquer momento.'],
  ];
  async function viewSobre() {
    let s = {};
    try { s = await API.estatisticas(); } catch {}
    const stat = (v, l) => `<div class="text-center"><p class="text-3xl font-montserrat font-black text-primary">${v ?? '—'}</p><p class="text-xs text-textGrey font-semibold uppercase tracking-wide">${l}</p></div>`;
    root().innerHTML = `
      <div class="max-w-4xl mx-auto space-y-10 slide-up pb-6">
        <!-- Hero -->
        <div class="text-center">
          <img src="assets/img/logo.jpg" alt="Connect ONG" onerror="this.style.display='none'" class="w-20 h-20 mx-auto rounded-2xl object-cover shadow mb-4">
          <h3 class="text-3xl font-montserrat font-extrabold text-textDark">Conectando quem quer ajudar<br>a quem precisa</h3>
          <p class="text-textGrey font-medium mt-3 max-w-2xl mx-auto">O Connect ONG aproxima doadores e organizações sociais com transparência, tecnologia e impacto real.</p>
        </div>
        <!-- Estatísticas -->
        <div class="bg-white rounded-3xl shadow-card border border-gray-100 p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          ${stat(s.totalOngs, 'ONGs')} ${stat(s.totalDoadores, 'Doadores')} ${stat(s.totalNecessidades, 'Necessidades')} ${stat(s.totalMatches ?? s.totalInteresses, 'Conexões')}
        </div>
        <!-- Missão/Visão/Valores -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          ${[['ph-target', 'Missão', 'Facilitar doações e conectar generosidade a quem realmente precisa.'],
             ['ph-eye', 'Visão', 'Ser a ponte digital de confiança entre doadores e ONGs no Brasil.'],
             ['ph-heart', 'Valores', 'Transparência, empatia, tecnologia com propósito e impacto social.']].map(([i, t, d]) => `
            <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-6"><div class="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-primary mb-3"><i class="ph-fill ${i} text-2xl"></i></div>
              <h4 class="font-montserrat font-bold text-textDark">${t}</h4><p class="text-sm text-textGrey mt-1">${d}</p></div>`).join('')}
        </div>
        <!-- Como funciona -->
        <div>
          <h4 class="text-xl font-montserrat font-bold text-textDark mb-4 text-center">Como funciona</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            ${[['1', 'A ONG publica', 'Cadastra necessidades e campanhas.'], ['2', 'Você encontra', 'Explora, filtra e demonstra interesse.'], ['3', 'A conexão acontece', 'Vocês conversam e a doação chega.']].map(([n, t, d]) => `
              <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-6 text-center"><div class="w-10 h-10 rounded-full bg-primary text-white font-black flex items-center justify-center mx-auto mb-3">${n}</div>
                <h5 class="font-bold text-textDark">${t}</h5><p class="text-sm text-textGrey mt-1">${d}</p></div>`).join('')}
          </div>
        </div>
        <!-- ODS -->
        <div>
          <h4 class="text-xl font-montserrat font-bold text-textDark mb-4 text-center">Objetivos de Desenvolvimento Sustentável</h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${ODS.map((o) => `<div class="rounded-2xl p-5 text-white" style="background:${o.cor}"><p class="text-3xl font-montserrat font-black">${o.n}</p><p class="text-sm font-semibold mt-1">${o.t}</p></div>`).join('')}
          </div>
        </div>
        <!-- Equipe -->
        <div>
          <h4 class="text-xl font-montserrat font-bold text-textDark mb-1 text-center">Nossa equipe</h4>
          <p class="text-sm text-textGrey text-center mb-4">4º DSN — COTIL / UNICAMP</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${EQUIPE.map((m) => `<div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 text-center">
              <img src="${m.img}" alt="${UI.esc(m.nome)}" onerror="this.style.display='none'" class="w-20 h-20 mx-auto rounded-full object-cover mb-2">
              <p class="font-bold text-textDark text-sm leading-tight">${UI.esc(m.nome)}</p><p class="text-xs text-textGrey">${UI.esc(m.papel)}</p></div>`).join('')}
          </div>
        </div>
        <!-- FAQ -->
        <div>
          <h4 class="text-xl font-montserrat font-bold text-textDark mb-4 text-center">Perguntas frequentes</h4>
          <div class="space-y-3 max-w-2xl mx-auto">
            ${FAQ.map(([q, a]) => `<details class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 group">
              <summary class="font-bold text-textDark cursor-pointer flex items-center justify-between">${q}<i class="ph ph-caret-down group-open:rotate-180 transition-transform"></i></summary>
              <p class="text-sm text-textGrey mt-2">${a}</p></details>`).join('')}
          </div>
        </div>
        <!-- Versões -->
        <div>
          <h4 class="text-xl font-montserrat font-bold text-textDark mb-4 text-center">Versões</h4>
          <div class="space-y-3 max-w-2xl mx-auto">
            ${KVERSOES.map((v) => `<details class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 group" ${v.atual ? 'open' : ''}>
              <summary class="cursor-pointer flex items-center justify-between">
                <span class="flex items-center gap-2"><span class="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full">${v.numero}</span>
                  <span class="font-bold text-textDark">${UI.esc(v.titulo)}</span>
                  ${v.atual ? '<span class="text-[10px] font-bold text-white bg-accent px-2 py-0.5 rounded-full">Atual</span>' : ''}</span>
                <i class="ph ph-caret-down group-open:rotate-180 transition-transform"></i>
              </summary>
              <ul class="mt-3 space-y-1.5">${v.mudancas.map((m) => `<li class="text-sm text-textGrey flex gap-2"><i class="ph ph-check text-primary mt-0.5"></i><span>${UI.esc(m)}</span></li>`).join('')}</ul>
            </details>`).join('')}
          </div>
        </div>
        <p class="text-center text-xs text-textGrey">Projeto Integrador • COTIL / UNICAMP • 2026</p>
      </div>`;
  }

  // =========================================================================
  // ATIVIDADES (timeline global da comunidade)
  // =========================================================================
  const ATIV_ICON = { INTERESSE: 'ph-hand-heart', MATCH: 'ph-heart', DOACAO: 'ph-gift', CAMPANHA: 'ph-megaphone', PRESTACAO: 'ph-receipt', NECESSIDADE: 'ph-package', AVALIACAO: 'ph-star' };
  async function viewAtividades() {
    root().innerHTML = carregando();
    try {
      const l = await API.atividades(40);
      root().innerHTML = `
        <p class="text-textGrey font-medium mb-5 slide-up">O que está acontecendo agora na comunidade Connect ONG.</p>
        <div class="max-w-2xl slide-up">${(l || []).length ? l.map((a) => `
          <div class="flex gap-3 pb-4">
            <div class="flex flex-col items-center">
              <div class="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary flex-shrink-0"><i class="ph-fill ${ATIV_ICON[a.tipo] || 'ph-circle'}"></i></div>
              <div class="w-0.5 flex-1 bg-gray-100 mt-1"></div>
            </div>
            <div class="flex-1 min-w-0 pb-2">
              <p class="text-sm text-textDark">${UI.esc(a.descricao || '')}</p>
              <p class="text-xs text-textGrey mt-0.5">${a.ongNome ? `<button data-perfil-ong="${a.ongId}" class="font-semibold text-primary">${UI.esc(a.ongNome)}</button> · ` : ''}${UI.dataCurta(a.dataCriacao)} ${UI.horaCurta(a.dataCriacao)}</p>
            </div>
          </div>`).join('') : vazio('ph-pulse', 'Sem atividades', 'Volte mais tarde.')}</div>`;
    } catch (e) { root().innerHTML = erroBox(e.message, 'atividades'); }
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
  // ★ EXCLUSIVO DA WEB — MAPA INTERATIVO DE ONGs (Leaflet + OpenStreetMap)
  // Geocodificação offline por cidade (assets/dados/cidades_coords.json).
  // =========================================================================
  let _coordsCidades = null;
  async function coordsCidades() {
    if (_coordsCidades) return _coordsCidades;
    try { const r = await fetch('assets/dados/cidades_coords.json'); _coordsCidades = await r.json(); }
    catch { _coordsCidades = {}; }
    return _coordsCidades;
  }
  // Normaliza a cidade: minúsculo, sem acento, sem o sufixo " - SP".
  function chaveCidade(cidade) {
    return UI.chaveCat(cidade).replace(/\s*-\s*[a-z]{2}\.?\s*$/, '').trim();
  }
  const mapaState = { termo: '', instancia: null };
  function pinOng(o) {
    return L.divIcon({
      className: '', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18],
      html: `<div class="co-pin ${o.verificada ? 'verificada' : ''}"><i class="ph-fill ph-buildings"></i></div>`,
    });
  }
  function popupOng(o) {
    const nota = (Number(o.notaMedia) || 0).toFixed(1);
    return `<div style="min-width:210px;font-family:Inter,sans-serif">
      <div style="font-weight:800;font-size:15px;color:#111827;line-height:1.2">${UI.esc(o.nome)} ${o.verificada ? '<span style="color:#008542">✔</span>' : ''}</div>
      <div style="color:#4b5563;font-size:12px;margin-top:3px">📍 ${UI.esc(o.cidade || 'Brasil')}</div>
      <div style="color:#4b5563;font-size:12px;margin-top:2px">★ ${nota} · ${o.totalAvaliacoes || 0} avaliação(ões)</div>
      <button data-perfil-ong="${o.id}" style="margin-top:9px;width:100%;background:#008542;color:#fff;font-weight:700;border:none;border-radius:10px;padding:8px 10px;cursor:pointer;font-size:13px">Ver perfil da ONG</button>
    </div>`;
  }
  async function viewMapa() {
    // Descarta instância anterior (evita "Map container is already initialized").
    if (mapaState.instancia) { try { mapaState.instancia.remove(); } catch {} mapaState.instancia = null; }
    root().innerHTML = carregando('Carregando o mapa…');
    if (typeof L === 'undefined') { root().innerHTML = erroBox('O mapa precisa de internet (Leaflet/OpenStreetMap) e não pôde ser carregado.', 'mapa'); return; }
    try {
      const [ongs, coords] = await Promise.all([API.ongs(), coordsCidades()]);
      state.ongs = ongs;
      const comCoord = [], semCoord = [];
      for (const o of ongs) { const c = coords[chaveCidade(o.cidade)]; if (c) comCoord.push({ o, c }); else semCoord.push(o); }
      root().innerHTML = `
        <p class="text-textGrey font-medium mb-4 slide-up">${comCoord.length} ONG(s) no mapa — clique num marcador para abrir o perfil.${semCoord.length ? ` <span class="text-textGrey/70">(${semCoord.length} sem localização cadastrada)</span>` : ''}</p>
        <div class="relative rounded-3xl overflow-hidden shadow-card border border-gray-100 slide-up" style="height:calc(100vh - 230px);min-height:440px">
          <div id="mapa-leaflet" class="absolute inset-0"></div>
          <div class="absolute top-3 left-3 z-[500] w-[min(20rem,70%)]">
            <div class="relative">
              <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-textGrey"></i>
              <input id="mapa-busca" value="${UI.esc(mapaState.termo)}" placeholder="Filtrar por nome ou cidade…" class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/95 shadow-md border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            </div>
          </div>
        </div>
        ${semCoord.length ? `<p class="text-xs text-textGrey mt-3">Sem localização no mapa: ${semCoord.map((o) => UI.esc(o.nome)).join(', ')}.</p>` : ''}`;
      const map = L.map('mapa-leaflet', { zoomControl: true, scrollWheelZoom: true }).setView([-22.5, -47.4], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      mapaState.instancia = map;
      const grupo = L.featureGroup().addTo(map);
      function pintar(termo) {
        grupo.clearLayers();
        const t = (termo || '').trim().toLowerCase();
        const contagem = {}; const pts = [];
        for (const { o, c } of comCoord) {
          if (t && !(o.nome + ' ' + (o.cidade || '')).toLowerCase().includes(t)) continue;
          const k = chaveCidade(o.cidade);
          const n = contagem[k] = (contagem[k] || 0);
          contagem[k] = n + 1;
          // Dispersão determinística (espiral) para ONGs na mesma cidade.
          const ang = n * 2.399, raio = n ? 0.018 + n * 0.007 : 0;
          const lat = c[0] + Math.sin(ang) * raio, lng = c[1] + Math.cos(ang) * raio;
          L.marker([lat, lng], { icon: pinOng(o) }).addTo(grupo).bindPopup(popupOng(o), { minWidth: 210 });
          pts.push([lat, lng]);
        }
        if (pts.length) { try { map.fitBounds(pts, { padding: [70, 70], maxZoom: 12 }); } catch {} }
      }
      pintar(mapaState.termo);
      $('#mapa-busca').addEventListener('input', (e) => { mapaState.termo = e.target.value; pintar(e.target.value); });
      setTimeout(() => { try { map.invalidateSize(); } catch {} }, 200);
    } catch (e) { root().innerHTML = erroBox(e.message, 'mapa'); }
  }

  // =========================================================================
  // ★ EXCLUSIVO DA WEB — COMPARADOR DE ONGs (lado a lado)
  // =========================================================================
  const comparar = { ids: [] };
  async function viewComparar() {
    root().innerHTML = carregando();
    try {
      const ongs = await API.ongs(); state.ongs = ongs;
      if (!state.perfisComp) state.perfisComp = {};
      // Deep-link: ?comparar=18,21 pré-seleciona ONGs (comparação compartilhável).
      if (!comparar.ids.length) {
        const q = new URLSearchParams(location.search).get('comparar');
        if (q) comparar.ids = q.split(',').map(Number).filter((n) => ongs.some((o) => o.id === n)).slice(0, 3);
      }
      await pintarComparar();
    } catch (e) { root().innerHTML = erroBox(e.message, 'comparar'); }
  }
  const cmpBusca = { termo: '' };
  async function pintarComparar() {
    const ongs = state.ongs || [];
    const selIds = comparar.ids.slice(0, 3);
    // Garante perfis carregados para as selecionadas.
    await Promise.all(selIds.map(async (id) => {
      if (!state.perfisComp[id]) { try { state.perfisComp[id] = await API.perfilOng(id); } catch { state.perfisComp[id] = null; } }
    }));
    const t = cmpBusca.termo.trim().toLowerCase();
    const candidatas = ongs
      .filter((o) => !selIds.includes(o.id))
      .filter((o) => !t || (o.nome + ' ' + (o.cidade || '')).toLowerCase().includes(t))
      .slice(0, 8);
    root().innerHTML = `
      <p class="text-textGrey font-medium mb-4 slide-up">Escolha até 3 ONGs e compare transparência, nota e prestações lado a lado — a decisão fica fácil na tela larga.</p>
      <div class="mb-6 slide-up">
        <div class="relative w-full md:w-1/2 mb-3">
          <i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-textGrey text-xl"></i>
          <input id="cmp-busca" value="${UI.esc(cmpBusca.termo)}" placeholder="Buscar ONG para adicionar…" ${selIds.length >= 3 ? 'disabled' : ''} class="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:border-primary disabled:opacity-50">
        </div>
        <div class="flex flex-wrap gap-2">
          ${selIds.length >= 3 ? '<span class="text-sm text-textGrey font-semibold">Máximo de 3 ONGs. Remova uma para trocar.</span>'
            : candidatas.map((o) => `<button data-cmp-add="${o.id}" class="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white hover:border-primary hover:text-primary font-bold text-sm transition-colors">
                <i class="ph ph-plus"></i> ${UI.esc(o.nome)}</button>`).join('') || '<span class="text-sm text-textGrey">Nenhuma ONG encontrada.</span>'}
        </div>
      </div>
      <div id="cmp-tabela" class="slide-up">${selIds.length < 2
        ? vazio('ph-scales', 'Selecione ao menos 2 ONGs', 'Adicione ONGs acima para ver a comparação lado a lado.')
        : tabelaComparar(selIds)}</div>`;
    const bu = $('#cmp-busca');
    if (bu) bu.addEventListener('input', (e) => { cmpBusca.termo = e.target.value; pintarComparar(); });
  }
  function linhaCmp(label, valores, icon) {
    return `<tr class="border-t border-gray-100">
      <th class="text-left p-3 text-sm font-bold text-textGrey whitespace-nowrap align-top"><i class="ph ${icon} text-primary"></i> ${label}</th>
      ${valores.map((v) => `<td class="p-3 text-center align-top">${v}</td>`).join('')}</tr>`;
  }
  function tabelaComparar(selIds) {
    const perfis = selIds.map((id) => state.perfisComp[id]).filter(Boolean);
    if (perfis.length < 2) return erroBox('Não foi possível carregar todos os perfis para comparar.');
    // Destaques: melhor nota, maior score, mais prestações.
    const max = (f) => Math.max(...perfis.map(f));
    const melhorNota = max((p) => Number(p.notaMedia) || 0);
    const melhorScore = max((p) => Number(p.transparenciaScore) || 0);
    const melhorPrest = max((p) => (p.totalPrestacoes ?? (p.prestacoes || []).length) || 0);
    const destaque = (cond, txt) => cond ? `<span class="inline-block mt-1 text-[10px] font-bold text-white bg-primary rounded-full px-2 py-0.5">${txt}</span>` : '';
    const cab = perfis.map((p) => {
      const nv = NIVEL[p.nivelTransparencia] || {};
      return `<th class="p-4 align-bottom" style="width:${Math.floor(72 / perfis.length)}%">
        <div class="flex flex-col items-center gap-2">
          <button data-cmp-rm="${p.id}" class="self-end -mb-1 text-textGrey hover:text-red-500" title="Remover"><i class="ph ph-x-circle text-lg"></i></button>
          ${UI.avatar(p.nome, 'w-14 h-14 text-lg')}
          <button data-perfil-ong="${p.id}" class="font-montserrat font-bold text-textDark text-sm leading-tight hover:text-primary text-center">${UI.esc(p.nome)} ${p.verificada ? '<i class="ph-fill ph-seal-check text-primary text-xs"></i>' : ''}</button>
          ${p.nivelTransparencia ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${nv.cls || 'bg-gray-100'}">${nv.emoji || ''} ${p.nivelTransparencia}</span>` : ''}
        </div></th>`;
    }).join('');
    const notaCell = (p) => { const v = Number(p.notaMedia) || 0; return `<div>${UI.estrelas(v)}<p class="font-bold text-textDark mt-1">${v.toFixed(1)} <span class="text-xs text-textGrey font-normal">(${p.totalAvaliacoes || 0})</span></p>${destaque(v > 0 && v === melhorNota, 'Melhor nota')}</div>`; };
    const scoreCell = (p) => { const v = Number(p.transparenciaScore) || 0; return `<div><p class="text-2xl font-montserrat font-black text-primary">${v}</p><p class="text-xs text-textGrey">pontos</p>${destaque(v > 0 && v === melhorScore, 'Mais transparente')}</div>`; };
    const prestCell = (p) => { const v = (p.totalPrestacoes ?? (p.prestacoes || []).length) || 0; return `<div><p class="font-bold text-textDark">${v}</p>${destaque(v > 0 && v === melhorPrest, 'Mais prestações')}</div>`; };
    const necCell = (p) => `${(p.totalNecessidades ?? (p.necessidades || []).filter((n) => n.status === 'ABERTA').length) || 0}`;
    return `<div class="overflow-x-auto rounded-2xl border border-gray-100 shadow-card bg-white">
      <table class="w-full border-collapse min-w-[520px]">
        <thead><tr><th class="p-4"></th>${cab}</tr></thead>
        <tbody>
          ${linhaCmp('Cidade', perfis.map((p) => `<span class="text-sm text-textDark">${UI.esc(p.cidade || 'Brasil')}</span>`), 'ph-map-pin')}
          ${linhaCmp('Nota média', perfis.map(notaCell), 'ph-star')}
          ${linhaCmp('Transparência', perfis.map(scoreCell), 'ph-shield-check')}
          ${linhaCmp('Prestações de contas', perfis.map(prestCell), 'ph-receipt')}
          ${linhaCmp('Necessidades abertas', perfis.map((p) => `<span class="font-bold text-textDark">${necCell(p)}</span>`), 'ph-package')}
          ${linhaCmp('Campanhas', perfis.map((p) => `<span class="font-bold text-textDark">${(p.totalCampanhas ?? (p.campanhas || []).length) || 0}</span>`), 'ph-megaphone')}
          ${linhaCmp('Verificada', perfis.map((p) => p.verificada ? '<i class="ph-fill ph-seal-check text-primary text-xl"></i>' : '<span class="text-textGrey">—</span>'), 'ph-seal-check')}
          ${linhaCmp('', perfis.map((p) => `<button data-perfil-ong="${p.id}" class="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-xl">Ver perfil</button>`), 'ph-arrow-right')}
        </tbody>
      </table></div>`;
  }

  // =========================================================================
  // ★ EXCLUSIVO DA WEB — MODO QUIOSQUE / APRESENTAÇÃO (tela cheia p/ a feira)
  // =========================================================================
  let showcaseRefresh = null, showcaseRotaciona = null;
  function showcaseEsc(e) { if (e.key === 'Escape') fecharShowcase(); }
  function animarNumero(el, alvo, dur = 1400) {
    const ini = performance.now(); const de = 0;
    function passo(t) {
      const p = Math.min(1, (t - ini) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(de + (alvo - de) * ease).toLocaleString('pt-BR');
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }
  async function abrirShowcase() {
    const el = $('#view-showcase');
    el.hidden = false;
    el.innerHTML = `<div class="h-full flex items-center justify-center text-white/70"><i class="ph ph-circle-notch spin text-4xl"></i></div>`;
    document.addEventListener('keydown', showcaseEsc);
    await carregarShowcase();
    showcaseRefresh = setInterval(carregarShowcase, 25000);
  }
  function fecharShowcase() {
    if (showcaseRefresh) { clearInterval(showcaseRefresh); showcaseRefresh = null; }
    if (showcaseRotaciona) { clearInterval(showcaseRotaciona); showcaseRotaciona = null; }
    document.removeEventListener('keydown', showcaseEsc);
    const el = $('#view-showcase'); el.hidden = true; el.innerHTML = '';
  }
  async function carregarShowcase() {
    const [s, ativ, rank] = await Promise.all([
      API.estatisticas().catch(() => ({})),
      API.atividades(20).catch(() => []),
      API.ranking(10).catch(() => []),
    ]);
    renderShowcase(s, ativ || [], rank || []);
  }
  function renderShowcase(s, ativ, rank) {
    const el = $('#view-showcase');
    const tiles = [
      { k: 'totalOngs', l: 'ONGs parceiras', i: 'ph-buildings', v: s.totalOngs },
      { k: 'totalDoadores', l: 'Doadores', i: 'ph-users-three', v: s.totalDoadores },
      { k: 'totalNecessidades', l: 'Necessidades', i: 'ph-package', v: s.totalNecessidades },
      { k: 'totalMatches', l: 'Conexões', i: 'ph-heart', v: s.totalMatches ?? s.totalInteresses },
    ];
    const tickerItens = ativ.length ? ativ.map((a) => `<span class="inline-flex items-center gap-2 mx-6 text-white/90">
      <i class="ph-fill ${ATIV_ICON[a.tipo] || 'ph-circle'} text-accent"></i>${UI.esc(a.descricao || '')}${a.ongNome ? ` <span class="text-white/50">· ${UI.esc(a.ongNome)}</span>` : ''}</span>`).join('')
      : '<span class="mx-6 text-white/60">A comunidade Connect ONG está começando…</span>';
    el.innerHTML = `
      <div class="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-primary/40 blur-3xl glow"></div>
      <div class="absolute -bottom-32 -right-24 w-[560px] h-[560px] rounded-full bg-accent/25 blur-3xl glow" style="animation-delay:2s"></div>
      <div class="relative z-10 min-h-full flex flex-col p-6 lg:p-10">
        <!-- Cabeçalho -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <img src="assets/img/logo.jpg" alt="Connect ONG" onerror="this.style.display='none'" class="w-14 h-14 rounded-2xl object-cover shadow-lg">
            <div>
              <h1 class="text-3xl lg:text-4xl font-montserrat font-black tracking-tight">Connect <span class="text-primary">ONG</span></h1>
              <p class="text-white/60 font-semibold text-sm">Conectando quem quer ajudar a quem precisa</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <span class="hidden sm:inline-flex items-center gap-2 text-white/70 font-semibold"><span class="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span> ao vivo</span>
            <button id="showcase-sair" class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Sair (Esc)"><i class="ph ph-x text-xl"></i></button>
          </div>
        </div>

        <!-- Corpo -->
        <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <!-- Estatísticas gigantes -->
          <div class="lg:col-span-2 flex flex-col justify-center gap-5">
            <div class="grid grid-cols-2 gap-5">
              ${tiles.map((t) => `<div class="bg-white/5 backdrop-blur rounded-3xl p-5 border border-white/10">
                <i class="ph-fill ${t.i} text-2xl lg:text-3xl text-accent"></i>
                <p class="showcase-num text-5xl lg:text-6xl font-montserrat font-black mt-2" data-alvo="${Number(t.v) || 0}">0</p>
                <p class="text-white/60 font-bold uppercase tracking-wider text-xs lg:text-sm mt-1">${t.l}</p>
              </div>`).join('')}
            </div>
            <div class="bg-gradient-to-r from-primary to-primary-dark rounded-3xl p-5 flex items-center justify-between">
              <div>
                <p class="text-white/80 font-semibold text-sm">Já arrecadado em campanhas</p>
                <p class="text-4xl lg:text-5xl font-montserrat font-black mt-1">${UI.brl(s.valorTotalDoado)}</p>
              </div>
              <i class="ph-fill ph-hand-heart text-5xl lg:text-6xl text-white/30"></i>
            </div>
          </div>

          <!-- Ranking de transparência -->
          <div class="bg-white/5 backdrop-blur rounded-3xl p-6 border border-white/10 flex flex-col min-h-0">
            <h2 class="font-montserrat font-black text-xl flex items-center gap-2 mb-4"><i class="ph-fill ph-trophy text-accent"></i> Mais transparentes</h2>
            <div class="flex-1 overflow-hidden space-y-2">
              ${(rank.length ? rank.slice(0, 8) : []).map((o, i) => `
                <div class="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
                  <span class="text-xl font-montserrat font-black w-8 text-center">${['🥇', '🥈', '🥉'][i] || (i + 1)}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold truncate">${UI.esc(o.nome)}</p>
                    <p class="text-white/50 text-xs truncate">${UI.esc(o.cidade || 'Brasil')} · ${o.nivel || ''}</p>
                  </div>
                  <span class="font-montserrat font-black text-primary text-lg">${o.score}</span>
                </div>`).join('') || '<p class="text-white/50">Sem ranking ainda.</p>'}
            </div>
          </div>
        </div>

        <!-- Ticker de atividades -->
        <div class="mt-6 overflow-hidden border-t border-white/10 pt-4">
          <p class="text-white/40 font-bold uppercase tracking-widest text-xs mb-2">Acontecendo agora</p>
          <div class="whitespace-nowrap overflow-hidden">
            <div class="marquee-x">${tickerItens}${tickerItens}</div>
          </div>
        </div>
      </div>`;
    el.querySelectorAll('.showcase-num').forEach((n) => animarNumero(n, Number(n.dataset.alvo) || 0));
    $('#showcase-sair').addEventListener('click', fecharShowcase);
  }

  // =========================================================================
  // ★ EXCLUSIVO DA WEB — RELATÓRIO DE IMPACTO IMPRIMÍVEL / PDF
  // =========================================================================
  async function gerarRelatorio() {
    UI.toast('Preparando seu relatório…', 'info');
    try {
      const u = API.usuario() || {};
      const [inter, fin, conq] = await Promise.all([
        API.meusInteresses().catch(() => []),
        API.minhasDoacoesFinanceiras().catch(() => []),
        API.conquistas().catch(() => []),
      ]);
      const concl = inter.filter((i) => i.status === 'CONCLUIDO');
      const ativos = inter.filter((i) => i.status === 'ACEITO').length;
      const ongsAjudadas = new Set(concl.map((i) => i.ongId)).size;
      const totalDinheiro = (fin || []).reduce((s, d) => s + (Number(d.valor) || 0), 0);
      const conquistadas = (conq || []).filter((c) => c.conquistada);
      const agora = new Date();
      const box = (v, l) => `<div style="flex:1;text-align:center;padding:14px;border:1px solid #e5e7eb;border-radius:14px">
        <div style="font-size:34px;font-weight:900;color:#008542;font-family:Montserrat,sans-serif">${v}</div>
        <div style="font-size:12px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${l}</div></div>`;
      $('#print-root').innerHTML = `
        <div style="font-family:Inter,Arial,sans-serif;color:#111827;max-width:720px;margin:0 auto">
          <div class="print-avoid-break" style="display:flex;align-items:center;gap:14px;border-bottom:3px solid #008542;padding-bottom:14px;margin-bottom:20px">
            <div style="width:52px;height:52px;border-radius:14px;background:#008542;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px;font-family:Montserrat,sans-serif">C</div>
            <div style="flex:1">
              <div style="font-size:22px;font-weight:900;font-family:Montserrat,sans-serif">Relatório de Impacto</div>
              <div style="font-size:13px;color:#4b5563">Connect ONG · ${UI.esc(u.nome || 'Doador')} · emitido em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>

          <div class="print-avoid-break" style="display:flex;gap:12px;margin-bottom:22px">
            ${box(concl.length, 'Doações concluídas')}
            ${box(ongsAjudadas, 'ONGs ajudadas')}
            ${box((fin || []).length, 'Doações em $')}
            ${box(UI.brl(totalDinheiro).replace('R$', 'R$ '), 'Total doado')}
          </div>

          <div class="print-avoid-break" style="margin-bottom:22px">
            <div style="font-size:16px;font-weight:800;margin-bottom:10px;font-family:Montserrat,sans-serif">Doações concluídas</div>
            ${concl.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="text-align:left;color:#4b5563;border-bottom:1px solid #e5e7eb">
                <th style="padding:6px 4px">Item</th><th style="padding:6px 4px">ONG</th><th style="padding:6px 4px">Situação</th></tr></thead>
              <tbody>${concl.map((i) => `<tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:6px 4px;font-weight:600">${UI.esc(i.necessidadeTitulo || 'Doação')}</td>
                <td style="padding:6px 4px">${UI.esc(i.ongNome || '')}</td>
                <td style="padding:6px 4px;color:#008542;font-weight:700">Concluída</td></tr>`).join('')}</tbody>
            </table>` : '<div style="color:#4b5563;font-size:13px">Nenhuma doação concluída ainda — sua jornada está só começando!</div>'}
          </div>

          ${(fin || []).length ? `<div class="print-avoid-break" style="margin-bottom:22px">
            <div style="font-size:16px;font-weight:800;margin-bottom:10px;font-family:Montserrat,sans-serif">Doações em dinheiro (PIX)</div>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tbody>${fin.map((d) => `<tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:6px 4px;font-weight:600">${UI.esc(d.ongNome || 'ONG')}</td>
                <td style="padding:6px 4px;color:#4b5563">${d.campanhaTitulo ? UI.esc(d.campanhaTitulo) : '—'}</td>
                <td style="padding:6px 4px;text-align:right;font-weight:800;color:#008542">${UI.brl(d.valor)}</td></tr>`).join('')}</tbody>
            </table>
          </div>` : ''}

          ${conquistadas.length ? `<div class="print-avoid-break" style="margin-bottom:22px">
            <div style="font-size:16px;font-weight:800;margin-bottom:10px;font-family:Montserrat,sans-serif">Conquistas (${conquistadas.length})</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">${conquistadas.map((c) => `<span style="border:1px solid #ffd8a8;background:#fff4e6;color:#b45309;font-weight:700;font-size:12px;padding:6px 12px;border-radius:999px">🏅 ${UI.esc(c.titulo)}</span>`).join('')}</div>
          </div>` : ''}

          <div style="margin-top:26px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#9ca3af;text-align:center">
            Gerado pelo Connect ONG · Obrigado por transformar vidas 💚
          </div>
        </div>`;
      // Dá um tempo para o layout aplicar antes de imprimir.
      setTimeout(() => window.print(), 250);
    } catch (e) { UI.toast('Não foi possível gerar o relatório: ' + e.message, 'erro'); }
  }

  // =========================================================================
  // ★ EXCLUSIVO DA WEB — COMMAND PALETTE (Ctrl/Cmd + K) + busca global
  // =========================================================================
  const cmdk = { aberto: false, itens: [], filtro: '', sel: 0 };
  function acoesFixas() {
    const nav = ROTAS.map((r) => ({ tipo: 'rota', rota: r.id, titulo: r.label, sub: 'Ir para', icon: r.icon }));
    nav.push({ tipo: 'rota', rota: 'sobre', titulo: 'Sobre o Connect ONG', sub: 'Ir para', icon: 'ph-info' });
    nav.push({ tipo: 'rota', rota: 'atividades', titulo: 'Atividades da comunidade', sub: 'Ir para', icon: 'ph-pulse' });
    const acoes = [
      { tipo: 'acao', fn: () => abrirShowcase(), titulo: 'Abrir Modo Quiosque', sub: 'Ação', icon: 'ph-presentation-chart' },
      { tipo: 'acao', fn: () => abrirNovaDoacao(), titulo: 'Cadastrar nova doação', sub: 'Ação', icon: 'ph-gift' },
      { tipo: 'acao', fn: () => gerarRelatorio(), titulo: 'Gerar relatório de impacto (PDF)', sub: 'Ação', icon: 'ph-printer' },
      { tipo: 'acao', fn: () => abrirNotificacoes(), titulo: 'Ver notificações', sub: 'Ação', icon: 'ph-bell' },
    ];
    return nav.concat(acoes);
  }
  async function montarItensCmdk() {
    const itens = acoesFixas();
    // ONGs e necessidades (usa cache; dispara carga se faltar).
    (state.ongs || []).forEach((o) => itens.push({ tipo: 'ong', id: o.id, titulo: o.nome, sub: 'ONG · ' + (o.cidade || 'Brasil'), icon: 'ph-buildings' }));
    (state.necessidades || []).filter((n) => n.status === 'ABERTA').forEach((n) => itens.push({ tipo: 'nec', id: n.id, titulo: n.titulo, sub: 'Necessidade · ' + (n.ongNome || ''), icon: 'ph-package' }));
    cmdk.itens = itens;
  }
  function abrirCmdk() {
    if ($('#view-app').hidden) return; // só logado
    cmdk.aberto = true; cmdk.filtro = ''; cmdk.sel = 0;
    montarItensCmdk();
    // Carrega ONGs/necessidades em segundo plano se ainda não há cache.
    const precisa = [];
    if (!state.ongs) precisa.push(API.ongs().then((l) => { state.ongs = l; }).catch(() => {}));
    if (!state.necessidades) precisa.push(getNecessidades().catch(() => {}));
    if (precisa.length) Promise.all(precisa).then(() => { if (cmdk.aberto) { montarItensCmdk(); pintarCmdk(); } });
    $('#cmdk-root').innerHTML = `
      <div id="cmdk-bg" class="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] p-4 fade-in">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden slide-up">
          <div class="flex items-center gap-3 px-4 border-b border-gray-100">
            <i class="ph ph-magnifying-glass text-xl text-textGrey"></i>
            <input id="cmdk-input" placeholder="Buscar telas, ONGs, ações…" autocomplete="off" class="flex-1 py-4 text-lg focus:outline-none bg-transparent">
            <kbd class="text-[10px] font-bold text-textGrey bg-gray-100 rounded px-1.5 py-0.5">ESC</kbd>
          </div>
          <div id="cmdk-lista" class="max-h-[52vh] overflow-y-auto p-2"></div>
        </div>
      </div>`;
    const inp = $('#cmdk-input');
    inp.addEventListener('input', (e) => { cmdk.filtro = e.target.value; cmdk.sel = 0; pintarCmdk(); });
    inp.addEventListener('keydown', navCmdk);
    $('#cmdk-bg').addEventListener('click', (e) => { if (e.target.id === 'cmdk-bg') fecharCmdk(); });
    pintarCmdk();
    setTimeout(() => inp.focus(), 30);
  }
  function fecharCmdk() { cmdk.aberto = false; $('#cmdk-root').innerHTML = ''; }
  function filtrarCmdk() {
    const t = cmdk.filtro.trim().toLowerCase();
    let r = cmdk.itens;
    if (t) r = r.filter((i) => (i.titulo + ' ' + (i.sub || '')).toLowerCase().includes(t));
    return r.slice(0, 30);
  }
  function pintarCmdk() {
    const lista = $('#cmdk-lista'); if (!lista) return;
    const r = filtrarCmdk();
    cmdk._filtrados = r;
    if (cmdk.sel >= r.length) cmdk.sel = Math.max(0, r.length - 1);
    lista.innerHTML = r.length ? r.map((i, idx) => `
      <button data-cmdk-idx="${idx}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left ${idx === cmdk.sel ? 'bg-primary-light' : 'hover:bg-gray-50'}">
        <span class="w-9 h-9 rounded-lg bg-background flex items-center justify-center text-primary flex-shrink-0"><i class="ph ${i.icon}"></i></span>
        <span class="flex-1 min-w-0"><span class="block font-bold text-textDark truncate">${UI.esc(i.titulo)}</span><span class="block text-xs text-textGrey truncate">${UI.esc(i.sub || '')}</span></span>
        ${idx === cmdk.sel ? '<kbd class="text-[10px] font-bold text-textGrey bg-gray-100 rounded px-1.5 py-0.5">↵</kbd>' : ''}
      </button>`).join('')
      : `<p class="text-center text-textGrey py-8 text-sm">Nada encontrado para "${UI.esc(cmdk.filtro)}".</p>`;
    lista.querySelectorAll('[data-cmdk-idx]').forEach((b) => b.addEventListener('click', () => executarCmdk(Number(b.dataset.cmdkIdx))));
    const ativo = lista.querySelector(`[data-cmdk-idx="${cmdk.sel}"]`);
    if (ativo) ativo.scrollIntoView({ block: 'nearest' });
  }
  function navCmdk(e) {
    const r = cmdk._filtrados || [];
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdk.sel = Math.min(r.length - 1, cmdk.sel + 1); pintarCmdk(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); cmdk.sel = Math.max(0, cmdk.sel - 1); pintarCmdk(); }
    else if (e.key === 'Enter') { e.preventDefault(); executarCmdk(cmdk.sel); }
    else if (e.key === 'Escape') { e.preventDefault(); fecharCmdk(); }
  }
  function executarCmdk(idx) {
    const i = (cmdk._filtrados || [])[idx]; if (!i) return;
    fecharCmdk();
    if (i.tipo === 'rota') irPara(i.rota);
    else if (i.tipo === 'ong') abrirPerfilOng(Number(i.id));
    else if (i.tipo === 'nec') abrirNecessidade(Number(i.id));
    else if (i.tipo === 'acao' && i.fn) i.fn();
  }

  // =========================================================================
  // Roteador
  // =========================================================================
  const VIEWS = {
    inicio: viewInicio, explorar: viewExplorar, matches: viewMatches, campanhas: viewCampanhas, dora: viewDora,
    ongs: viewOngs, favoritos: viewFavoritos, impacto: viewImpacto, ranking: viewRanking,
    doacoes: viewDoacoes, config: viewConfig, sobre: viewSobre, atividades: viewAtividades,
    mapa: viewMapa, comparar: viewComparar,
  };
  function irPara(rota) {
    // Modo Quiosque é uma sobreposição de tela cheia, não troca a view do app.
    if (rota === 'showcase') { abrirShowcase(); return; }
    if (!VIEWS[rota]) rota = 'inicio';
    // Ao sair dos Ajustes com alterações não salvas, confirma (salvar/descartar).
    if (state.rota === 'config' && rota !== 'config' && cfgDraft && state.prefs && !prefsIguais(cfgDraft, state.prefs)) {
      if (!confirm('Você tem alterações não salvas nos Ajustes. Descartar as alterações?')) return;
      cfgDraft = null; aplicarPreferencias(state.prefs);
    }
    // Ao entrar nos Ajustes, re-sincroniza o rascunho com o que está salvo.
    if (rota === 'config' && state.rota !== 'config') cfgDraft = null;
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
    $('#perfil-avatar').innerHTML = UI.avatar(u.nome, 'w-10 h-10', u.fotoBase64);
  }
  let sinoPoll = null;
  async function aoEntrar() {
    pintarPerfil();
    atualizarSino();
    if (sinoPoll) clearInterval(sinoPoll);
    sinoPoll = setInterval(atualizarSino, 30000);
    // Deep-link de ONG compartilhada (#/ong/{id}) abre a rota ONGs + o perfil.
    const mo = (location.hash || '').match(/^#\/ong\/(\d+)/);
    if (mo) { irPara('ongs'); abrirPerfilOng(Number(mo[1])); }
    else irPara(location.hash.replace('#/', '') || 'inicio');
    // Enriquamos a sessão com o perfil real (foto, cidade, estado) para avatares e frete.
    try {
      const p = await API.meuPerfil();
      API.mesclarUsuario({
        fotoBase64: p.fotoBase64 || null, cidade: p.cidade || null,
        estado: p.estado || null, telefone: p.telefone || null, bio: p.bio || null,
      });
      pintarPerfil();
    } catch { /* opcional */ }
    // Preferências reais do backend (tema, fonte, acessibilidade).
    try { state.prefs = await API.preferencias(); aplicarPreferencias(state.prefs); }
    catch { /* mantém cache local */ }
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
    if (sinoPoll) { clearInterval(sinoPoll); sinoPoll = null; }
    fecharModal();
    // Volta ao tema claro no login (as prefs são por-usuário).
    state.prefs = null; cfgDraft = null;
    document.body.classList.remove('tema-escuro', 'alto-contraste', 'fonte-dislexia', 'reduz-motion');
    document.documentElement.style.fontSize = '16px';
    // Limpa caches em memória para não vazar dados entre sessões.
    state.interMap = null; state.necessidades = null; state.campanhas = null;
    state.ongs = null; state.favIds = null; matches.dados = null; dora.historico = [];
    // Reseta os formulários (o botão ficava preso no spinner após um login).
    const fl = $('#form-login'), fc = $('#form-cadastro');
    fl.reset(); fc.reset();
    fl.hidden = false; fc.hidden = true;
    fl.querySelector('.btn-submit').disabled = false;
    fl.querySelector('.btn-submit').innerHTML = 'Entrar na plataforma';
    fc.querySelector('.btn-submit').disabled = false;
    fc.querySelector('.btn-submit').innerHTML = 'Criar conta e entrar';
    fl.querySelector('[data-erro]').classList.add('hidden');
    fc.querySelector('[data-erro]').classList.add('hidden');
    $('#view-app').hidden = true;
    const vl = $('#view-login');
    vl.hidden = false; vl.style.opacity = '1';
    carregarStatsLogin();
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
      if (r.requer2fa) throw new Error('Esta conta usa verificação em 2 fatores (não suportada nesta demo web).');
      if (r.tipo && r.tipo !== 'DOADOR') { API.sair(); throw new Error('Esta conta é de ONG. A web é a experiência do doador.'); }
      API.salvarSessao(r);
      UI.toast('Bem-vindo, ' + (r.nome || '').split(' ')[0] + '!', 'ok');
      mostrarApp();
    });
    submitAuth($('#form-cadastro'), async (d) => {
      if (d.senha !== d.confirmarSenha) throw new Error('As senhas não conferem.');
      if (!d.lgpd) throw new Error('É preciso aceitar a Política de Privacidade.');
      const payload = { nome: d.nome, email: d.email, senha: d.senha,
        telefone: d.telefone || null, cidade: d.cidade || null, estado: (d.uf || '').toUpperCase() || null };
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

    // Mostrar/ocultar senha
    document.querySelectorAll('[data-ver-senha]').forEach((b) => b.addEventListener('click', () => {
      const inp = b.parentElement.querySelector('input');
      const ver = inp.type === 'password';
      inp.type = ver ? 'text' : 'password';
      b.querySelector('i').className = 'ph ' + (ver ? 'ph-eye-slash' : 'ph-eye') + ' text-xl';
    }));

    // Seletor UF/cidade (IBGE offline)
    const selUf = $('#cad-uf');
    UI.UFS.forEach((uf) => { const o = document.createElement('option'); o.value = uf; o.textContent = uf; selUf.appendChild(o); });
    selUf.addEventListener('change', async () => {
      const mun = await UI.carregarMunicipios();
      const dl = $('#cad-cidades');
      dl.innerHTML = (mun[selUf.value] || []).map((c) => `<option value="${UI.esc(c)}">`).join('');
      $('#cad-cidade').value = '';
    });

    // Conta demo
    $('[data-demo]').addEventListener('click', () => {
      const f = $('#form-login');
      f.email.value = 'demo.joao@connectong.com';
      f.senha.value = 'demo123';
      f.requestSubmit();
    });

    // Esqueci minha senha (fluxo 2 passos)
    $('[data-esqueci]').addEventListener('click', abrirEsqueciSenha);
  }

  function abrirEsqueciSenha() {
    abrirModal(`<form id="form-esqueci" class="p-7 space-y-4">
      <div class="text-center mb-2"><div class="w-14 h-14 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3 text-primary"><i class="ph ph-lock-key-open text-3xl"></i></div>
        <h3 class="text-xl font-montserrat font-bold text-textDark">Recuperar senha</h3><p class="text-sm text-textGrey mt-1">Enviaremos um código para seu e-mail.</p></div>
      <input name="email" type="email" required placeholder="Seu e-mail" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      <div id="reset-extra" class="space-y-3 hidden">
        <input name="codigo" placeholder="Código recebido" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
        <input name="novaSenha" type="password" minlength="6" placeholder="Nova senha" class="w-full p-3.5 bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
      </div>
      <p data-erro class="text-sm font-semibold text-red-600 hidden"></p>
      <button class="btn-submit w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-montserrat font-bold rounded-2xl disabled:opacity-60">Enviar código</button>
    </form>`, 'max-w-sm');
    let fase = 1;
    $('#form-esqueci').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector('.btn-submit'), erro = f.querySelector('[data-erro]');
      erro.classList.add('hidden'); btn.disabled = true;
      try {
        if (fase === 1) {
          await API.esqueciSenha(f.email.value);
          fase = 2; $('#reset-extra').classList.remove('hidden');
          btn.textContent = 'Redefinir senha'; btn.disabled = false;
          UI.toast('Se o e-mail existir, o código foi enviado. Na feira, use o código demo.', 'info');
        } else {
          await API.redefinirSenha(f.email.value, f.codigo.value, f.novaSenha.value);
          fecharModal(); UI.toast('Senha redefinida! Faça login.', 'ok');
        }
      } catch (err) { erro.textContent = err.message; erro.classList.remove('hidden'); btn.disabled = false; }
    });
  }

  // =========================================================================
  // Delegação global de cliques (data-attributes)
  // =========================================================================
  function ligarCliques() {
    document.addEventListener('click', (e) => {
      const alvo = e.target.closest('[data-rota],[data-aba],[data-necessidade],[data-interesse],[data-chat],[data-concluir],[data-pix],[data-perfil-ong],[data-fav],[data-avaliar],[data-notif],[data-frete-ong],[data-denunciar],[data-share-ong],[data-ver-img],[data-redemo],[data-prestacao],[data-reagir],[data-dora-abrir],[data-dora-menu],[data-editdoacao],[data-deldoacao],[data-cat],[data-cmp-add],[data-cmp-rm]');
      if (!alvo) return;
      if (alvo.dataset.cmpAdd) { const id = Number(alvo.dataset.cmpAdd); if (!comparar.ids.includes(id) && comparar.ids.length < 3) { comparar.ids.push(id); cmpBusca.termo = ''; } return pintarComparar(); }
      if (alvo.dataset.cmpRm) { comparar.ids = comparar.ids.filter((x) => x !== Number(alvo.dataset.cmpRm)); return pintarComparar(); }
      if (alvo.dataset.cat) { explorar.categoria = alvo.dataset.cat; return viewExplorar(); }
      if (alvo.dataset.editdoacao) return editarDoacao(alvo.dataset.editdoacao);
      if (alvo.dataset.deldoacao) return excluirDoacao(alvo.dataset.deldoacao);
      if (alvo.dataset.doraMenu) return doraMenuConversa(alvo.dataset.doraMenu);
      if (alvo.dataset.doraAbrir) { const c = DoraStore.obter(alvo.dataset.doraAbrir); if (c) { dora.conv = c; fecharModal(); viewDora(); } return; }
      if (alvo.dataset.fav) { e.stopPropagation(); return toggleFav(alvo.dataset.fav, alvo); }
      if (alvo.dataset.reagir) return abrirReacao(alvo.dataset.reagir);
      if (alvo.dataset.avaliar) return abrirAvaliar(alvo.dataset.avaliar, alvo.dataset.ong || 'ONG');
      if (alvo.dataset.freteOng) return abrirFrete(Number(alvo.dataset.freteOng));
      if (alvo.dataset.denunciar) return abrirDenuncia(alvo.dataset.denunciar, alvo.dataset.ong || 'ONG');
      if (alvo.dataset.shareOng) return compartilharOng(alvo.dataset.shareOng);
      if (alvo.dataset.verImg) return verImagem(alvo.dataset.verImg);
      if (alvo.dataset.redemo) return reDemonstrarMatch(alvo.dataset.redemo);
      if (alvo.dataset.prestacao) return abrirPrestacoes(alvo.dataset.prestacao, alvo.dataset.ong || 'ONG');
      if (alvo.dataset.notif) return tocarNotif(alvo.dataset.notif);
      if (alvo.dataset.perfilOng) return abrirPerfilOng(Number(alvo.dataset.perfilOng));
      if (alvo.dataset.rota) return irPara(alvo.dataset.rota);
      if (alvo.dataset.aba) { matches.aba = alvo.dataset.aba; return pintarMatches(); }
      if (alvo.dataset.necessidade) return abrirNecessidade(Number(alvo.dataset.necessidade));
      if (alvo.dataset.interesse) return demonstrarInteresse(alvo.dataset.interesse, alvo);
      if (alvo.dataset.chat) return abrirChat(alvo.dataset.chat, alvo.dataset.ong || 'ONG', alvo.dataset.ongid ? Number(alvo.dataset.ongid) : null, alvo.dataset.concluido === '1');
      if (alvo.dataset.concluir) return concluirMatch(alvo.dataset.concluir);
      if (alvo.dataset.pix) return abrirPix(Number(alvo.dataset.pix));
    });

    $('#btn-perfil').addEventListener('click', () => { irPara('config'); });
    $('#btn-sino').addEventListener('click', abrirNotificacoes);
    $('#btn-buscar').addEventListener('click', abrirCmdk);

    // Atalho global do Command palette (Ctrl/Cmd + K) — recurso exclusivo da web.
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (cmdk.aberto) fecharCmdk(); else abrirCmdk();
      }
    });

    window.addEventListener('co:deslogado', () => { UI.toast('Sessão expirada.', 'aviso'); mostrarLogin(); });
  }

  // =========================================================================
  // Init
  // =========================================================================
  function init() {
    aplicarPreferencias(lerPrefsCache());
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
