// Regras: "Já Pagou" | "Aguardando" | "Pendente"
// - Pagou se ultimoPagamento cai no mesmo mês/ano de hoje
// - Senão: hoje <= vencimento do mês -> Aguardando, passou -> Pendente

function diasNoMes(ano, mes0) {
  return new Date(ano, mes0 + 1, 0).getDate();
}

function mesmoMes(iso, ref = new Date()) {
  if (!iso) return false;
  const d = new Date(iso + "T12:00:00");
  if (isNaN(d)) return false;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function computeStatus(diaVencimento, ultimoPagamentoISO, hoje = new Date()) {
  if (mesmoMes(ultimoPagamentoISO, hoje)) return "Já Pagou";
  const dia = parseInt(diaVencimento, 10);
  if (!dia || dia < 1) return "Aguardando"; // sem vencimento definido
  const venc = Math.min(dia, diasNoMes(hoje.getFullYear(), hoje.getMonth()));
  return hoje.getDate() <= venc ? "Aguardando" : "Pendente";
}

function calcularIdade(nascimentoISO, hoje = new Date()) {
  if (!nascimentoISO) return "";
  const n = new Date(nascimentoISO + "T12:00:00");
  if (isNaN(n)) return "";
  let idade = hoje.getFullYear() - n.getFullYear();
  const m = hoje.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) idade--;
  return idade >= 0 ? idade : "";
}