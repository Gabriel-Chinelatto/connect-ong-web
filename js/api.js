/* =========================================================================
   Connect ONG - Web do Doador
   Camada de API: fala com o backend REST real (Spring Boot em localhost:8080).
   Guarda o JWT no localStorage e injeta o header Authorization em toda chamada.
   ========================================================================= */

const API = (() => {
  // Base do backend. Pode ser trocada por ?api=... na URL para apontar outro host.
  const params = new URLSearchParams(location.search);
  const BASE = params.get('api') || 'http://localhost:8080';

  const LS_TOKEN = 'co_token';
  const LS_REFRESH = 'co_refresh';
  const LS_USER = 'co_user';

  // ---- Sessão ---------------------------------------------------------------
  function salvarSessao(dados) {
    localStorage.setItem(LS_TOKEN, dados.accessToken || '');
    localStorage.setItem(LS_REFRESH, dados.refreshToken || '');
    localStorage.setItem(LS_USER, JSON.stringify({
      id: dados.id, nome: dados.nome, email: dados.email,
      tipo: dados.tipo, ongId: dados.ongId,
    }));
  }
  function usuario() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); }
    catch { return null; }
  }
  function token() { return localStorage.getItem(LS_TOKEN); }
  function logado() { return !!token() && !!usuario(); }
  function sair() {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_REFRESH);
    localStorage.removeItem(LS_USER);
  }

  // ---- Fetch com autenticação ----------------------------------------------
  async function req(metodo, caminho, corpo) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers['Authorization'] = 'Bearer ' + t;

    let resp;
    try {
      resp = await fetch(BASE + caminho, {
        method: metodo,
        headers,
        body: corpo != null ? JSON.stringify(corpo) : undefined,
      });
    } catch (e) {
      throw new Error('Não foi possível falar com o servidor. Ele está rodando em ' + BASE + '?');
    }

    if (resp.status === 401) {
      // Sessão expirada/invalida: derruba para o login.
      sair();
      window.dispatchEvent(new CustomEvent('co:deslogado'));
      throw new Error('Sua sessão expirou. Entre novamente.');
    }

    const texto = await resp.text();
    let dados = null;
    if (texto) { try { dados = JSON.parse(texto); } catch { dados = texto; } }

    if (!resp.ok) {
      const msg = (dados && (dados.erro || dados.message || dados.mensagem)) ||
        'Erro ' + resp.status + '.';
      throw new Error(msg);
    }
    return dados;
  }

  const get = (c) => req('GET', c);
  const post = (c, b) => req('POST', c, b);
  const put = (c, b) => req('PUT', c, b);

  // ---- Endpoints do doador --------------------------------------------------
  return {
    BASE, usuario, token, logado, sair, salvarSessao,

    // Auth
    login: (email, senha) => post('/usuarios/login', { email, senha }),
    registrar: (payload) => post('/usuarios/registro', payload),

    // Catálogo / feed
    necessidades: () => get('/necessidades'),
    categorias: () => get('/categorias'),
    campanhas: () => get('/campanhas'),
    estatisticas: () => get('/publico/estatisticas'),

    // Interesse (match)
    demonstrarInteresse: (necessidadeId) =>
      post('/interesses', { necessidadeId, doadorId: usuario().id }),
    meusInteresses: () => get('/interesses?doadorId=' + usuario().id),
    concluirInteresse: (id) => put('/interesses/' + id + '/concluir'),

    // Chat
    mensagens: (interesseId) => get('/mensagens?interesseId=' + interesseId),
    enviarMensagem: (interesseId, conteudo) =>
      post('/mensagens', { interesseId, remetente: 'DOADOR', conteudo }),

    // PIX / contribuição
    contribuir: (campanhaId, valor, nome) =>
      post('/campanhas/' + campanhaId + '/contribuir', { valor, nome }),

    // IA (Dora)
    assistente: (mensagem, historico, cidade) =>
      post('/assistente', { mensagem, historico: historico || [], cidade: cidade || null }),
    sugestoes: () => post('/assistente/sugestoes', {}),
  };
})();
