// ===================================================
// Code.gs — שרת המשחק לתעשיידע
// Deploy as Web App: Execute as Me, Anyone can access
// ===================================================

const SHEET_NAME = "GameState";

// ---------- MAIN ROUTER ----------

// כל הבקשות מגיעות כ-GET (JSONP) — POST מקודד עם _method=POST
function doGet(e) {
  const p      = e.parameter;
  const action = p.action;
  const cb     = p.callback; // JSONP callback name

  let result;
  try {
    // POST מקודד כ-GET
    if (p._method === "POST") {
      const group = parseInt(p.group) || 1;
      const code  = p.code || "";
      const girls = parseInt(p.girls) || 6;

      if (action === "choose")        result = chooseCard(group, code);
      else if (action === "unchoose") result = unchooseCard(group, code);
      else if (action === "reset")    result = resetGame(group, girls);
      else result = { error: "Unknown action" };

    } else {
      // GET רגיל
      const group = parseInt(p.group) || 1;
      if (action === "state")      result = getState(group);
      else if (action === "reset") result = resetGame(group, parseInt(p.girls) || 6);
      else result = { error: "Unknown action" };
    }
  } catch(err) {
    result = { error: err.message };
  }

  const json = JSON.stringify(result);

  // אם יש callback — מחזירים JSONP, אחרת JSON רגיל
  if (cb) {
    return ContentService
      .createTextOutput(cb + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// doPost נשמר לתאימות אבל לא בשימוש עם JSONP
function doPost(e) {
  return doGet(e);
}

// ---------- GAME LOGIC ----------

function getState(group) {
  const sheet = getSheet();
  const col   = group === 1 ? 1 : 2;
  const data  = sheet.getRange(1, col, 50, 1).getValues().flat().filter(v => v !== "");

  const status = data[0] || "WAITING";
  const plan   = data[1] ? JSON.parse(data[1]) : [];
  const chosen = data[2] ? JSON.parse(data[2]) : [];

  return { status, plan, chosen, group };
}

function resetGame(group, numGirls) {
  const plan = buildPlan(group, numGirls);
  if (!plan) throw new Error("לא ניתן לחלק " + numGirls + " בנות לסטים");

  const sheet = getSheet();
  const col   = group === 1 ? 1 : 2;

  sheet.getRange(1, col, 50, 1).clearContent();
  sheet.getRange(1, col).setValue("ACTIVE");
  sheet.getRange(2, col).setValue(JSON.stringify(plan));
  sheet.getRange(3, col).setValue(JSON.stringify([]));

  return { status: "ACTIVE", plan, chosen: [], group };
}

// בחירת קלף עם נעילה
function chooseCard(group, code) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch(e) { throw new Error("השרת עמוס, נסי שוב"); }

  try {
    const sheet = getSheet();
    const col   = group === 1 ? 1 : 2;
    const state = getState(group);

    if (state.status !== "ACTIVE") throw new Error("המשחק לא פעיל");

    const planCodes = getPlanCodes(group, state.plan);
    if (!planCodes.includes(code)) throw new Error("קלף לא קיים במשחק זה");
    if (state.chosen.includes(code)) throw new Error("ALREADY_TAKEN");

    const newChosen = [...state.chosen, code];
    sheet.getRange(3, col).setValue(JSON.stringify(newChosen));

    if (newChosen.length >= planCodes.length) {
      sheet.getRange(1, col).setValue("DONE");
      return { status: "DONE", plan: state.plan, chosen: newChosen, group };
    }

    return { status: "ACTIVE", plan: state.plan, chosen: newChosen, group };
  } finally {
    lock.releaseLock();
  }
}

// ביטול בחירה
function unchooseCard(group, code) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch(e) { throw new Error("השרת עמוס, נסי שוב"); }

  try {
    const sheet = getSheet();
    const col   = group === 1 ? 1 : 2;
    const state = getState(group);

    if (state.status === "DONE") throw new Error("המשחק כבר הסתיים");
    if (!state.chosen.includes(code)) throw new Error("קלף לא נבחר");

    const newChosen = state.chosen.filter(c => c !== code);
    sheet.getRange(3, col).setValue(JSON.stringify(newChosen));

    return { status: "ACTIVE", plan: state.plan, chosen: newChosen, group };
  } finally {
    lock.releaseLock();
  }
}

// ---------- HELPERS ----------

function getSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1).setValue("WAITING");
    sheet.getRange(1, 2).setValue("WAITING");
  }
  return sheet;
}

function buildPlan(group, numGirls) {
  const families = group === 1
    ? ["A","B","E","H","J","M","O","P","Q"]
    : ["C","D","F","G","I","K","L","N","R"];

  const fams = [...families].sort(() => Math.random() - 0.5);

  for (let a = 9; a >= 0; a--) {
    for (let b = 0; b <= 9 - a; b++) {
      if (3 * a + 2 * b === numGirls && a + b <= families.length) {
        const plan = [];
        for (let i = 0; i < a; i++) plan.push({ fam: fams[i],     size: 3 });
        for (let i = 0; i < b; i++) plan.push({ fam: fams[a + i], size: 2 });
        return plan;
      }
    }
  }
  return null;
}

function getPlanCodes(group, plan) {
  const allCards = CARD_DATA[group];
  const codes = [];
  plan.forEach(({ fam, size }) => {
    allCards.filter(c => c.family === fam).slice(0, size).forEach(c => codes.push(c.code));
  });
  return codes;
}

// ---------- CARD DATA ----------
const CARD_DATA = {
  1: [
    { code:"A1", family:"A" }, { code:"A2", family:"A" }, { code:"A3", family:"A" },
    { code:"B1", family:"B" }, { code:"B2", family:"B" }, { code:"B3", family:"B" },
    { code:"E1", family:"E" }, { code:"E2", family:"E" }, { code:"E3", family:"E" },
    { code:"H1", family:"H" }, { code:"H2", family:"H" }, { code:"H3", family:"H" },
    { code:"J1", family:"J" }, { code:"J2", family:"J" }, { code:"J3", family:"J" },
    { code:"M1", family:"M" }, { code:"M2", family:"M" }, { code:"M3", family:"M" },
    { code:"O1", family:"O" }, { code:"O2", family:"O" }, { code:"O3", family:"O" },
    { code:"P1", family:"P" }, { code:"P2", family:"P" }, { code:"P3", family:"P" },
    { code:"Q1", family:"Q" }, { code:"Q2", family:"Q" }, { code:"Q3", family:"Q" }
  ],
  2: [
    { code:"C1", family:"C" }, { code:"C2", family:"C" }, { code:"C3", family:"C" },
    { code:"D1", family:"D" }, { code:"D2", family:"D" }, { code:"D3", family:"D" },
    { code:"F1", family:"F" }, { code:"F2", family:"F" }, { code:"F3", family:"F" },
    { code:"G1", family:"G" }, { code:"G2", family:"G" }, { code:"G3", family:"G" },
    { code:"I1", family:"I" }, { code:"I2", family:"I" }, { code:"I3", family:"I" },
    { code:"K1", family:"K" }, { code:"K2", family:"K" }, { code:"K3", family:"K" },
    { code:"L1", family:"L" }, { code:"L2", family:"L" }, { code:"L3", family:"L" },
    { code:"N1", family:"N" }, { code:"N2", family:"N" }, { code:"N3", family:"N" },
    { code:"R1", family:"R" }, { code:"R2", family:"R" }, { code:"R3", family:"R" }
  ]
};
