let db = null;
let usuarioAtual = null;
let editando = null;
let filtrosAplicados = {};

// ---- Tema (claro ☀️ / escuro 🌙), lembrado entre sessões ----
function aplicarTema() {
  const t = localStorage.getItem("clients_theme") || "dark";
  document.body.classList.toggle("light", t === "light");
  const lbl = document.getElementById("lblTema");
  const ico = document.getElementById("icoTema");
  if (lbl) lbl.textContent = t === "light" ? "Claro" : "Escuro";
  if (ico) ico.textContent = t === "light" ? "☀️" : "🌙";
}
function mudarTema() {
  const atual = localStorage.getItem("clients_theme") === "light" ? "dark" : "light";
  localStorage.setItem("clients_theme", atual);
  aplicarTema();
}

// ---- Login: digita o usuário (sem lista de escolha) ----
function popularUsuarios() {
  document.getElementById("loginUsuario").value = "";
}
function entrar() {
  const nomeDigitado = document.getElementById("loginUsuario").value.trim();
  const senha = document.getElementById("pinInput").value;
  if (!nomeDigitado) return alert("Digite seu usuário.");
  const usuarios = loadUsuarios();
  const u = usuarios.find((x) => x.nome.toLowerCase() === nomeDigitado.toLowerCase());
  if (!u) return alert("Usuário não encontrado.");
  if (u.ativo === false) {
    mostrarAviso("Seu acesso está bloqueado. Favor pagar a mensalidade para voltar a ter acesso.");
    return;
  }
  if (!u.senha) {
    if (senha.length < 4) return alert("Crie uma senha com 4+ dígitos.");
    u.senha = senha;
    saveUsuarios(usuarios);
  } else if (u.senha !== senha) return alert("Senha incorreta.");
  usuarioAtual = u.nome;
  localStorage.setItem("clients_sessao", u.nome);
  definirBanco(u.nome);
  db = loadDB();
  document.getElementById("btnUsuarios").style.display = u.nome === "admin" ? "" : "none";
  document.getElementById("telaPin").style.display = "none";
  render();
}
function logout() {
  popularUsuarios();
  document.getElementById("pinInput").value = "";
  document.getElementById("verSenhaLogin").checked = false;
  document.getElementById("pinInput").type = "password";
  document.getElementById("telaPin").style.display = "flex";
  document.getElementById("dropdown").style.display = "none";
}

// ---- Aviso interno (popup com botão Entendi) ----
function mostrarAviso(mensagem) {
  document.getElementById("avisoMsg").textContent = mensagem;
  abrirModal("modalAviso");
}

// ---- Gerenciar usuários (somente admin) ----
function abrirModalUsuarios() {
  if (usuarioAtual !== "admin") return alert("Somente o administrador gerencia usuários.");
  document.getElementById("quemLogado").textContent = usuarioAtual || "-";
  document.getElementById("novoUserNome").value = "";
  document.getElementById("novoUserSenha").value = "";
  renderUsuarios();
  abrirModal("modalUsuarios");
}
function renderUsuarios() {
  const usuarios = loadUsuarios();
  document.getElementById("listaUsuarios").innerHTML = usuarios.map((u) => {
    const bloqueado = u.ativo === false;
    const ehVoce = u.nome === usuarioAtual;
    return `<div class="linha" style="margin:6px 0; align-items:center;">
      <span style="flex:1;">${esc(u.nome)}${ehVoce ? " (você)" : ""} <small style="color:var(--mut)">· ${bloqueado ? "bloqueado" : "ativo"}</small></span>
      <button class="sec" style="flex:0;" data-nome="${esc(u.nome)}"
        onclick="alternarBloqueio(this.dataset.nome)"
        ${ehVoce ? "disabled" : ""}>${bloqueado ? "Liberar" : "Congelar"}</button>
      <button class="danger" style="flex:0;" data-nome="${esc(u.nome)}"
        onclick="removerUsuario(this.dataset.nome)"
        ${ehVoce || usuarios.length <= 1 ? "disabled" : ""}>X</button>
    </div>`;
  }).join("");
}
function adicionarUsuario() {
  const nome = document.getElementById("novoUserNome").value.trim();
  const senha = document.getElementById("novoUserSenha").value;
  if (!nome) return alert("Dê um nome ao usuário.");
  if (senha.length < 4) return alert("A senha precisa de 4+ dígitos.");
  const usuarios = loadUsuarios();
  if (usuarios.some((u) => u.nome.toLowerCase() === nome.toLowerCase()))
    return alert("Já existe um usuário com esse nome.");
  usuarios.push({ nome, senha, ativo: true });
  saveUsuarios(usuarios);
  document.getElementById("novoUserNome").value = "";
  document.getElementById("novoUserSenha").value = "";
  renderUsuarios();
  alert(`Usuário "${nome}" criado. Ele terá sua própria lista de alunos.`);
}
function alternarBloqueio(nome) {
  if (nome === usuarioAtual) return;
  const usuarios = loadUsuarios();
  const u = usuarios.find((x) => x.nome === nome);
  if (!u) return;
  u.ativo = u.ativo === false ? true : false;
  saveUsuarios(usuarios);
  renderUsuarios();
}
function removerUsuario(nome) {
  if (nome === usuarioAtual) return alert("Você não pode remover o usuário logado.");
  pedirConfirmacao(`Remover o usuário ${nome}? Os alunos dele serão apagados deste navegador.`, () => {
    saveUsuarios(loadUsuarios().filter((u) => u.nome !== nome));
    localStorage.removeItem(dbKeyPara(nome));
    renderUsuarios();
  });
}

