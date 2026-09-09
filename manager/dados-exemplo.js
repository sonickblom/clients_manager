// Só pra demonstração/venda. NUNCA coloque dado real aqui.
function isoRelativo(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

const DEMO_ALUNOS = [
  {
    nome: "Exemplo Silva (pago)",
    nascimento: "2016-05-10",
    responsavel: "Responsável Exemplo",
    contatoEmergencia: "(11) 90000-0000",
    diasTreino: "Segunda e Sexta (Tarde)",
    diaVencimento: 10,
    ultimoPagamento: isoRelativo(0), // hoje -> "Já Pagou"
    statusMatricula: "Válido",
  },
  {
    nome: "Exemplo Souza (aguardando)",
    nascimento: "2017-09-05",
    responsavel: "Responsável Exemplo 2",
    contatoEmergencia: "(11) 91111-1111",
    diasTreino: "Segunda e Sexta (Tarde)",
    diaVencimento: new Date().getDate() + 5 <= 28 ? new Date().getDate() + 5 : 28,
    ultimoPagamento: null, // vencimento futuro -> "Aguardando"
    statusMatricula: "Válido",
  },
  {
    nome: "Exemplo Santos (pendente)",
    nascimento: "2015-10-06",
    responsavel: "Responsável Exemplo 3",
    contatoEmergencia: "(11) 92222-2222",
    diasTreino: "Segunda (Tarde)",
    diaVencimento: new Date().getDate() > 1 ? new Date().getDate() - 1 : 1,
    ultimoPagamento: null, // vencimento passou -> "Pendente"
    statusMatricula: "Válido",
  },
];