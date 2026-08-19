// URL do aplicativo web do Google Apps Script (cole após a implantação)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDfeoMtY64rhx5zSY5Bzcx5xKS8ad3k2aA7F3jNe8pJkUNzpq8xPWpZ4mJC_JNldl65w/exec";

// Transição suave entre etapas
const TRANSITION_MS = 400;

const navigateWithTransition = (url) => {
  document.body.classList.add("page-leaving");
  setTimeout(() => {
    window.location.href = url;
  }, TRANSITION_MS);
};

// Acesso rápido ao painel de gestão (admin.html):
// 1. Atalho de teclado: Ctrl+Shift+A
// 2. Clique 5 vezes rapidamente no texto "Amigos do Bem"
const openAdmin = () => window.location.href = "admin.html";

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    openAdmin();
  }
});

const continueBtn = document.getElementById("continueBtn");

if (continueBtn) {
  continueBtn.addEventListener("click", () => {
    navigateWithTransition("etapa-2.html");
  });
}

const pqtForm = document.getElementById("pqtForm");

if (pqtForm) {
  const pqtStartedAt = Date.now();
  const motivoRadios = [...pqtForm.querySelectorAll('input[name="motivo"]')];
  const motivoOutroWrap = document.getElementById("motivoOutroWrap");
  const motivoOutro = document.getElementById("motivoOutro");
  const dataNascimentoWrap = document.getElementById("dataNascimentoWrap");
  const dataNascimento = document.getElementById("dataNascimento");
  const eventoParaRadios = [...pqtForm.querySelectorAll('input[name="evento_para"]')];
  const homenageadoBlock = document.getElementById("homenageadoBlock");
  const comoConheceuSelect = document.getElementById("comoConheceu");
  const comoConheceuOutroWrap = document.getElementById("comoConheceuOutroWrap");
  const comoConheceuOutro = document.getElementById("comoConheceuOutro");
  const periodoRadios = [...pqtForm.querySelectorAll('input[name="periodo"]')];
  const periodoCustomWrap = document.getElementById("periodoCustomWrap");
  const periodoPersonalizado = document.getElementById("periodoPersonalizado");
  const ticketRadios = [...pqtForm.querySelectorAll('input[name="ticket"]')];
  const ticketOpenWrap = document.getElementById("ticketOpenWrap");
  const ticketAberto = document.getElementById("ticketAberto");

  const cepGroups = [
    {
      key: "main",
      cep: document.getElementById("mainCep"),
      rua: document.getElementById("mainRua"),
      numero: document.getElementById("mainNumero"),
      complemento: document.getElementById("mainComplemento"),
      bairro: document.getElementById("mainBairro"),
      cidade: document.getElementById("mainCidade"),
      estado: document.getElementById("mainEstado"),
    },
    {
      key: "honoree",
      cep: document.getElementById("hCep"),
      rua: document.getElementById("hRua"),
      numero: document.getElementById("hNumero"),
      complemento: document.getElementById("hComplemento"),
      bairro: document.getElementById("hBairro"),
      cidade: document.getElementById("hCidade"),
      estado: document.getElementById("hEstado"),
    },
  ];

  const fieldsToRemember = [...pqtForm.querySelectorAll("input, select, textarea")];
  fieldsToRemember.forEach((field) => {
    field.dataset.initialRequired = field.required ? "true" : "false";
  });

  const formatCep = (value) => value.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d{0,3})$/, "$1-$2").replace(/-$/, "");
  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  };
  const isValidCpf = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== parseInt(digits[9], 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
    check = (sum * 10) % 11;
    if (check === 10) check = 0;
    return check === parseInt(digits[10], 10);
  };
  const validateCpfField = (field) => {
    if (!field.value) {
      field.setCustomValidity("");
      return;
    }
    field.setCustomValidity(isValidCpf(field.value) ? "" : "CPF inválido. Verifique os números digitados.");
  };
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3").replace(/-$/, "");
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})$/, "($1) $2-$3").replace(/-$/, "");
  };
  const formatMoney = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (!digits) return "";
    const cents = digits.padStart(3, "0");
    const integerPart = cents.slice(0, -2).replace(/^0+(?=\d)/, "");
    const decimalPart = cents.slice(-2);
    return `${integerPart || "0"},${decimalPart}`;
  };

  const syncRequiredState = (element, visible) => {
    element.querySelectorAll("input, select, textarea").forEach((field) => {
      const shouldRequire = field.dataset.initialRequired === "true";
      field.required = visible && shouldRequire;
      field.disabled = !visible;
    });
  };

  const setHiddenBlock = (element, visible) => {
    element.hidden = !visible;
    element.setAttribute("aria-hidden", visible ? "false" : "true");
    syncRequiredState(element, visible);
  };

  const clearHiddenBlock = (element) => {
    element.querySelectorAll("input, select, textarea").forEach((field) => {
      if (field.type === "radio" || field.type === "checkbox") {
        field.checked = false;
        return;
      }

      field.value = "";
    });
  };

  const updateMotivo = () => {
    const selected = motivoRadios.find((radio) => radio.checked)?.value;
    const outro = selected === "Outro";
    const aniversario = selected === "Aniversário";

    setHiddenBlock(motivoOutroWrap, outro);
    setHiddenBlock(dataNascimentoWrap, aniversario);

    motivoOutro.required = outro;
    dataNascimento.required = aniversario;
  };

  const updateEventoPara = () => {
    const selected = eventoParaRadios.find((radio) => radio.checked)?.value;
    const visible = selected === "Não";
    setHiddenBlock(homenageadoBlock, visible);

    if (!visible) {
      clearHiddenBlock(homenageadoBlock);
    }
  };

  const updateComoConheceu = () => {
    const selected = comoConheceuSelect.value;
    const visible = selected === "Outros" || selected === "Indicação de Amigos/Família";
    setHiddenBlock(comoConheceuOutroWrap, visible);
    comoConheceuOutro.required = visible;
  };

  const updatePeriodo = () => {
    const selected = periodoRadios.find((radio) => radio.checked)?.value;
    const visible = selected === "Personalizado";
    setHiddenBlock(periodoCustomWrap, visible);
    periodoPersonalizado.required = visible;
  };

  const updateTicket = () => {
    const selected = ticketRadios.find((radio) => radio.checked)?.value;
    const visible = selected === "Valor aberto";
    setHiddenBlock(ticketOpenWrap, visible);
    ticketAberto.required = visible;
  };

  const highlightAddressFields = (group) => {
    [group.numero, group.complemento].forEach((field) => {
      if (!field) return;
      field.classList.remove("cep-highlight");
      void field.offsetWidth;
      field.classList.add("cep-highlight");
      field.addEventListener("animationend", () => field.classList.remove("cep-highlight"), { once: true });
    });
  };

  const fillAddress = (group, data) => {
    if (!data) return;
    group.rua.value = data.logradouro || group.rua.value;
    group.bairro.value = data.bairro || group.bairro.value;
    group.cidade.value = data.localidade || group.cidade.value;
    group.estado.value = data.uf || group.estado.value;
    highlightAddressFields(group);
  };

  const lookupCep = async (group) => {
    const cep = group.cep.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data.erro) fillAddress(group, data);
    } catch {
      return;
    }
  };

  motivoRadios.forEach((radio) => radio.addEventListener("change", updateMotivo));
  comoConheceuSelect.addEventListener("change", updateComoConheceu);
  eventoParaRadios.forEach((radio) => radio.addEventListener("change", updateEventoPara));
  periodoRadios.forEach((radio) => radio.addEventListener("change", updatePeriodo));
  ticketRadios.forEach((radio) => radio.addEventListener("change", updateTicket));

  cepGroups.forEach((group) => {
    group.cep.addEventListener("blur", async () => {
      await lookupCep(group);
    });
  });

  pqtForm.addEventListener("input", (event) => {
    const { target } = event;
    if (target.id === "mainCep" || target.id === "hCep") target.value = formatCep(target.value);
    if (target.id === "cpf" || target.id === "hCpf") {
      target.value = formatCpf(target.value);
      validateCpfField(target);
    }
    if (target.id === "celular" || target.id === "celularOpcional" || target.id === "hCelular" || target.id === "hCelularOpcional") {
      target.value = formatPhone(target.value);
    }
    if (target.id === "ticketAberto") target.value = formatMoney(target.value);
  });

  document.querySelectorAll("[data-cep-search]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = button.dataset.cepSearch;
      const group = cepGroups.find((item) => item.key === key);
      if (group) await lookupCep(group);
    });
  });

  pqtForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pqtForm.reportValidity()) return;

    const submitBtn = pqtForm.querySelector(".submit-btn");
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    try {
      const payload = Object.fromEntries(new FormData(pqtForm).entries());
      payload.fill_ms = Date.now() - pqtStartedAt;
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload),
      });

      navigateWithTransition("etapa-3.html");
    } catch {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      alert("Não foi possível enviar o formulário. Verifique sua conexão e tente novamente.");
    }
  });

  updateMotivo();
  updateComoConheceu();
  updateEventoPara();
  updatePeriodo();
  updateTicket();
}
