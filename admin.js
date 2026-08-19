// ============================================================
// Presentes que Transformam — Página de Gestão
// Dashboard, cards e registros (planilha via Apps Script),
// com busca, filtro por status, alteração de status de
// acompanhamento, visualização de detalhes e exportação CSV.
//
// SEGURANÇA:
// - Nenhuma senha ou token estático fica neste arquivo.
// - O login é validado pelo Apps Script (server-side) e retorna
//   um token de sessão temporário (30 min).
// - Todas as chamadas usam POST com corpo JSON
//   (Content-Type text/plain evita o CORS preflight).
//
// COMO CONFIGURAR:
// 1. Implante o apps-script.gs como aplicativo da web
//    (Executar como: "Eu" / Quem tem acesso: "Qualquer pessoa")
// 2. Copie a URL da implantação na constante APPS_SCRIPT_URL
// 3. No Apps Script, execute uma vez: configureAdminPassword("senha")
// 4. Publique a pasta ou abra admin.html em um navegador
// ============================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDfeoMtY64rhx5zSY5Bzcx5xKS8ad3k2aA7F3jNe8pJkUNzpq8xPWpZ4mJC_JNldl65w/exec";

const STATUSES = ["Novo", "Em contato", "Aprovado", "Concluído"];

const STATUS_BADGES = {
  "Novo": "s-novo",
  "Em contato": "s-contato",
  "Aprovado": "s-aprovado",
  "Concluído": "s-concluido",
};

const PALETTE = ["#f57a1f", "#2f80ed", "#2e7d32", "#f2b705", "#d4885a", "#8b6240", "#b03a2e"];

const GROUPS = [
  {
    title: "Sobre você",
    keys: ["Data/Hora", "Nome", "Como conheceu", "Como conheceu (descrição)", "Celular", "Celular 2", "E-mail", "CPF", "Data de nascimento"],
  },
  {
    title: "Endereço",
    keys: ["CEP", "Rua", "Número", "Complemento", "Bairro", "Cidade", "Estado"],
  },
  {
    title: "Evento",
    keys: ["Motivo", "Motivo (descrição)", "O evento é para você?", "Título do link", "Data do evento", "Período ativo", "Data final (período personalizado)", "Ticket", "Valor mínimo (ticket aberto)"],
  },
  {
    title: "Homenageado",
    keys: ["Nome do homenageado", "Como o homenageado conheceu", "Celular do homenageado", "Celular 2 do homenageado", "E-mail do homenageado", "CPF do homenageado", "CEP do homenageado", "Rua do homenageado", "Número do homenageado", "Complemento do homenageado", "Bairro do homenageado", "Cidade do homenageado", "Estado do homenageado"],
  },
];

const SESSION_KEY = "pqtAdminToken";
let sessionToken = sessionStorage.getItem(SESSION_KEY) || "";

let rows = [];
let searchTerm = "";
let statusFilter = "";

const $ = (id) => document.getElementById(id);

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );

const toBrDate = (value) => {
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.split("-").reverse().join("/");
  return text.replace(/^(\d{2}\/\d{2}\/\d{4}).*$/, "$1");
};

