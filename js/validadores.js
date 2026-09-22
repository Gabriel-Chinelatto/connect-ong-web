/* Regras de formato dos campos (itens F-01/F-02 do Plano de Ação — o avaliador
 * da FECITEC: "não tinha validações nos campos, podia colocar o que quisesse em
 * tudo"). ESPELHO de validacao/Regras.java na API e de utils/validadores.dart
 * nos apps: a mesma regra aqui (erro antes de enviar) e lá (a palavra final).
 * Cada função devolve a MENSAGEM de erro, ou null se estiver tudo certo. */
window.Validadores = (() => {
  const DDDS = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
    31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99]);
  const COMUNS = new Set(['senha123', 'senha1234', 'password1', 'abc12345', 'abcd1234', 'qwerty123',
    '12345678a', 'a12345678', 'admin123', 'mudar123', 'brasil123', 'teste123']);
  const LETRA = /\p{L}/gu;
  const vazio = (v) => v == null || String(v).trim() === '';
  const letras = (v) => (String(v).match(LETRA) || []).length;

  function telefone(v) {
    if (vazio(v)) return null;
    const erro = 'Telefone inválido: use DDD + número, ex.: (19) 99876-5432.';
    if (!/^[0-9()+\-.\s]+$/.test(v)) return erro;
    let d = v.replace(/\D/g, '');
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
    if (d.length !== 10 && d.length !== 11) return erro;
    if (!DDDS.has(Number(d.slice(0, 2)))) return 'DDD inválido.';
    const n = d.slice(2);
    if (d.length === 11 && n[0] !== '9') return 'Celular deve começar com 9 depois do DDD.';
    if (d.length === 10 && !'2345'.includes(n[0])) return erro;
    if ([...n].every((c) => c === n[0])) return erro;
    return null;
  }
  function textoLegivel(v) {
    if (vazio(v)) return null;
    if (/[<>]/.test(v)) return 'Não use os caracteres < e >.';
    if (letras(v) < 2) return 'Escreva com letras (não só números ou símbolos).';
    return null;
  }
  function nomeProprio(v) {
    if (vazio(v)) return null;
    const t = String(v).trim();
    if (!/^[\p{L}\s'’.\-]+$/u.test(t) || letras(t) < 2) return 'Use apenas letras (sem números ou símbolos).';
    return null;
  }
  function senhaForte(v) {
    if (!v) return 'Crie uma senha.';
    if (v.length < 8) return 'A senha precisa de pelo menos 8 caracteres.';
    if (v.length > 100) return 'Senha longa demais.';
    if (letras(v) < 1 || !/\d/.test(v)) return 'Use letras e números na senha.';
    if (COMUNS.has(v.toLowerCase())) return 'Essa senha é muito comum. Escolha outra.';
    return null;
  }
  /* Máscara (19) 99876-5432 / (19) 3451-2000 enquanto digita. */
  function mascaraTelefone(input) {
    input.addEventListener('input', () => {
      const d = input.value.replace(/\D/g, '').slice(0, 11);
      const corte = d.length === 11 ? 7 : 6;
      let t = '';
      [...d].forEach((c, i) => { if (i === 0) t += '('; if (i === 2) t += ') '; if (i === corte) t += '-'; t += c; });
      input.value = t;
    });
  }
  /* Primeiro erro de uma lista [ [rótulo, mensagem|null], ... ], já com o rótulo. */
  function primeiro(lista) {
    const e = lista.find(([, m]) => m);
    if (!e) return null;
    return e[1].toLowerCase().startsWith(e[0].toLowerCase()) ? e[1] : `${e[0]}: ${e[1]}`;
  }
  return { telefone, textoLegivel, nomeProprio, senhaForte, mascaraTelefone, primeiro };
})();
