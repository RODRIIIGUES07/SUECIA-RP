"use strict";

const ADMIN_PASSWORD = "200711";

const PRODUCTS_KEY = "suecia_nc_products_v1";
const ACCESS_KEY = "suecia_nc_access_v1";

const DEFAULT_PRODUCTS = [
  {
    id: "c4",
    name: "C4",
    partnershipPrice: 14000,
    normalPrice: 18000
  }
];

const $ = (id) => document.getElementById(id);

let currentMember = null;
let currentTab = "partnership";
let isAdmin = false;

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error("Não foi possível carregar os dados:", error);
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os dados:", error);
    alert("Não foi possível salvar. Verifique o armazenamento do navegador.");
    return false;
  }
}

let products = loadData(PRODUCTS_KEY, DEFAULT_PRODUCTS);
let accessLog = loadData(ACCESS_KEY, []);

if (!Array.isArray(products)) products = DEFAULT_PRODUCTS;
if (!Array.isArray(accessLog)) accessLog = [];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showScreen(screenId) {
  ["welcomeScreen", "mainScreen", "adminLoginScreen", "adminScreen"].forEach((id) => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", id !== screenId);
  });
}

function showMessage(elementId, message, isError = false) {
  const element = $(elementId);
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#ff9696" : "";
}

function getProductIcon(name) {
  const normalized = name.toLowerCase();

  if (normalized.includes("c4") || normalized.includes("explos")) return "💣";
  if (normalized.includes("arma") || normalized.includes("muni")) return "🎯";
  if (normalized.includes("colete")) return "🛡️";
  if (normalized.includes("kit")) return "📦";

  return "📦";
}

function saveProducts() {
  const ok = saveData(PRODUCTS_KEY, products);
  if (ok) {
    renderCatalog();
  }
  return ok;
}

function renderCatalog() {
  renderProductCards("partnershipProducts", "partnership");
  renderProductCards("normalProducts", "normal");
  if (isAdmin) {
    renderAdminProducts();
  }
}

$("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("memberName").value.trim();
  const memberId = $("memberId").value.trim();

  if (name.length < 2) {
    showMessage("loginMessage", "Digite um nome válido.", true);
    return;
  }

  if (!/^[a-zA-Z0-9_-]{1,20}$/.test(memberId)) {
    showMessage(
      "loginMessage",
      "Digite um ID válido (letras e números, sem espaços).",
      true
    );
    return;
  }

  currentMember = {
    name,
    id: memberId
  };

  accessLog.unshift({
    name,
    id: memberId,
    timestamp: new Date().toISOString()
  });

  accessLog = accessLog.slice(0, 200);

  if (!saveData(ACCESS_KEY, accessLog)) {
    accessLog.shift();
    return;
  }

  $("currentMemberName").textContent = name;
  $("memberBadge").textContent = `${name} • ID ${memberId}`;

  showMessage("loginMessage", "");
  showScreen("mainScreen");

  switchTab("partnership");
  renderAccessLogs();
});

$("logoutButton").addEventListener("click", () => {
  currentMember = null;
  isAdmin = false;

  $("loginForm").reset();
  $("memberBadge").textContent = "Visitante";

  showScreen("welcomeScreen");
  showMessage("loginMessage", "");
});

const tabMap = {
  partnership: "partnershipTab",
  normal: "normalTab",
  laundering: "launderingTab"
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
  });
});

function switchTab(tabName) {
  if (!tabMap[tabName]) return;

  currentTab = tabName;

  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  Object.entries(tabMap).forEach(([key, elementId]) => {
    const el = $(elementId);
    if (el) el.classList.toggle("hidden", key !== tabName);
  });
}

