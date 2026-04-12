const FIELD_KEYS = {
  front: ["שם הכרטיס", "משפט מסקרן", "משפחה", "תחום", "יעד או״ם"],
  back: [
    "כיוון למוצר",
    "קהל יעד",
    "פרסונה",
    "הנושא",
    "מצב מהחיים",
    "הבעיה",
    "למה זה לא עובד היום",
    "ההשפעה",
    "מה עדיין חסר",
    "שאלת פתיחה",
  ],
  cardCode: "קוד כרטיס",
};

const GAMES = {
  group1: {
    title: "משחק קבוצה 1",
    jsonPath: "kvutza_1.json",
    storage: {
      selected: "pd_game_group1_selected",
      ui: "pd_game_group1_ui",
    },
  },
  group2: {
    title: "משחק קבוצה 2",
    jsonPath: "kvutza_2.json",
    storage: {
      selected: "pd_game_group2_selected",
      ui: "pd_game_group2_ui",
    },
  },
};

const state = {
  currentGame: null,
  mode: "browse", // browse | select
  cards: [],
  selectedCodes: new Set(),
  ui: {
    search: "",
    family: "all",
    domain: "all",
    viewMode: "front",
    chosenFilter: "all", // all | selected | unselected
  },
  pendingSelectionCode: null,
};

const el = {
  selectorScreen: document.getElementById("game-selector"),
  gameScreen: document.getElementById("game-screen"),
  gameTitle: document.getElementById("game-title"),
  modeLabel: document.getElementById("mode-label"),
  toggleMode: document.getElementById("toggle-mode"),
  backToSelector: document.getElementById("back-to-selector"),
  searchInput: document.getElementById("search-input"),
  familyFilter: document.getElementById("family-filter"),
  domainFilter: document.getElementById("domain-filter"),
  viewMode: document.getElementById("view-mode"),
  clearFilters: document.getElementById("clear-filters"),
  resetSelections: document.getElementById("reset-selections"),
  cardsGrid: document.getElementById("cards-grid"),
  totalCount: document.getElementById("total-count"),
  selectedCount: document.getElementById("selected-count"),
  remainingCount: document.getElementById("remaining-count"),
  visibleCount: document.getElementById("visible-count"),
  confirmDialog: document.getElementById("confirm-dialog"),
  cardModal: document.getElementById("card-modal"),
  modalBody: document.getElementById("modal-body"),
  closeModal: document.getElementById("close-modal"),
  showAll: document.getElementById("show-all"),
  showSelected: document.getElementById("show-selected"),
  showUnselected: document.getElementById("show-unselected"),
};

init();

function init() {
  document.querySelectorAll(".selector-btn").forEach((btn) => {
    btn.addEventListener("click", () => enterGame(btn.dataset.game));
  });

  el.backToSelector.addEventListener("click", () => {
    el.gameScreen.classList.remove("active");
    el.selectorScreen.classList.add("active");
  });

  el.toggleMode.addEventListener("click", toggleMode);
  el.searchInput.addEventListener("input", onUiChange);
  el.familyFilter.addEventListener("change", onUiChange);
  el.domainFilter.addEventListener("change", onUiChange);
  el.viewMode.addEventListener("change", onUiChange);

  el.clearFilters.addEventListener("click", clearFilters);
  el.resetSelections.addEventListener("click", resetSelections);

  el.showAll.addEventListener("click", () => setChosenFilter("all"));
  el.showSelected.addEventListener("click", () => setChosenFilter("selected"));
  el.showUnselected.addEventListener("click", () => setChosenFilter("unselected"));

  el.confirmDialog.addEventListener("close", onConfirmDialogClose);
  el.closeModal.addEventListener("click", () => el.cardModal.close());
}

async function enterGame(gameKey) {
  const game = GAMES[gameKey];
  if (!game) return;

  state.currentGame = gameKey;
  state.mode = "browse";
  state.pendingSelectionCode = null;
  el.modeLabel.textContent = "מצב עיון";
  el.toggleMode.textContent = "התחל בחירה";

  loadSelections();
  loadUiState();
  await loadJsonByGame(gameKey);

  populateFilters();
  syncUiInputsFromState();
  renderCards();

  el.gameTitle.textContent = game.title;
  el.selectorScreen.classList.remove("active");
  el.gameScreen.classList.add("active");
}

