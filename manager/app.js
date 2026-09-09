let db = loadDB();
let editando = null;
let filtrosAplicados = {};

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function badge(st) {
  const c = st === "Já Pagou" ? "pago" : st === "Pendente" ? "pend" : "aguard";
  return `<span class="badge ${c}">${esc(st)}</span>`;
}

function entrar() {
  const v = document.getElementById("pinInput").value;
  const salvo = localStorage.getItem("zpersonal_pin");
  if (!salvo) {
    if (v.length < 4) return alert("Crie um PIN com 4+ dígitos.");
    localStorage.setItem("zpersonal_pin", v);
    document.getElementById("telaPin").remove();
  } else if (v === salvo) document.getElementById("telaPin").remove();
  else alert("PIN incorreto.");
  render();
}

function abrirModal(id) { document.getElementById(id).classList.add("aberto"); }
function fecharModal(id) { document.getElementById(id).classList.remove("aberto"); }

// ---- Filtros ----
function abrirPainelFiltro() {
  const p = document.getElementById("painelFiltro");
  p.style.display = p.style.display === "none" ? "block" : "none";
  if (p.style.display === "block") sincronizarCamposFiltro();
}
function buscaDigitada() {}

function sincronizarCamposFiltro() {
  document.getElementById("busca").value = filtrosAplicados.busca || "";
  document.getElementById("filtroStatus").value = filtrosAplicados.status || "";
  document.getElementById("filtroOrdem").value = filtrosAplicados.ordem || "AZ";
  document.getElementById("filtroTurno").value = filtrosAplicados.turno || "";
  document.getElementById("filtroIdade").value = filtrosAplicados.idade || "";
  document.getElementById("filtroMatricula").value = filtrosAplicados.matricula || "";
}

function aplicarFiltros() {
  filtrosAplicados = {
    busca: document.getElementById("busca").value.trim(),
    status: document.getElementById("filtroStatus").value,
    ordem: document.getElementById("filtroOrdem").value,
    turno: document.getElementById("filtroTurno").value,
    idade: document.getElementById("filtroIdade").value,
    matricula: document.getElementById("filtroMatricula").value,
  };
  render();
}
function limparFiltros() {
  filtrosAplicados = {};
  sincronizarCamposFiltro();
  render();
}

function turnoDe(a) {
  const t = norm(a.diasTreino || "");
  return t.includes("manha") ? "Manhã" : t.includes("tarde") ? "Tarde" : "";
}
function grupoIdade(a) {
  const i = calcularIdade(a.nascimento);
  if (i === "") return "";
  if (i <= 6) return "at6";
  if (i <= 9) return "7a9";
  if (i <= 12) return "10a12";
  return "13mais";
}

function render() {
  const f = filtrosAplicados;
  let lista = db.alunos.map((a) => ({ ...a, _st: computeStatus(a.diaVencimento, a.ultimoPagamento) }));

  if (f.status) lista = lista.filter((a) => a._st === f.status);
  if (f.matricula) lista = lista.filter((a) => a.statusMatricula === f.matricula);
  if (f.turno) lista = lista.filter((a) => turnoDe(a) === f.turno);
  if (f.idade) lista = lista.filter((a) => grupoIdade(a) === f.idade);
  if (f.busca) {
    const b = norm(f.busca);
    lista = lista.filter((a) => norm(a.nome).includes(b) || norm(a.responsavel).includes(b));
  }

  const o = f.ordem || "AZ";
  if (o === "AZ") lista.sort((a, b) => norm(a.nome).localeCompare(norm(b.nome), "pt"));
  else if (o === "ZA") lista.sort((a, b) => norm(b.nome).localeCompare(norm(a.nome), "pt"));
  else if (o === "novos") lista.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
  else if (o === "antigos") lista.sort((a, b) => (a.criadoEm || "").localeCompare(b.criadoEm || ""));

  const tb = document.getElementById("lista");
  tb.innerHTML = lista.map((a) => `<tr>
      <td>${esc(a.nome)} <small style="color:var(--mut)">(${calcularIdade(a.nascimento)}a)</small></td>
      <td>${esc(a.responsavel)}</td><td>${esc(a.diasTreino)}</td>
      <td>Dia ${esc(a.diaVencimento || "-")}</td>
      <td>${badge(a._st)}</td><td>${esc(a.statusMatricula)}</td>
      <td><button class="sec" onclick="abrirForm('${a.id}')">Abrir</button></td></tr>`)
    .join("") || `<tr><td colspan="7">Nenhum aluno. Importe a planilha, adicione ou ajuste os filtros.</td></tr>`;

  document.getElementById("contador").textContent = lista.length + " aluno(s)";
}