function renderProductCards(containerId, priceType) {
  const container = $(containerId);
  if (!container) return;
  container.replaceChildren();

  const countId = priceType === "partnership"
    ? "partnershipCount"
    : "normalCount";

  const countEl = $(countId);
  if (countEl) {
    countEl.textContent =
      `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
  }

  if (products.length === 0) {
    container.append(
      makeElement("p", "empty-state", "Nenhum produto cadastrado no momento.")
    );
    return;
  }

  products.forEach((product) => {
    const card = makeElement("article", "product-card");

    const unitPrice = Number(
      priceType === "partnership"
        ? product.partnershipPrice
        : product.normalPrice
    );

    const title = makeElement("h3", "", product.name);

    const description = makeElement(
      "p",
      "product-description",
      priceType === "partnership"
        ? "Preço exclusivo da parceria"
        : "Preço fora da parceria"
    );

    const priceLabel = makeElement(
      "span",
      "price-label",
      "Preço por unidade"
    );

    const price = makeElement(
      "strong",
      "product-price",
      formatNumber(unitPrice)
    );

    const quantityLabel = makeElement("label", "", "Quantidade");
    quantityLabel.style.display = "block";
    quantityLabel.style.marginTop = "18px";

    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.min = "0";
    quantityInput.step = "1";
    quantityInput.value = "0";
    quantityInput.id = `quantity-${priceType}-${product.id}`;
    quantityInput.placeholder = "Digite a quantidade";
    quantityInput.setAttribute(
      "aria-label",
      `Quantidade de ${product.name} na aba ${priceType}`
    );

    quantityLabel.htmlFor = quantityInput.id;

    const totalLabel = makeElement(
      "span",
      "price-label",
      "Total a pagar"
    );
    totalLabel.style.display = "block";
    totalLabel.style.marginTop = "16px";

    const total = makeElement(
      "strong",
      "product-price",
      formatNumber(0)
    );
    total.style.fontSize = "24px";

    function calculateTotal() {
      const quantity = Math.max(
        0,
        Math.floor(Number(quantityInput.value) || 0)
      );

      total.textContent = formatNumber(quantity * unitPrice);
    }

    quantityInput.addEventListener("input", calculateTotal);

    card.append(
      title,
      description,
      priceLabel,
      price,
      quantityLabel,
      quantityInput,
      totalLabel,
      total
    );

    container.append(card);
  });
}

function calculateLaundering() {
  const gross = Math.max(0, Number($("grossAmount").value) || 0);
  const rate = Number($("feeRate").value);

  const fee = gross * rate / 100;
  const net = gross - fee;

  $("feeRateLabel").textContent = `${rate}%`;
  $("feeAmount").textContent = formatNumber(fee);
  $("netAmount").textContent = formatNumber(net);

  return { gross, rate, fee, net };
}

$("grossAmount").addEventListener("input", calculateLaundering);
$("feeRate").addEventListener("input", calculateLaundering);

$("copyCalculation").addEventListener("click", async () => {
  const result = calculateLaundering();

  const summary = [
    "SUÉCIA NC — CALCULADORA",
    `Valor bruto: ${formatNumber(result.gross)}`,
    `Taxa: ${result.rate}%`,
    `Desconto: ${formatNumber(result.fee)}`,
    `Valor líquido: ${formatNumber(result.net)}`
  ].join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    showMessage("calculatorMessage", "Resultado copiado!");
  } catch (error) {
    showMessage(
      "calculatorMessage",
      "Não foi possível copiar automaticamente. Selecione os valores manualmente.",
      true
    );
  }
});

function fillAccessTable(tbodyId) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  tbody.replaceChildren();

  accessLog.forEach((entry) => {
    const row = document.createElement("tr");

    row.append(
      makeElement("td", "", entry.name),
      makeElement("td", "", entry.id),
      makeElement("td", "", formatDate(entry.timestamp))
    );

    tbody.append(row);
  });
}

function renderAccessLogs() {
  fillAccessTable("adminAccessLog");
}

$("clearAccessButton").addEventListener("click", () => {
  if (!isAdmin) return;

  const confirmed = confirm(
    "Deseja apagar todo o histórico de acessos deste navegador?"
  );

  if (!confirmed) return;

  const previousLog = accessLog;
  accessLog = [];

  if (saveData(ACCESS_KEY, accessLog)) {
    renderAccessLogs();
  } else {
    accessLog = previousLog;
  }
});

$("adminButton").addEventListener("click", () => {
  $("adminPassword").value = "";
  showMessage("adminLoginMessage", "");
  showScreen("adminLoginScreen");
  $("adminPassword").focus();
});

$("adminLoginForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const password = $("adminPassword").value;

  if (password !== ADMIN_PASSWORD) {
    showMessage("adminLoginMessage", "Senha incorreta.", true);
    $("adminPassword").value = "";
    $("adminPassword").focus();
    return;
  }

  isAdmin = true;
  showMessage("adminLoginMessage", "");
  $("adminPassword").value = "";
  showScreen("adminScreen");
  renderCatalog();
  renderAccessLogs();
});

$("cancelAdminLoginButton").addEventListener("click", () => {
  $("adminPassword").value = "";
  showMessage("adminLoginMessage", "");

  if (currentMember) {
    showScreen("mainScreen");
    switchTab(currentTab);
  } else {
    showScreen("welcomeScreen");
  }
});

$("closeAdminButton").addEventListener("click", () => {
  isAdmin = false;

  if (currentMember) {
    showScreen("mainScreen");
    switchTab(currentTab);
  } else {
    showScreen("welcomeScreen");
  }
});

$("productForm").addEventListener("submit", (event) => {
  event.preventDefault();

  if (!isAdmin) return;

  const name = $("productName").value.trim();
  const partnershipPrice = Number($("partnershipPrice").value);
  const normalPrice = Number($("normalPrice").value);
  const editingId = $("editProductId").value;

  if (!name) {
    showMessage("adminMessage", "Informe o nome do produto.", true);
    return;
  }

  if (
    $("partnershipPrice").value === "" ||
    $("normalPrice").value === "" ||
    !Number.isFinite(partnershipPrice) ||
    !Number.isFinite(normalPrice) ||
    partnershipPrice < 0 ||
    normalPrice < 0
  ) {
    showMessage("adminMessage", "Informe preços válidos.", true);
    return;
  }

  const previousProducts = products.slice();

  if (editingId) {
    products = products.map((product) =>
      product.id === editingId
        ? { ...product, name, partnershipPrice, normalPrice }
        : product
    );
  } else {
    products.push({
      id: createProductId(),
      name,
      partnershipPrice,
      normalPrice
    });
  }

  if (!saveProducts()) {
    products = previousProducts;
    renderCatalog();
    showMessage("adminMessage", "Não foi possível salvar o produto.", true);
    return;
  }

  resetProductForm();
  showMessage("adminMessage", "Produto salvo com sucesso!");
});

function createProductId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function renderAdminProducts() {
  const container = $("adminProductList");
  if (!container) return;
  container.replaceChildren();

  if (products.length === 0) {
    container.append(
      makeElement("p", "empty-state", "Nenhum produto cadastrado.")
    );
    return;
  }

  products.forEach((product) => {
    const item = makeElement("div", "admin-product");
    const info = makeElement("div", "admin-product-info");

    info.append(
      makeElement("strong", "", product.name),
      makeElement(
        "span",
        "",
        `Parceria: ${formatNumber(product.partnershipPrice)} | Normal: ${formatNumber(product.normalPrice)}`
      )
    );

    const actions = makeElement("div", "admin-product-actions");

    const editButton = makeElement("button", "button button-outline", "Editar");
    editButton.type = "button";
    editButton.addEventListener("click", () => editProduct(product.id));

    const deleteButton = makeElement("button", "button button-danger", "Excluir");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteProduct(product.id));

    actions.append(editButton, deleteButton);
    item.append(info, actions);
    container.append(item);
  });
}

function editProduct(id) {
  if (!isAdmin) return;

  const product = products.find((item) => item.id === id);
  if (!product) return;

  $("editProductId").value = product.id;
  $("productName").value = product.name;
  $("partnershipPrice").value = product.partnershipPrice;
  $("normalPrice").value = product.normalPrice;
  $("productFormTitle").textContent = "Editar produto";
  $("cancelEditButton").classList.remove("hidden");

  $("productName").focus();
  showMessage("adminMessage", "Altere os campos e clique em salvar.");
}

function deleteProduct(id) {
  if (!isAdmin) return;

  const product = products.find((item) => item.id === id);
  if (!product) return;

  if (!confirm(`Deseja excluir o produto "${product.name}"?`)) return;

  const previousProducts = products.slice();
  products = products.filter((item) => item.id !== id);

  if (!saveProducts()) {
    products = previousProducts;
    renderCatalog();
    showMessage("adminMessage", "Não foi possível excluir o produto.", true);
    return;
  }

  if ($("editProductId").value === id) resetProductForm();

  showMessage("adminMessage", "Produto excluído.");
}

function resetProductForm() {
  $("productForm").reset();
  $("editProductId").value = "";
  $("productFormTitle").textContent = "Adicionar produto";
  $("cancelEditButton").classList.add("hidden");
}

$("cancelEditButton").addEventListener("click", resetProductForm);

renderCatalog();
renderAccessLogs();
calculateLaundering();
showScreen("welcomeScreen");