async function loadJsonByGame(gameKey) {
  const game = GAMES[gameKey];
  const response = await fetch(game.jsonPath, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`נכשל בטעינת קובץ ${game.jsonPath}`);
  }
  const data = await response.json();
  state.cards = Array.isArray(data) ? data : [];
}

function toggleMode() {
  state.mode = state.mode === "browse" ? "select" : "browse";
  const inSelection = state.mode === "select";
  el.modeLabel.textContent = inSelection ? "מצב בחירה" : "מצב עיון";
  el.toggleMode.textContent = inSelection ? "חזרה למצב עיון" : "התחל בחירה";
  renderCards();
}

function onUiChange() {
  state.ui.search = el.searchInput.value.trim();
  state.ui.family = el.familyFilter.value;
  state.ui.domain = el.domainFilter.value;
  state.ui.viewMode = el.viewMode.value;
  saveUiState();
  renderCards();
}

function clearFilters() {
  state.ui.search = "";
  state.ui.family = "all";
  state.ui.domain = "all";
  state.ui.chosenFilter = "all";
  setChipState();
  syncUiInputsFromState();
  saveUiState();
  renderCards();
}

function setChosenFilter(type) {
  state.ui.chosenFilter = type;
  setChipState();
  saveUiState();
  renderCards();
}

function setChipState() {
  el.showAll.classList.toggle("active", state.ui.chosenFilter === "all");
  el.showSelected.classList.toggle("active", state.ui.chosenFilter === "selected");
  el.showUnselected.classList.toggle("active", state.ui.chosenFilter === "unselected");
}

function resetSelections() {
  if (!state.currentGame) return;
  const ok = window.confirm("לאפס את כל הבחירות במשחק הנוכחי?");
  if (!ok) return;
  state.selectedCodes = new Set();
  saveSelections();
  renderCards();
}

