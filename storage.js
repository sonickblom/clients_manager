const DB_LEGADO = "zpersonal_db_v1";
const USUARIOS_KEY = "clients_usuarios";
let DB_KEY = DB_LEGADO;

function chaveUsuario(nome) {
  const k = String(nome || "admin").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return k || "admin";
}
function dbKeyPara(usuario) { return "clients_db_" + chaveUsuario(usuario); }

// define qual banco usar (um por usuário) e herda os dados antigos no primeiro acesso
function definirBanco(usuario) {
  DB_KEY = dbKeyPara(usuario);
  if (!localStorage.getItem(DB_KEY) && localStorage.getItem(DB_LEGADO)) {
    try { localStorage.setItem(DB_KEY, localStorage.getItem(DB_LEGADO)); } catch (e) {}
  }
}

function saveUsuarios(lista) { localStorage.setItem(USUARIOS_KEY, JSON.stringify(lista)); }
function loadUsuarios() {
  let lista = null;
  try {
    const raw = localStorage.getItem(USUARIOS_KEY);
    if (raw) {
      const l = JSON.parse(raw);
      if (Array.isArray(l) && l.length) lista = l;
    }
  } catch (e) {}
  if (!lista) {
    // primeira vez: cria "admin" reaproveitando o PIN antigo (se existia)
    const pinAntigo = localStorage.getItem("zpersonal_pin") || "";
    lista = [{ nome: "admin", senha: pinAntigo, ativo: true }];
    try { saveUsuarios(lista); } catch (e) {}
  }
  // garante o campo "ativo" em contas criadas antes dessa versão
  return lista.map((u) => ({ ativo: true, ...u }));
}

function dbVazio() {
  return { versao: 1, alunos: [], atualizadoEm: new Date().toISOString() };
}

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return dbVazio();
    const db = JSON.parse(raw);
    if (!db || !Array.isArray(db.alunos)) return dbVazio();
    return db;
  } catch (e) {
    console.error("Falha ao ler banco local:", e);
    return dbVazio();
  }
}

function saveDB(db) {
  db.atualizadoEm = new Date().toISOString();
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function gerarId() {
  return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function novoAluno(dados) {
  return {
    id: gerarId(),
    nome: "",
    nascimento: "",
    endereco: "",
    historico: "",
    responsavel: "",
    contatoEmergencia: "",
    autorizacaoImagem: "na",
    diasTreino: "",
    diaVencimento: null,
    ultimoPagamento: null,
    historicoPagamentos: [],
    statusMatricula: "Aguardando",
    criadoEm: new Date().toISOString(),
    ...dados,
  };
}

function exportarBackup(db) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "clients-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importarBackup(arquivo) {
  return arquivo.text().then((txt) => {
    const db = JSON.parse(txt);
    if (!db || !Array.isArray(db.alunos)) throw new Error("Arquivo inválido");
    saveDB(db);
    return db;
  });
}