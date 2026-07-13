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
  const del = (c) => req('DELETE', c);
  function mesclarUsuario(campos) {
    const u = usuario() || {};
    localStorage.setItem(LS_USER, JSON.stringify({ ...u, ...campos }));
  }

  // ---- Endpoints do doador --------------------------------------------------
  return {
    BASE, usuario, token, logado, sair, salvarSessao, mesclarUsuario,

    // Auth
    login: (email, senha) => post('/usuarios/login', { email, senha }),
    login2fa: (email, codigo) => post('/auth/login-2fa', { email, codigo }),
    registrar: (payload) => post('/usuarios/registro', payload),
    esqueciSenha: (email) => post('/auth/esqueci-senha', { email }),
    redefinirSenha: (email, codigo, novaSenha) => post('/auth/redefinir-senha', { email, codigo, novaSenha }),

    // Perfil próprio
    meuPerfil: () => get('/usuarios/' + usuario().id + '/perfil'),
    atualizarPerfil: (dto) => put('/usuarios/' + usuario().id + '/perfil', dto),
    perfilPublicoDoador: (id) => get('/usuarios/' + (id || usuario().id) + '/perfil-publico'),
    alterarSenha: (senhaAtual, novaSenha) => put('/usuarios/' + usuario().id + '/senha', { senhaAtual, novaSenha }),
    alterarEmail: (novoEmail, senha) => put('/usuarios/' + usuario().id + '/email', { novoEmail, senha }),
    excluirConta: () => del('/usuarios/' + usuario().id),

    // Preferências (config real, persiste no backend)
    preferencias: () => get('/usuarios/' + usuario().id + '/preferencias'),
    salvarPreferencias: (p) => put('/usuarios/' + usuario().id + '/preferencias', p),

    // Avaliações recebidas pelo doador
    avaliacoesDoador: (id) => get('/avaliacoes-doador?doadorId=' + (id || usuario().id)),

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
    enviarMensagem: (interesseId, conteudo, anexoBase64) =>
      post('/mensagens', {
        interesseId, remetente: 'DOADOR', conteudo: conteudo || '',
        anexoBase64: anexoBase64 || null, anexoTipo: anexoBase64 ? 'imagem' : null,
      }),
    statusChat: (interesseId) => get('/mensagens/status?interesseId=' + interesseId),
    digitando: (interesseId) => post('/mensagens/digitando?interesseId=' + interesseId, {}),
    reagir: (mensagemId, emoji) => post('/mensagens/' + mensagemId + '/reacao', { emoji }),

    // Prestações de contas de um match
    prestacoes: (interesseId) => get('/prestacoes?interesseId=' + interesseId),

    // PIX / contribuição
    contribuir: (campanhaId, valor, nome) =>
      post('/campanhas/' + campanhaId + '/contribuir', { valor, doadorNome: nome }),
    campanhasDestaque: () => get('/campanhas/destaques'),
    gerarCodigoPix: (valor) => post('/doacoes-financeiras/gerar-codigo', { valor }),
    doarFinanceiro: (dto) => post('/doacoes-financeiras', dto),
    minhasDoacoesFinanceiras: () => get('/doacoes-financeiras?doadorId=' + usuario().id),

    // IA (Dora)
    assistente: (mensagem, historico, cidade, imagemBase64) =>
      post('/assistente', { mensagem, historico: historico || [], cidade: cidade || null, imagemBase64: imagemBase64 || null }),
    sugestoes: () => post('/assistente/sugestoes', {}),

    // ONGs / perfil público
    ongs: () => get('/ongs'),
    perfilOng: (ongId) => get('/ongs/' + ongId + '/perfil-publico'),
    transparenciaOng: (ongId) => get('/ongs/' + ongId + '/transparencia'),

    // Frete + IA de impacto
    estimarFrete: (dto) => post('/frete/estimar', dto),
    resumoImpacto: (ongId) => post('/ia/resumo-impacto', { ongId }),

    // Feed global de atividades
    atividades: (limit = 30) => get('/atividades?limit=' + limit),

    // Denúncia
    denunciar: (dto) => post('/denuncias', dto),

    // Favoritos (usuarioId; tipo ONG)
    favoritos: () => get('/favoritos?usuarioId=' + usuario().id),
    favoritosIds: () => get('/favoritos/ids?usuarioId=' + usuario().id + '&tipo=ONG'),
    favoritar: (alvoId) => post('/favoritos', { usuarioId: usuario().id, tipo: 'ONG', alvoId }),
    desfavoritar: (alvoId) =>
      req('DELETE', '/favoritos?usuarioId=' + usuario().id + '&tipo=ONG&alvoId=' + alvoId),

    // Ranking / transparência / conquistas
    ranking: (limite = 20) => get('/publico/ranking?limite=' + limite),
    conquistas: () => get('/conquistas/doador/' + usuario().id),

    // Notificações
    notificacoes: () => get('/notificacoes?usuarioId=' + usuario().id),
    naoLidas: () => get('/notificacoes/nao-lidas?usuarioId=' + usuario().id),
    marcarLida: (id) => put('/notificacoes/' + id + '/lida'),
    marcarTodas: () => put('/notificacoes/marcar-todas?usuarioId=' + usuario().id),

    // Avaliações (doador → ONG)
    avaliacoes: (ongId) => get('/avaliacoes?ongId=' + ongId),
    avaliar: (ongId, nota, comentario) =>
      post('/avaliacoes', { ongId, doadorId: usuario().id, nota, comentario: comentario || '' }),

    // Doações (itens) do próprio doador
    minhasDoacoes: () => get('/doacoes/minhas'),
    cadastrarDoacao: (d) => post('/doacoes', d),
    atualizarDoacao: (id, d) => put('/doacoes/' + id, d),
    excluirDoacao: (id) => del('/doacoes/' + id),
  };
})();