// ---- Confirmação interna (popup Sim / Não) ----
let onConfirmSim = null;
function pedirConfirmacao(mensagem, callback) {
  document.getElementById("confirmMsg").textContent = mensagem;
  onConfirmSim = callback;
  abrirModal("modalConfirm");
}
function cliqueSim() {
  fecharModal("modalConfirm");
  if (onConfirmSim) {
    const cb = onConfirmSim;
    onConfirmSim = null;
    cb();
  }
}
function cliqueNao() {
  onConfirmSim = null;
  fecharModal("modalConfirm");
}

// ---- Menu (⋯) ----
function toggleMenu(e) {
  e.stopPropagation();
  const d = document.getElementById("dropdown");
  d.style.display = d.style.display === "none" ? "flex" : "none";
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap")) document.getElementById("dropdown").style.display = "none";
});
function toggleOlho(id) {
  const el = document.getElementById(id);
  el.type = el.type === "password" ? "text" : "password";
}
function abrirModalSenha() {
  const u = loadUsuarios().find((x) => x.nome === usuarioAtual);
  document.getElementById("senhaAtual").value = u ? u.senha : "";
  document.getElementById("novaSenha").value = "";
  document.getElementById("novaSenha2").value = "";
  document.getElementById("senhaAtual").type = "password";
  abrirModal("modalSenha");
}
function salvarSenha() {
  const n1 = document.getElementById("novaSenha").value;
  const n2 = document.getElementById("novaSenha2").value;
  if (n1.length < 4) return alert("A nova senha precisa de 4+ dígitos.");
  if (n1 !== n2) return alert("A confirmação está diferente.");
  const usuarios = loadUsuarios();
  const u = usuarios.find((x) => x.nome === usuarioAtual);
  if (!u) return alert("Usuário não encontrado.");
  u.senha = n1;
  saveUsuarios(usuarios);
  fecharModal("modalSenha");
  alert("Senha atualizada.");
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function badge(st) {
  const c = st === "Já Pagou" ? "pago" : st === "Pendente" ? "pend" : "aguard";
  return `<span class="badge ${c}">${esc(st)}</span>`;
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
  document.getElementById("filtroRecentes").value = filtrosAplicados.recentes || "";
  document.getElementById("filtroInscricao").value = filtrosAplicados.inscricao || "";
}

function aplicarFiltros() {
  filtrosAplicados = {
    busca: document.getElementById("busca").value.trim(),
    status: document.getElementById("filtroStatus").value,
    ordem: document.getElementById("filtroOrdem").value,
    turno: document.getElementById("filtroTurno").value,
    idade: document.getElementById("filtroIdade").value,
    matricula: document.getElementById("filtroMatricula").value,
    recentes: document.getElementById("filtroRecentes").value,
    inscricao: document.getElementById("filtroInscricao").value,
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
function campoVazio(v) {
  return v === undefined || v === null || String(v).trim() === "";
}
function alunoIncompleto(a) {
  return [a.nome, a.nascimento, a.responsavel, a.contatoEmergencia,
          a.endereco, a.diasTreino, a.diaVencimento].some(campoVazio);
}

function render() {
  const f = filtrosAplicados;
  let lista = db.alunos.map((a) => ({ ...a, _st: computeStatus(a.diaVencimento, a.ultimoPagamento) }));

  if (f.status) lista = lista.filter((a) => a._st === f.status);
  if (f.matricula) lista = lista.filter((a) => a.statusMatricula === f.matricula);
  if (f.turno) lista = lista.filter((a) => turnoDe(a) === f.turno);
  if (f.idade) lista = lista.filter((a) => grupoIdade(a) === f.idade);
  if (f.recentes) {
    const limite = Date.now() - (parseInt(f.recentes, 10) || 7) * 86400000;
    lista = lista.filter((a) => new Date(a.criadoEm || 0).getTime() >= limite);
  }
  if (f.inscricao) {
    const alvos = f.inscricao === "completa" ? false : true;
    lista = lista.filter((a) => alunoIncompleto(a) === alvos);
  }
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
      <td>${esc(a.nome)} <small style="color:var(--mut)">(${calcularIdade(a.nascimento)}a${alunoIncompleto(a) ? " · ⚠" : ""})</small></td>
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
  if (!a) return;
  pedirConfirmacao(`Remover ${a.nome}?`, () => {
    db.alunos = db.alunos.filter((x) => x.id !== id);
    saveDB(db); fecharModal("modalForm"); render();
  });
}

function carregarDemo() {
  const executar = () => {
    DEMO_ALUNOS.forEach((d) => db.alunos.push(novoAluno(d)));
    saveDB(db); render();
  };
  if (!db.alunos.length) executar();
  else pedirConfirmacao("Adicionar demonstração?", executar);
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

aplicarTema();
popularUsuarios();