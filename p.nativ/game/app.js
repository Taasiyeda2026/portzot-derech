// app.js
const MAX_CARDS_PER_SUBGROUP = 18;
const CARD_SIZE_STEPS = [168, 156, 146, 136, 126, 118, 110, 102, 96, 90, 84, 78, 72];

const setupForm = document.getElementById("setupForm");
const participantInput = document.getElementById("participantCount");
const boardArea = document.getElementById("boardArea");
const boardGrid = document.getElementById("boardGrid");
const boardPlaceholder = document.getElementById("boardPlaceholder");
const validationMessage = document.getElementById("validationMessage");
const summaryMessage = document.getElementById("summaryMessage");
const themeBadge = document.getElementById("themeBadge");

let activeCardId = null;
let currentState = null;
let resizeTimer = null;

// מחזיר מערך של גדלי תת-קבוצות, רק 2 או 3.
function computeGroups(n) {
  const participantCount = Number(n);

  if (!Number.isInteger(participantCount) || participantCount < 2) {
    return null;
  }

  let groups = [];

  if (participantCount % 3 === 0) {
    groups = Array(participantCount / 3).fill(3);
  } else if (participantCount % 3 === 1) {
    if (participantCount < 4) {
      return null;
    }

    groups = [
      ...Array(Math.floor((participantCount - 4) / 3)).fill(3),
      2,
      2
    ];
  } else {
    groups = [
      ...Array(Math.floor((participantCount - 2) / 3)).fill(3),
      2
    ];
  }

  const isValid =
    groups.every((size) => size === 2 || size === 3) &&
    groups.every((size) => size <= MAX_CARDS_PER_SUBGROUP);

  return isValid ? groups : null;
}

// בונה את אובייקטי הקלפים.
function buildCards(n) {
  return Array.from({ length: n }, (_, index) => {
    const cardNumber = index + 1;

    return {
      id: `participant-${cardNumber}`,
      front: `משתתפת #${cardNumber}`,
      back: `מידע נוסף #${cardNumber}`
    };
  });
}

// מציג את הלוח לפי תתי-הקבוצות והקלפים.
function renderBoard(groups, cards, groupMode) {
  setTheme(groupMode);
  setActiveCard(null);
  boardGrid.innerHTML = "";

  let cursor = 0;

  groups.forEach((groupSize, index) => {
    const section = document.createElement("section");
    section.className = "subgroup";

    const sectionHeader = document.createElement("div");
    sectionHeader.className = "subgroup-header";

    const title = document.createElement("h2");
    title.className = "subgroup-title";
    title.textContent = `קבוצה ${toAlphabeticLabel(index)}`;

    const meta = document.createElement("span");
    meta.className = "subgroup-meta";
    meta.textContent = `${groupSize} משתתפות`;

    sectionHeader.appendChild(title);
    sectionHeader.appendChild(meta);

    const cardsGrid = document.createElement("div");
    cardsGrid.className = "subgroup-cards";

    const currentCards = cards.slice(cursor, cursor + groupSize);
    cursor += groupSize;

    currentCards.forEach((card, cardIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card";
      button.dataset.cardId = card.id;
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `${card.front}, לחצי כדי להפוך את הכרטיס`);

      const inner = document.createElement("span");
      inner.className = "card-inner";

      const front = document.createElement("span");
      front.className = "card-face card-front";
      front.innerHTML = `
        <span class="card-chip">${toAlphabeticLabel(index)}-${cardIndex + 1}</span>
        <strong class="card-title">${card.front}</strong>
        <span class="card-copy">לחצי להצגת הצד האחורי</span>
      `;

      const back = document.createElement("span");
      back.className = "card-face card-back";
      back.innerHTML = `
        <span class="card-chip">מידע נוסף</span>
        <strong class="card-title">${card.back}</strong>
        <span class="card-copy">לחיצה נוספת תחזיר את הכרטיס</span>
      `;

      inner.appendChild(front);
      inner.appendChild(back);
      button.appendChild(inner);
      cardsGrid.appendChild(button);
    });

    section.appendChild(sectionHeader);
    section.appendChild(cardsGrid);
    boardGrid.appendChild(section);
  });

  boardGrid.classList.remove("is-hidden");
  hidePlaceholder();

  const layoutFits = applyLayoutGuard();

  if (!layoutFits) {
    showPlaceholder("המסך קטן מדי להצגה ללא גלילה", true);
    boardGrid.classList.add("is-hidden");
    return;
  }

  hidePlaceholder();
}

// מנסה להקטין את הקלפים עד שאין גלילה. אם לא מצליח – מחזיר false.
function applyLayoutGuard() {
  const root = document.documentElement;

  if (!boardGrid.children.length) {
    return true;
  }

  for (const size of CARD_SIZE_STEPS) {
    root.style.setProperty("--card-size", `${size}px`);

    // כופה חישוב מחדש של ה-layout לפני בדיקת overflow.
    void document.body.offsetHeight;

    const hasOverflow =
      document.documentElement.scrollHeight > window.innerHeight ||
      document.documentElement.scrollWidth > window.innerWidth;

    if (!hasOverflow) {
      return true;
    }
  }

  return false;
}

