function norm(s) {
  return (s || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function detectarDelimitador(linha) {
  return (linha.match(/;/g) || []).length > (linha.match(/,/g) || []).length ? ";" : ",";
}

function parseCSV(texto) {
  const linhas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!linhas.length) return [];
  const d = detectarDelimitador(linhas[0]);
  const linhasProc = [];
  for (const linha of linhas) {
    const campos = [];
    let atual = "", entreAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (entreAspas) {
        if (c === '"') {
          if (linha[i + 1] === '"') { atual += '"'; i++; }
          else entreAspas = false;
        } else atual += c;
      } else if (c === '"') entreAspas = true;
      else if (c === d) { campos.push(atual); atual = ""; }
      else atual += c;
    }
    campos.push(atual);
    linhasProc.push(campos.map((x) => x.trim()));
  }
  const cab = linhasProc[0];
  return linhasProc.slice(1).map((cols) => {
    const obj = {};
    cab.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
    return obj;
  });
}

function dataBRparaISO(br) {
  const m = (br || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return "";
  let [, dd, mm, aa] = m;
  if (aa.length === 2) aa = "20" + aa;
  return `${aa}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function rowToAluno(row) {
  const chaves = Object.keys(row);
  const nk = {};
  chaves.forEach((k) => { nk[k] = norm(k); });

  const chavesNome = chaves.filter((k) =>
    nk[k].includes("nome") && !nk[k].includes("responsavel") &&
    !nk[k].includes("municipio") && !nk[k].includes("escola") &&
    !nk[k].includes("mae") && !nk[k].includes("pai"));
  const nomeAluno = chavesNome.length ? row[chavesNome[0]] : "";
  const nomeResp = chavesNome.length > 1 ? row[chavesNome[1]] : "";

  const get = (chavesBusca) => {
    for (const k of chaves) {
      if (chavesBusca.some((c) => nk[k].includes(c))) return row[k];
    }
    return "";
  };

  const aut = norm(get(["autoriz", "imagem"]));
  return {
    nome: nomeAluno,
    nascimento: dataBRparaISO(get(["nascimento", "data de nasc"])),
    endereco: get(["endereco"]),
    historico: get(["historico", "medic", "atestado", "observ", "obs"]),
    responsavel: nomeResp || get(["responsavel"]),
    contatoEmergencia: get(["contato", "telefone", "whatsapp", "celular", "numero", "emergencia"]),
    autorizacaoImagem: aut.includes("nao") ? "nao" : aut.includes("sim") ? "autorizado" : "na",
    diasTreino: get(["dias de treino", "treino", "turma", "horario", "dias"]),
    diaVencimento: null,
    ultimoPagamento: null,
    statusMatricula: "Aguardando",
  };
}

function importCSV(texto) {
  return parseCSV(texto).map(rowToAluno).filter((a) => a.nome);
}

async function importarViaLink(urlCSV) {
  const r = await fetch(urlCSV);
  if (!r.ok) throw new Error("Não consegui ler o link (HTTP " + r.status + ")");
  return importCSV(await r.text());
}