const parseBrDate = (value) => {
  const match = String(value ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? new Date(+match[3], +match[2] - 1, +match[1]) : null;
};

const csvCell = (value) => {
  const text = String(value).replace(/"/g, '""');
  return /[;"\r\n]/.test(text) ? `"${text}"` : text;
};

const statusBadge = (status) => {
  const cls = STATUS_BADGES[status] || "s-novo";
  return `<span class="status-badge ${cls}">${esc(status)}</span>`;
};

const statusOptions = (status) => {
  const options = STATUSES.includes(status) ? STATUSES : [status, ...STATUSES];
  return options
    .map((s) => `<option value="${esc(s)}" ${s === status ? "selected" : ""}>${esc(s)}</option>`)
    .join("");
};

// ============================================================
// API (Apps Script)
// Todas as chamadas via POST com corpo JSON. O Content-Type
// text/plain evita o CORS preflight; o Apps Script lê o corpo
// bruto (e.postData.contents) independentemente do cabeçalho.
// ============================================================

async function api(action, payload = {}) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      action,
      ...payload,
      ...(sessionToken ? { token: sessionToken } : {}),
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!json.ok) {
    if (json.code === "session_expired") {
      endSession("Sua sessão expirou. Faça login novamente.");
    }
    throw new Error(json.error || "Falha na requisição.");
  }
  return json;
}

function endSession(message) {
  sessionToken = "";
  sessionStorage.removeItem(SESSION_KEY);
  if (message) {
    $("loginError").textContent = message;
    $("loginError").hidden = false;
  }
  showLogin();
}

// ============================================================
// Autenticação
// ============================================================

function showLogin() {
  $("adminView").hidden = true;
  $("loginView").hidden = false;
  $("loginPassword").focus();
}

function showAdmin() {
  $("loginView").hidden = true;
  $("adminView").hidden = false;
  loadData();
}

async function tryRestoreSession() {
  if (!sessionToken) {
    showLogin();
    return;
  }
  try {
    await loadData();
    showAdmin();
  } catch (err) {
    // 401 já foi tratado em api() -> endSession(); outros erros
    // são exibidos em loadError quando o painel abrir.
  }
}

function initAuth() {
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = $("loginForm").querySelector("button[type='submit']");
    const password = $("loginPassword").value;
    if (!password) return;

    submitBtn.disabled = true;
    $("loginError").hidden = true;
    try {
      const json = await api("login", { password });
      sessionToken = json.token;
      sessionStorage.setItem(SESSION_KEY, sessionToken);
      $("loginPassword").value = "";
      showAdmin();
    } catch (err) {
      $("loginError").textContent = err.message || "Não foi possível entrar.";
      $("loginError").hidden = false;
      $("loginPassword").select();
    } finally {
      submitBtn.disabled = false;
    }
  });

  $("logoutBtn").addEventListener("click", async () => {
    try {
      await api("logout");
    } catch (err) {
      // ignora falhas no logout; a sessão local é limpa mesmo assim
    }
    endSession();
  });
}

// ============================================================
// Dados
// ============================================================

function setLoading(loading) {
  $("loadingMsg").hidden = !loading;
}

async function loadData() {
  setLoading(true);
  $("loadError").hidden = true;
  try {
    const json = await api("list");
    rows = json.rows || [];
  } catch (err) {
    rows = [];
    $("loadError").textContent =
      err.message || "Não foi possível carregar os dados. Confira a URL do Apps Script em admin.js e tente novamente.";
    $("loadError").hidden = false;
  } finally {
    setLoading(false);
    renderAll();
  }
}