function renderCards() {
  const filtered = getFilteredCards();
  el.cardsGrid.innerHTML = "";

  filtered.forEach((card) => {
    const selected = isCardSelected(card);

    const article = document.createElement("article");
    article.className = `card ${selected ? "selected" : ""}`;

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <h3>${safe(card["שם הכרטיס"])}</h3>
      <p>${safe(card["משפט מסקרן"])}</p>
      <p class="kicker">${safe(card["משפחה"])} | ${safe(card["תחום"])} | ${safe(card["יעד או״ם"])}</p>
    `;
    article.appendChild(header);

    const view = state.ui.viewMode;
    if (view === "front" || view === "full") {
      article.appendChild(renderSection("קדמי", FIELD_KEYS.front, card));
    }
    if (view === "back" || view === "full") {
      article.appendChild(renderSection("אחורי", FIELD_KEYS.back, card));
    }

    const code = document.createElement("p");
    code.className = "card-code";
    code.textContent = safe(card[FIELD_KEYS.cardCode]);
    article.appendChild(code);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const readBtn = document.createElement("button");
    readBtn.className = "secondary";
    readBtn.textContent = "קריאה נוחה";
    readBtn.addEventListener("click", () => openCardModal(card));
    actions.appendChild(readBtn);

    const pickBtn = document.createElement("button");
    pickBtn.className = "primary";
    pickBtn.textContent = selected ? "כבר נבחר" : "בחר קלף";
    const disabled = state.mode !== "select" || selected;
    pickBtn.disabled = disabled;
    pickBtn.addEventListener("click", () => askCardSelection(card));
    actions.appendChild(pickBtn);

    article.appendChild(actions);
    el.cardsGrid.appendChild(article);
  });

  updateStats(filtered.length);
}

function renderSection(title, keys, card) {
  const section = document.createElement("section");
  section.className = "card-section";

  const heading = document.createElement("strong");
  heading.textContent = title;
  section.appendChild(heading);

  keys.forEach((key) => {
    const value = card[key] ?? "";
    const p = document.createElement("p");
    p.className = "field";
    p.innerHTML = `<strong>${key}:</strong> ${safe(value)}`;
    section.appendChild(p);
  });

  return section;
}

function askCardSelection(card) {
  const code = card[FIELD_KEYS.cardCode];
  if (!code || isCardSelected(card) || state.mode !== "select") return;
  state.pendingSelectionCode = String(code);
  el.confirmDialog.showModal();
}

function onConfirmDialogClose() {
  if (el.confirmDialog.returnValue === "confirm" && state.pendingSelectionCode) {
    state.selectedCodes.add(state.pendingSelectionCode);
    saveSelections();
    renderCards();
  }
  state.pendingSelectionCode = null;
}

function openCardModal(card) {
  const container = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = safe(card["שם הכרטיס"]);
  container.appendChild(title);

  [...FIELD_KEYS.front, ...FIELD_KEYS.back, FIELD_KEYS.cardCode].forEach((key) => {
    const p = document.createElement("p");
    p.className = "field";
    p.innerHTML = `<strong>${key}:</strong> ${safe(card[key] ?? "")}`;
    container.appendChild(p);
  });

  el.modalBody.innerHTML = "";
  el.modalBody.appendChild(container);
  el.cardModal.showModal();
}

function getFilteredCards() {
  const search = state.ui.search.toLowerCase();

  return state.cards.filter((card) => {
    const familyOk = state.ui.family === "all" || card["משפחה"] === state.ui.family;
    const domainOk = state.ui.domain === "all" || card["תחום"] === state.ui.domain;

    const selected = isCardSelected(card);
    const chosenOk =
      state.ui.chosenFilter === "all" ||
      (state.ui.chosenFilter === "selected" && selected) ||
      (state.ui.chosenFilter === "unselected" && !selected);

    let textOk = true;
    if (search) {
      const merged = Object.values(card).join(" ").toLowerCase();
      textOk = merged.includes(search);
    }

    return familyOk && domainOk && chosenOk && textOk;
  });
}

function populateFilters() {
  fillSelect(el.familyFilter, "משפחה", state.cards);
  fillSelect(el.domainFilter, "תחום", state.cards);
}

function fillSelect(selectEl, key, list) {
  const uniqueValues = [...new Set(list.map((card) => card[key]).filter(Boolean))];
  selectEl.innerHTML = `<option value="all">הכול</option>${uniqueValues
    .map((value) => `<option value="${escapeAttr(value)}">${safe(value)}</option>`)
    .join("")}`;
}

function syncUiInputsFromState() {
  el.searchInput.value = state.ui.search;
  el.viewMode.value = state.ui.viewMode;
  el.familyFilter.value = state.ui.family;
  el.domainFilter.value = state.ui.domain;
  setChipState();
}

function isCardSelected(card) {
  const code = card[FIELD_KEYS.cardCode];
  return code ? state.selectedCodes.has(String(code)) : false;
}

function updateStats(visibleCount) {
  const total = state.cards.length;
  const selected = state.cards.reduce((acc, card) => acc + (isCardSelected(card) ? 1 : 0), 0);
  el.totalCount.textContent = String(total);
  el.selectedCount.textContent = String(selected);
  el.remainingCount.textContent = String(total - selected);
  el.visibleCount.textContent = String(visibleCount);
}

function saveSelections() {
  const key = GAMES[state.currentGame]?.storage.selected;
  if (!key) return;
  localStorage.setItem(key, JSON.stringify([...state.selectedCodes]));
}

function loadSelections() {
  const key = GAMES[state.currentGame]?.storage.selected;
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    state.selectedCodes = new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    state.selectedCodes = new Set();
  }
}

function saveUiState() {
  const key = GAMES[state.currentGame]?.storage.ui;
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(state.ui));
}

function loadUiState() {
  const key = GAMES[state.currentGame]?.storage.ui;
  if (!key) return;
  const defaults = {
    search: "",
    family: "all",
    domain: "all",
    viewMode: "front",
    chosenFilter: "all",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    state.ui = { ...defaults, ...(saved || {}) };
  } catch {
    state.ui = defaults;
  }
}

function safe(value) {
  return String(value ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}