function abrirForm(id) {
  editando = id || null;
  const a = id ? db.alunos.find((x) => x.id === id) : {};
  const novo = !id;

  document.getElementById("formTitulo").textContent = novo ? "Novo Aluno" : "Ficha do Aluno";
  fId.value = a.id || ""; fNome.value = a.nome || ""; fNasc.value = a.nascimento || "";
  fVenc.value = a.diaVencimento || ""; fResp.value = a.responsavel || "";
  fContato.value = a.contatoEmergencia || ""; fEnd.value = a.endereco || "";
  fHist.value = a.historico || ""; fTreino.value = a.diasTreino || "Segunda e Sexta ( Tarde )";
  fMat.value = a.statusMatricula || "Aguardando";
  fPag.value = a.ultimoPagamento || "";
  fImg.value = a.autorizacaoImagem || "na";

  document.getElementById("grupoPag").style.display = novo ? "none" : "";
  document.getElementById("grupoRemover").style.display = novo ? "none" : "";
  document.querySelector("button[onclick='marcarPagoHoje()']").style.display = novo ? "none" : "";

  abrirModal("modalForm");
}

function lerForm() {
  return {
    nome: fNome.value.trim(), nascimento: fNasc.value || "",
    diaVencimento: fVenc.value ? parseInt(fVenc.value, 10) : null,
    responsavel: fResp.value.trim(), contatoEmergencia: fContato.value.trim(),
    endereco: fEnd.value.trim(), historico: fHist.value.trim(),
    diasTreino: fTreino.value, statusMatricula: fMat.value,
    ultimoPagamento: fPag.value || null, autorizacaoImagem: fImg.value,
  };
}

function salvarForm() {
  const d = lerForm();
  if (!d.nome) return alert("Nome é obrigatório.");
  if (editando) {
    const a = db.alunos.find((x) => x.id === editando);
    delete d.ultimoPagamento;
    Object.assign(a, { ...d, ultimoPagamento: a.ultimoPagamento });
  } else db.alunos.push(novoAluno({ ...d, historicoPagamentos: [] }));
  saveDB(db); fecharModal("modalForm"); render();
}

function marcarPagoHoje() {
  const hoje = new Date().toISOString().slice(0, 10);
  fPag.value = hoje;
  if (editando) {
    const a = db.alunos.find((x) => x.id === editando);
    a.ultimoPagamento = hoje;
    a.historicoPagamentos.push({ data: hoje, referencia: hoje.slice(0, 7) });
    saveDB(db); render();
  }
}

function remover(id) {
  if (!id) return;
  const a = db.alunos.find((x) => x.id === id);
  if (a && confirm(`Remover ${a.nome}?`)) {
    db.alunos = db.alunos.filter((x) => x.id !== id);
    saveDB(db); fecharModal("modalForm"); render();
  }
}

function carregarDemo() {
  if (!db.alunos.length || confirm("Adicionar demonstração?")) {
    DEMO_ALUNOS.forEach((d) => db.alunos.push(novoAluno(d)));
    saveDB(db); render();
  }
}

async function importarLink() {
  const url = document.getElementById("impLink").value.trim();
  if (!url) return alert("Cole o link do CSV publicado.");
  try {
    const arr = await importarViaLink(url);
    if (!arr.length) return alert("Nenhum aluno reconhecido no link. Confira se a planilha tem coluna de NOME e se publicou como CSV.");
    arr.forEach((d) => db.alunos.push(novoAluno(d)));
    saveDB(db); fecharModal("modalImp"); render();
    alert(arr.length + " aluno(s) importado(s). Confira a data da mensalidade de cada um.");
  } catch (e) { alert("Falha: " + e.message + "\nSe persistir, baixe o CSV e use o upload."); }
}

document.getElementById("impCSV")?.addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  const arr = importCSV(await f.text());
  if (!arr.length) return alert("Nenhum aluno reconhecido no arquivo. Confira se a planilha tem coluna de NOME e se exportou como CSV.");
  arr.forEach((d) => db.alunos.push(novoAluno(d)));
  saveDB(db); fecharModal("modalImp"); render();
  alert(arr.length + " aluno(s) importado(s). Confira a data da mensalidade de cada um.");
  e.target.value = "";
});

document.getElementById("impBackup")?.addEventListener("change", async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { db = await importarBackup(f); render(); alert("Backup restaurado."); }
  catch (err) { alert("Arquivo inválido."); }
  e.target.value = "";
});