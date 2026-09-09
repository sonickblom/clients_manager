// Banco local: localStorage (sem servidor, funciona offline)
// Chave versionada pra não misturar com futuras versões
const DB_KEY = "zpersonal_db_v1";

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
    nascimento: "",          // ISO yyyy-mm-dd
    endereco: "",
    historico: "",
    responsavel: "",
    contatoEmergencia: "",
    autorizacaoImagem: false,
    diasTreino: "",
    diaVencimento: null,     // número 1-31
    ultimoPagamento: null,   // ISO yyyy-mm-dd
    historicoPagamentos: [], // [{data, referencia}]
    statusMatricula: "Aguardando",
    criadoEm: new Date().toISOString(),
    ...dados,
  };
}

// Backup: baixa JSON / restaura de arquivo
function exportarBackup(db) {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "zpersonal-backup-" + new Date().toISOString().slice(0, 10) + ".json";
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