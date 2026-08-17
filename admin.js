// ============================================================
// Presentes que Transformam — Página de Gestão
// Lista os formulários preenchidos (planilha via Apps Script),
// com busca, filtro por status, alteração de status de
// acompanhamento, visualização de detalhes e exportação CSV.
//
// COMO CONFIGURAR:
// 1. Implante o apps-script.gs como aplicativo da web
//    (Executar como: "Eu" / Quem tem acesso: "Qualquer pessoa")
// 2. Copie a URL da implantação na constante APPS_SCRIPT_URL
// 3. Altere ADMIN_PASSWORD (senha de acesso à página)
// 4. Defina o mesmo valor em ADMIN_TOKEN aqui e no apps-script.gs
// ============================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDfeoMtY64rhx5zSY5Bzcx5xKS8ad3k2aA7F3jNe8pJkUNzpq8xPWpZ4mJC_JNldl65w/exec";
const ADMIN_PASSWORD = "qBySKNe%fNwbqq";
const ADMIN_TOKEN = "KLYeK5zKy328PcxD";

const STATUSES = ["Novo", "Em contato", "Aprovado", "Concluído"];

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

const SESSION_KEY = "pqtAdminAuthed";

let rows = [];
let searchTerm = "";
let statusFilter = "";

const $ = (id) => document.getElementById(id);

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );

const toBrDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value).split("-").reverse().join("/") : String(value ?? "");

const buildUrl = (params) => `${APPS_SCRIPT_URL}?${new URLSearchParams(params).toString()}`;

const csvCell = (value) => {
  const text = String(value).replace(/"/g, '""');
  return /[;"\r\n]/.test(text) ? `"${text}"` : text;
};

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

function initAuth() {
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showAdmin();
  } else {
    showLogin();
  }

  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("loginPassword").value === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      $("loginError").hidden = true;
      $("loginPassword").value = "";
      showAdmin();
    } else {
      $("loginError").hidden = false;
      $("loginPassword").select();
    }
  });

  $("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });
}

function setLoading(loading) {
  $("loadingMsg").hidden = !loading;
  $("tableWrap").hidden = loading;
}

async function loadData() {
  setLoading(true);
  $("loadError").hidden = true;
  try {
    const response = await fetch(buildUrl({ action: "list", token: ADMIN_TOKEN }));
    const json = await response.json();
    if (!json.ok) throw new Error(json.error || "Falha ao carregar os dados.");
    rows = json.rows || [];
  } catch (err) {
    rows = [];
    $("loadError").textContent =
      err.message || "Não foi possível carregar os dados. Confira a URL do Apps Script em admin.js e tente novamente.";
    $("loadError").hidden = false;
  } finally {
    setLoading(false);
    render();
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

function render() {
  const filtered = getFilteredRows();
  const total = rows.length;
  $("rowCount").textContent = `${filtered.length} de ${total} ${total === 1 ? "formulário" : "formulários"}`;

  $("emptyMsg").hidden = total > 0;
  $("noResultsMsg").hidden = total === 0 || filtered.length > 0;
  $("tableWrap").hidden = filtered.length === 0;

  $("responsesBody").innerHTML = filtered
    .map((row) => {
      const d = row.data;
      const statusOptions = STATUSES.includes(row.status) ? STATUSES : [row.status, ...STATUSES];
      return `
        <tr>
          <td>${esc(d["Data/Hora"] || "")}</td>
          <td><strong>${esc(d["Nome"] || "")}</strong></td>
          <td>${esc(d["Celular"] || "")}</td>
          <td>${esc(d["E-mail"] || "")}</td>
          <td>${esc(d["Título do link"] || "")}</td>
          <td>${esc(toBrDate(d["Data do evento"] || ""))}</td>
          <td>${esc(d["Ticket"] || "")}</td>
          <td>
            <select class="status-select" data-row="${row.rowNumber}" aria-label="Status de ${esc(d["Nome"] || "resposta")}">
              ${statusOptions.map((s) => `<option value="${esc(s)}" ${s === row.status ? "selected" : ""}>${esc(s)}</option>`).join("")}
            </select>
          </td>
          <td><button class="link-btn" type="button" data-detail="${row.rowNumber}">Ver</button></td>
        </tr>`;
    })
    .join("");
}

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

function initEvents() {
  $("responsesBody").addEventListener("change", (event) => {
    const select = event.target.closest(".status-select");
    if (!select) return;
    const rowNumber = Number(select.dataset.row);
    const status = select.value;
    const previous = rows.find((r) => r.rowNumber === rowNumber)?.status || "Novo";
    select.disabled = true;

    fetch(buildUrl({ action: "update_status", row: rowNumber, status, token: ADMIN_TOKEN }), { method: "POST" })
      .then((response) => response.json())
      .then((json) => {
        if (!json.ok) throw new Error(json.error || "Falha ao atualizar o status.");
        const target = rows.find((r) => r.rowNumber === rowNumber);
        if (target) target.status = status;
      })
      .catch(() => {
        select.value = previous;
        alert("Não foi possível atualizar o status. Tente novamente.");
      })
      .finally(() => {
        select.disabled = false;
        render();
      });
  });

  $("responsesBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-detail]");
    if (!button) return;
    openDetail(Number(button.dataset.detail));
  });

  $("searchInput").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    render();
  });

  $("statusFilter").addEventListener("change", (event) => {
    statusFilter = event.target.value;
    render();
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
  initAuth();
  initEvents();
})();