// מטפל בקליק על כרטיס.
function handleCardClick(cardButton) {
  if (!cardButton) {
    return;
  }

  const { cardId } = cardButton.dataset;
  const nextId = activeCardId === cardId ? null : cardId;

  setActiveCard(nextId);
}

// מוודא שרק כרטיס אחד פעיל בכל רגע.
function setActiveCard(id) {
  if (activeCardId) {
    const previousCard = boardGrid.querySelector(`[data-card-id="${activeCardId}"]`);

    if (previousCard) {
      previousCard.classList.remove("is-active");
      previousCard.setAttribute("aria-expanded", "false");
      previousCard.setAttribute("aria-pressed", "false");
    }
  }

  activeCardId = id;

  if (!activeCardId) {
    return;
  }

  const nextCard = boardGrid.querySelector(`[data-card-id="${activeCardId}"]`);

  if (nextCard) {
    nextCard.classList.add("is-active");
    nextCard.setAttribute("aria-expanded", "true");
    nextCard.setAttribute("aria-pressed", "true");
  }
}

// מעדכן את ערכת הצבעים לפי groupMode.
function setTheme(groupMode) {
  const normalizedMode = groupMode === "group2" ? "group2" : "group1";
  document.body.dataset.theme = normalizedMode;
  themeBadge.textContent = `מצב פעיל: ${normalizedMode === "group2" ? "קבוצה 2" : "קבוצה 1"}`;
}

// יוצר תווית A, B, C... וגם AA, AB אם צריך.
function toAlphabeticLabel(index) {
  let value = index + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function getSelectedGroupMode() {
  const checked = setupForm.querySelector('input[name="groupMode"]:checked');
  return checked ? checked.value : "group1";
}

function showValidation(message) {
  validationMessage.textContent = message;
  validationMessage.classList.remove("is-hidden");
}

function hideValidation() {
  validationMessage.textContent = "";
  validationMessage.classList.add("is-hidden");
}

function updateSummary(groups, participantCount) {
  const groupCount = groups.length;
  const distribution = groups.join(" • ");
  summaryMessage.textContent = `סה״כ ${participantCount} משתתפות • ${groupCount} תתי-קבוצות • חלוקה: ${distribution}`;
}

function resetBoard(message = "בחרי מצב קבוצה, הזיני מספר משתתפות ולחצי על “צור לוח”.", isError = false) {
  boardGrid.innerHTML = "";
  boardGrid.classList.add("is-hidden");
  setActiveCard(null);
  showPlaceholder(message, isError);
}

function showPlaceholder(message, isError = false) {
  boardPlaceholder.classList.remove("is-hidden");
  boardPlaceholder.classList.toggle("error", isError);

  const strong = isError ? "לא ניתן להציג את הלוח" : "הלוח עדיין לא נבנה";
  boardPlaceholder.innerHTML = `
    <div class="placeholder-card">
      <strong>${strong}</strong>
      <span>${message}</span>
    </div>
  `;
}

function hidePlaceholder() {
  boardPlaceholder.classList.add("is-hidden");
}

function validateParticipantCount(rawValue) {
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed)) {
    return "יש להזין מספר שלם של משתתפות.";
  }

  if (parsed < 2) {
    return "יש להזין לפחות 2 משתתפות.";
  }

  return "";
}

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  hideValidation();

  const groupMode = getSelectedGroupMode();
  const countValue = participantInput.value.trim();
  const validationError = validateParticipantCount(countValue);

  if (validationError) {
    currentState = null;
    summaryMessage.textContent = "לא נבנה לוח. תקני את הנתונים ונסי שוב.";
    showValidation(validationError);
    resetBoard("יש לתקן את הנתונים לפני יצירת הלוח.", true);
    return;
  }

  const participantCount = Number(countValue);
  const groups = computeGroups(participantCount);

  if (!groups) {
    currentState = null;
    summaryMessage.textContent = "לא נבנה לוח.";
    showValidation("לא ניתן לחלק את המשתתפות תחת המגבלות.");
    resetBoard("לא ניתן לחלק את המשתתפות תחת המגבלות.", true);
    return;
  }

  const cards = buildCards(participantCount);

  currentState = {
    groupMode,
    participantCount,
    groups,
    cards
  };

  updateSummary(groups, participantCount);
  renderBoard(groups, cards, groupMode);
});

setupForm.addEventListener("change", (event) => {
  const target = event.target;

  if (target && target.name === "groupMode") {
    setTheme(getSelectedGroupMode());

    if (currentState) {
      currentState.groupMode = getSelectedGroupMode();
      renderBoard(currentState.groups, currentState.cards, currentState.groupMode);
    }
  }
});

boardArea.addEventListener("click", (event) => {
  const cardButton = event.target.closest(".card");

  if (cardButton) {
    handleCardClick(cardButton);
    return;
  }

  // בונוס: לחיצה על רקע הלוח סוגרת כרטיס פתוח.
  if (event.target.closest("#boardGrid")) {
    setActiveCard(null);
  }
});

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    if (!currentState) {
      return;
    }

    renderBoard(currentState.groups, currentState.cards, currentState.groupMode);
  }, 120);
});

// מצב פתיחה
setTheme(getSelectedGroupMode());
resetBoard();
