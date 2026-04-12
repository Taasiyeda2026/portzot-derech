const MAX_SUBGROUP_SIZE = 18;
const MIN_CARD_SIZE = 76;
const CARD_SHRINK_STEP = 8;
const DEFAULT_CARD_SIZE = 170;

const state = {
  activeCardId: null,
};

const elements = {
  body: document.body,
  form: document.getElementById("setup-form"),
  participantsInput: document.getElementById("participants"),
  feedback: document.getElementById("feedback"),
  boardWrapper: document.getElementById("board-wrapper"),
  cardTemplate: document.getElementById("card-template"),
};

init();

function init() {
  elements.form.addEventListener("submit", onSubmit);
  window.addEventListener("resize", () => {
    const board = getBoard();
    if (board && board.childElementCount > 0) {
      applyLayoutGuard();
    }
  });

  renderFromForm();
}

function onSubmit(event) {
  event.preventDefault();
  renderFromForm();
}

function renderFromForm() {
  const groupMode = elements.form.groupMode.value;
  elements.body.dataset.theme = groupMode;

  const n = Number(elements.participantsInput.value);
  if (!Number.isInteger(n) || n < 2) {
    showFeedback("יש להזין מספר משתתפות תקין (2 ומעלה).", true);
    clearBoard();
    return;
  }

  const groups = computeGroups(n);
  if (!groups) {
    showFeedback("לא ניתן לחלק את המשתתפות תחת המגבלות", true);
    clearBoard();
    return;
  }

  const cards = buildCards(n);
  ensureBoard();
  renderBoard(groups, cards, groupMode);

  showFeedback(
    `נוצרו ${n} כרטיסים, מחולקים ל-${groups.length} תתי-קבוצות: ${groups.join(", ")}.`,
    false
  );

  applyLayoutGuard();
}

// חלוקה לקבוצות של 2/3 בלבד, תוך שמירה על מגבלת 18.
function computeGroups(n) {
  if (!Number.isInteger(n) || n < 2) {
    return null;
  }

  let groups = [];
  const remainder = n % 3;

  if (remainder === 0) {
    groups = Array(n / 3).fill(3);
  } else if (remainder === 1) {
    if (n < 4) return null;
    groups = Array((n - 4) / 3).fill(3);
    groups.push(2, 2);
  } else {
    groups = Array((n - 2) / 3).fill(3);
    groups.push(2);
  }

  const valid = groups.every((size) => size >= 2 && size <= 3 && size <= MAX_SUBGROUP_SIZE);
  return valid ? groups : null;
}

function buildCards(n) {
  return Array.from({ length: n }, (_, index) => ({
    id: index + 1,
    front: `משתתפת #${index + 1}`,
    back: `מידע נוסף #${index + 1}`,
  }));
}

function renderBoard(groups, cards) {
  const board = getBoard();
  board.innerHTML = "";
  state.activeCardId = null;

  const titles = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let cardIndex = 0;

  groups.forEach((groupSize, groupIdx) => {
    const subgroup = document.createElement("section");
    subgroup.className = "subgroup";

    const heading = document.createElement("h2");
    heading.textContent = `קבוצה ${titles[groupIdx] || groupIdx + 1}`;
    subgroup.appendChild(heading);

    const cardsGrid = document.createElement("div");
    cardsGrid.className = "cards-grid";

    for (let i = 0; i < groupSize; i += 1) {
      const cardData = cards[cardIndex];
      cardIndex += 1;

      const cardNode = elements.cardTemplate.content.firstElementChild.cloneNode(true);
      cardNode.dataset.cardId = String(cardData.id);
      cardNode.querySelector(".card-front").textContent = cardData.front;
      cardNode.querySelector(".card-back").textContent = cardData.back;

      cardNode.addEventListener("click", (event) => {
        event.stopPropagation();
        handleCardClick(cardData.id);
      });

      cardNode.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardClick(cardData.id);
        }
      });

      cardsGrid.appendChild(cardNode);
    }

    subgroup.appendChild(cardsGrid);
    board.appendChild(subgroup);
  });
}

function applyLayoutGuard() {
  const board = getBoard();
  const root = document.documentElement;
  root.style.setProperty("--cardSize", `${DEFAULT_CARD_SIZE}px`);

  let cardSize = DEFAULT_CARD_SIZE;
  for (let i = 0; i < 15; i += 1) {
    const hasOverflow = root.scrollHeight > window.innerHeight || root.scrollWidth > window.innerWidth;

    if (!hasOverflow) {
      board.hidden = false;
      return true;
    }

    cardSize -= CARD_SHRINK_STEP;
    if (cardSize < MIN_CARD_SIZE) {
      break;
    }

    root.style.setProperty("--cardSize", `${cardSize}px`);
  }

  elements.boardWrapper.innerHTML = '<div class="layout-error">המסך קטן מדי להצגה ללא גלילה</div>';
  showFeedback("המסך קטן מדי להצגה ללא גלילה", true);
  return false;
}

function handleCardClick(cardId) {
  setActiveCard(cardId === state.activeCardId ? null : cardId);
}

function setActiveCard(cardId) {
  state.activeCardId = cardId;

  const board = getBoard();
  if (!board) return;

  board.querySelectorAll(".card").forEach((cardEl) => {
    const currentId = Number(cardEl.dataset.cardId);
    const active = cardId !== null && currentId === cardId;
    cardEl.classList.toggle("active", active);
    cardEl.setAttribute("aria-pressed", String(active));
  });
}

function onBoardClick(event) {
  if (event.target.closest(".card")) {
    return;
  }
  setActiveCard(null);
}

function clearBoard() {
  ensureBoard();
  getBoard().innerHTML = "";
  state.activeCardId = null;
}

function ensureBoard() {
  elements.boardWrapper.innerHTML = '<div id="board" class="board"></div>';
  const board = getBoard();
  board.addEventListener("click", onBoardClick);
  return board;
}

function getBoard() {
  return document.getElementById("board");
}

function showFeedback(message, isError) {
  elements.feedback.textContent = message;
  elements.feedback.classList.toggle("error", Boolean(isError));
}