function getFilteredRows() {
  const term = searchTerm.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false;
    if (!term) return true;
    const d = row.data;
    const haystack = [d["Nome"], d["E-mail"], d["Celular"], d["Título do link"], d["Cidade"], d["Data/Hora"]]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

// ============================================================
// Dashboard
// ============================================================

function renderDashboard() {
  const total = rows.length;
  const counts = {};
  STATUSES.forEach((s) => (counts[s] = 0));
  rows.forEach((row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = rows.filter((row) => {
    const date = parseBrDate(row.data["Data do evento"]);
    return date && date >= today;
  }).length;

  const stats = [
    { label: "Total de formulários", value: total, cls: "" },
    { label: "Novos", value: counts["Novo"], cls: "" },
    { label: "Em contato", value: counts["Em contato"], cls: "stat-blue" },
    { label: "Aprovados", value: counts["Aprovado"], cls: "stat-green" },
    { label: "Concluídos", value: counts["Concluído"], cls: "stat-gray" },
    { label: "Eventos futuros", value: upcoming, cls: "stat-green" },
  ];

  $("statsGrid").innerHTML = stats
    .map(
      (stat) => `
      <div class="stat-card ${stat.cls}">
        <span class="stat-number">${stat.value}</span>
        <span class="stat-label">${esc(stat.label)}</span>
      </div>`
    )
    .join("");

  renderChartConheceu();
  renderChartMeses();
  renderChartStatus();
  renderChartPeriodo();
}

function countBy(rows, key) {
  const counts = {};
  rows.forEach((row) => {
    const value = String(row.data[key] || "Não informado");
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function hBarChart(el, entries) {
  if (!entries.length) {
    el.innerHTML = '<div class="chart-empty">Nenhum registro ainda.</div>';
    return;
  }
  const max = entries[0].count || 1;
  el.innerHTML = `
    <div class="h-bar-chart">
      ${entries
        .map(
          (entry, i) => `
        <div class="h-bar-row">
          <span class="h-bar-label">${esc(entry.label)}</span>
          <div class="h-bar-track">
            <div class="h-bar-fill" style="width:${(entry.count / max) * 100}%;background:${PALETTE[i % PALETTE.length]}"></div>
          </div>
          <span class="h-bar-value">${entry.count}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function vBarChart(el, counts) {
  const max = Math.max(1, ...counts);
  el.innerHTML = `
    <div class="v-bar-chart">
      ${counts
        .map(
          (count, i) => `
        <div class="v-bar-col">
          <span class="v-bar-value">${count}</span>
          <div class="v-bar-fill" style="height:${(count / max) * 100}%;background:${PALETTE[i % PALETTE.length]}"></div>
          <span class="v-bar-label">${MONTHS[i]}</span>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderChartConheceu() {
  hBarChart($("chartConheceu"), countBy(rows, "Como conheceu"));
}

function renderChartMeses() {
  const counts = Array(12).fill(0);
  rows.forEach((row) => {
    const date = parseBrDate(row.data["Data/Hora"]);
    if (date) counts[date.getMonth()]++;
  });
  vBarChart($("chartMeses"), counts);
}

function renderChartStatus() {
  const entries = STATUSES.map((status) => ({
    label: status,
    count: rows.filter((row) => row.status === status).length,
  })).filter((entry) => entry.count > 0);
  hBarChart($("chartStatus"), entries);
}

function renderChartPeriodo() {
  const counts = {};
  rows.forEach((row) => {
    const value = String(row.data["Período ativo"] || "Não informado");
    counts[value] = (counts[value] || 0) + 1;
  });
  const entries = Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
      order: parseInt(label, 10) || 999,
    }))
    .sort((a, b) => a.order - b.order || b.count - a.count);
  hBarChart($("chartPeriodo"), entries);
}

// ============================================================
// Cards
// ============================================================

function renderCards() {
  $("cardsEmpty").hidden = rows.length > 0;
  $("cardsGrid").innerHTML = rows
    .map((row) => {
      const d = row.data;
      return `
      <article class="form-card-item">
        <div class="fc-head">
          <div>
            <p class="fc-kicker">${esc(d["Título do link"] || "Evento sem título")}</p>
            <h3>${esc(d["Nome"] || "Sem nome")}</h3>
          </div>
          ${statusBadge(row.status)}
        </div>
        <dl class="fc-facts">
          <div><dt>Data do evento</dt><dd>${esc(toBrDate(d["Data do evento"]) || "-")}</dd></div>
          <div><dt>Ticket</dt><dd>${esc(d["Ticket"] || "-")}</dd></div>
          <div><dt>Motivo</dt><dd>${esc(d["Motivo"] || "-")}</dd></div>
          <div><dt>Cidade</dt><dd>${esc([d["Cidade"], d["Estado"]].filter(Boolean).join("/") || "-")}</dd></div>
          <div><dt>E-mail</dt><dd>${esc(d["E-mail"] || "-")}</dd></div>
          <div><dt>Celular</dt><dd>${esc(d["Celular"] || "-")}</dd></div>
        </dl>
        <div class="fc-actions">
          <select class="status-select" data-row="${row.rowNumber}" aria-label="Status de ${esc(d["Nome"] || "resposta")}">
            ${statusOptions(row.status)}
          </select>
          <button class="link-btn" type="button" data-detail="${row.rowNumber}">Ver detalhes</button>
        </div>
      </article>`;
    })
    .join("");
}

// ============================================================
// Tabela
// ============================================================

function renderTable() {
  const filtered = getFilteredRows();
  const total = rows.length;
  $("rowCount").textContent = `${filtered.length} de ${total} ${total === 1 ? "formulário" : "formulários"}`;

  $("emptyMsg").hidden = total > 0;
  $("noResultsMsg").hidden = total === 0 || filtered.length > 0;
  $("tableWrap").hidden = filtered.length === 0;

  $("responsesBody").innerHTML = filtered
    .map((row) => {
      const d = row.data;
      return `
        <tr>
          <td>${esc(d["Data/Hora"] || "")}</td>
          <td><strong>${esc(d["Nome"] || "")}</strong></td>
          <td>${esc(d["Celular"] || "")}</td>
          <td>${esc(d["E-mail"] || "")}</td>
          <td>${esc(d["Título do link"] || "")}</td>
          <td>${esc(toBrDate(d["Data do evento"] || ""))}</td>
          <td>${esc(d["Ticket"] || "")}</td>
          <td>${statusBadge(row.status)}</td>
          <td>
            <select class="status-select" data-row="${row.rowNumber}" aria-label="Status de ${esc(d["Nome"] || "resposta")}">
              ${statusOptions(row.status)}
            </select>
            <button class="link-btn" type="button" data-detail="${row.rowNumber}">Ver</button>
          </td>
        </tr>`;
    })
    .join("");
}

function renderAll() {
  renderDashboard();
  renderCards();
  renderTable();
}

// ============================================================
// Detalhes (modal)
// ============================================================

function openDetail(rowNumber) {
  const row = rows.find((r) => r.rowNumber === rowNumber);
  if (!row) return;
  const d = row.data;

  const groupsHtml = GROUPS.map((group) => {
    const items = group.keys
      .map((key) => ({ key, label: key, value: toBrDate(d[key] || "") }))
      .filter((item) => item.value);
    if (!items.length) return "";
    return `
      <div class="detail-group">
        <h3>${esc(group.title)}</h3>
        <div class="detail-grid">
          ${items.map((item) => `<div class="detail-item"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></div>`).join("")}
        </div>
      </div>`;
  }).join("");

  $("modalTitle").textContent = `Formulário de ${d["Nome"] || "sem nome"}`;
  $("modalBody").innerHTML = groupsHtml || "<p class='admin-empty'>Sem dados para exibir.</p>";
  $("detailModal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  $("detailModal").hidden = true;
  document.body.style.overflow = "";
}

// ============================================================
// Ações
// ============================================================

async function updateStatus(rowNumber, status, select) {
  const previous = rows.find((r) => r.rowNumber === rowNumber)?.status || "Novo";
  select.disabled = true;

  try {
    await api("update_status", { row: rowNumber, status });
    const target = rows.find((r) => r.rowNumber === rowNumber);
    if (target) target.status = status;
  } catch (err) {
    select.value = previous;
    if (sessionToken) {
      alert("Não foi possível atualizar o status. Tente novamente.");
    }
  } finally {
    select.disabled = false;
    renderAll();
  }
}

function exportCsv() {
  const filtered = getFilteredRows();
  if (!filtered.length) {
    alert("Não há dados para exportar.");
    return;
  }
  const headers = Object.keys(filtered[0].data);
  const lines = [headers.join(";")];
  filtered.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row.data[header] || "")).join(";"));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "formularios-pqt.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Eventos e inicialização
// ============================================================

function initTabs() {
  const buttons = [...document.querySelectorAll(".tab-btn")];
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-selected", String(b === button));
      });
      ["dashboard", "cards", "registros"].forEach((tab) => {
        $("panel" + tab[0].toUpperCase() + tab.slice(1)).hidden = tab !== button.dataset.tab;
      });
    });
  });
}

function initEvents() {
  document.addEventListener("change", (event) => {
    const select = event.target.closest(".status-select");
    if (!select) return;
    updateStatus(Number(select.dataset.row), select.value, select);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail]");
    if (!button) return;
    openDetail(Number(button.dataset.detail));
  });

  $("searchInput").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    renderTable();
  });

  $("statusFilter").addEventListener("change", (event) => {
    statusFilter = event.target.value;
    renderTable();
  });

  $("refreshBtn").addEventListener("click", loadData);
  $("exportBtn").addEventListener("click", exportCsv);
  $("closeModalBtn").addEventListener("click", closeDetail);
  $("detailModal").addEventListener("click", (event) => {
    if (event.target === $("detailModal")) closeDetail();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDetail();
  });
}

(function init() {
  $("statusFilter").innerHTML =
    '<option value="">Todos os status</option>' +
    STATUSES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  initTabs();
  initAuth();
  initEvents();
  tryRestoreSession();
})();