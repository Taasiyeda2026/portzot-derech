import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  firebaseConfig, 
  SESSION_ID, 
  SESSION_DURATION_MS, 
  DAY_MS
} from './pairing-config.js';

import { pickBestPairs } from './pairing-algorithm.js';

// אתחול Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const sessionRef = doc(db, "sessions", SESSION_ID);
const responsesRef = collection(db, "responses");

let currentSession = null;

// מנגנון ריענון דינמי
let refreshCount = 0;
let refreshTimer = null;

// אלמנטים DOM
const progressCount = document.getElementById('progressCount');
const managementNote = document.getElementById('managementNote');
const generatePairsBtn = document.getElementById('generatePairsBtn');
const refreshProgressBtn = document.getElementById('refreshProgressBtn');
const resetSystemBtn = document.getElementById('resetSystemBtn');
const activateBtn = document.getElementById('activateBtn');
const expectedCountInput = document.getElementById('expectedCount');
const barStatus = document.getElementById('barStatus');
const pairingResult = document.getElementById('pairingResult');

// פונקציות עזר
function showOnly(id) {
  document.querySelectorAll('.container .card').forEach(c => {
    c.classList.add('hidden');
  });
  
  const targetEl = document.getElementById(id);
  if (targetEl) targetEl.classList.remove('hidden');
}

function isActiveFromData(data) {
  if (!data?.started || typeof data.startTime !== 'number') return false;
  const now = Date.now();
  const endsAt = data.startTime + SESSION_DURATION_MS;
  return now < endsAt;
}

async function countValidResponses() {
  const snap = await getDocs(responsesRef);
  const now = Date.now();
  return snap.docs
    .map(d => d.data())
    .filter(x => x.sessionId === SESSION_ID)
    .filter(x => typeof x.createdAt === 'number' && (now - x.createdAt) <= DAY_MS)
    .length;
}

async function updateManagementScreen() {
  const answersCount = await countValidResponses();
  const expected = Number(expectedCountInput.value || currentSession?.expectedCount || 0);
  
  progressCount.textContent = `${answersCount} / ${expected}`;
  
  if (expected > 0 && answersCount >= expected) {
    generatePairsBtn.classList.remove('hidden');
    managementNote.textContent = 'כולן השלימו! לחצי על "מחולל זוגות"';
  } else {
    generatePairsBtn.classList.add('hidden');
    managementNote.textContent = `ממתינה ש${expected > 0 ? expected - answersCount : ''}${expected > 0 ? ' משתתפות נוספות' : 'כל המשתתפות'} ישלימו את השאלון...`;
  }
}

// ריענון דינמי חכם
function scheduleNextRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  
  if (!currentSession || !isActiveFromData(currentSession)) {
    refreshCount = 0;
    return;
  }
  
  // חישוב זמן הריענון הבא
  let delay;
  if (refreshCount === 0) {
    delay = 45000; // 45 שניות
  } else if (refreshCount === 1) {
    delay = 30000; // 30 שניות
  } else if (refreshCount === 2) {
    delay = 15000; // 15 שניות
  } else {
    delay = 5000; // 5 שניות
  }
  
  refreshTimer = setTimeout(async () => {
    await updateManagementScreen();
    refreshCount++;
    scheduleNextRefresh();
  }, delay);
}

// האזנה לפעילות
onSnapshot(sessionRef, async (snap) => {
  if (!snap.exists()) {
    barStatus.textContent = "אין פעילות פעילה. הזיני מספר משתתפות ולחצי 'התחל פעילות'.";
    generatePairsBtn.classList.add('hidden');
    progressCount.textContent = '0 / 0';
    managementNote.textContent = 'ממתינה להתחלת פעילות...';
    currentSession = null;
    return;
  }

  const data = snap.data();
  currentSession = data;

  if (isActiveFromData(data)) {
    const now = Date.now();
    const sessionEndsAt = data.startTime + SESSION_DURATION_MS;
    const minsLeft = Math.max(0, Math.ceil((sessionEndsAt - now) / 60000));
    
    barStatus.textContent = `פעילות פעילה · נשארו ${minsLeft} דקות`;
    
    await updateManagementScreen();
    
    // התחלת ריענון אם זה עדכון ראשון
    if (!refreshTimer) {
      scheduleNextRefresh();
    }
    
    if (data.pairingReady) {
      await showPairing();
    }
    return;
  }

  barStatus.textContent = "הפעילות הסתיימה (עברו 15 דקות). אפשר לאפס את המערכת ולהתחיל מחדש.";
  generatePairsBtn.classList.add('hidden');
  managementNote.textContent = 'הפעילות הסתיימה.';
});
});

// הפעלת פעילות
activateBtn.addEventListener('click', async () => {
  const expected = Number(expectedCountInput.value || 0);
  if (expected <= 0) {
    alert('נא להזין מספר משתתפות תקין');
    return;
  }

  const startTime = Date.now();
  await setDoc(sessionRef, {
    started: true,
    startTime,
    pairingReady: false,
    expectedCount: expected,
    instructorCode: '2311',
    createdAt: serverTimestamp()
  });

  currentSession = {
    started: true,
    startTime,
    pairingReady: false,
    expectedCount: expected
  };

  barStatus.textContent = "הפעילות הופעלה!";
  
  // התחלת ריענון דינמי
  refreshCount = 0;
  scheduleNextRefresh();
});

// יצירת זוגות
generatePairsBtn.addEventListener('click', async () => {
  // עצירת הריענון האוטומטי
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  refreshCount = 0;
  
  await setDoc(sessionRef, { pairingReady: true, updatedAt: serverTimestamp() }, { merge: true });
  managementNote.textContent = "מייצר זוגות...";
});

// כפתור רענון ידני
refreshProgressBtn?.addEventListener('click', async () => {
  refreshProgressBtn.textContent = '🔄 מעדכן...';
  refreshProgressBtn.disabled = true;
  
  await updateManagementScreen();
  
  setTimeout(() => {
    refreshProgressBtn.textContent = '🔄 עדכון משתתפות';
    refreshProgressBtn.disabled = false;
  }, 500);
});

// כפתור איפוס
resetSystemBtn?.addEventListener('click', async () => {
  if (!confirm('⚠️ האם את בטוחה שאת רוצה לאפס את כל המערכת?\n\nפעולה זו תמחק:\n• את כל התשובות\n• את הפעילות הנוכחית\n• את כל הזוגות\n\nלא ניתן לבטל פעולה זו!')) {
    return;
  }
  
  resetSystemBtn.textContent = '🗑️ מאפס...';
  resetSystemBtn.disabled = true;
  
  // מחיקת כל התשובות
  const snap = await getDocs(responsesRef);
  const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  // מחיקת הסשן
  await deleteDoc(sessionRef);
  
  alert('✅ המערכת אופסה בהצלחה!');
  
  location.reload();
});

// הצגת זיווג
async function showPairing() {
  const snap = await getDocs(responsesRef);
  const now = Date.now();
  const all = snap.docs.map(d => d.data());

  const students = all
    .filter(x => x.sessionId === SESSION_ID)
    .filter(x => typeof x.createdAt === 'number' && (now - x.createdAt) <= DAY_MS);

  if (students.length < 2) {
    return;
  }

  const { pairs, trio } = pickBestPairs(students);

  pairingResult.innerHTML = "";

  pairs.forEach((p) => {
    const div = document.createElement('div');
    div.className = 'quote';
    
    const reasonsText = p.scoreData.reasons.length > 0 
      ? `<br><span style="opacity:.75;font-size:13px">${p.scoreData.reasons.slice(0, 2).join(' • ')}</span>`
      : '';
    
    div.innerHTML = `
      <strong>${p.a.displayName}</strong> ↔ <strong>${p.b.displayName}</strong><br>
      <span style="opacity:.9">תחום: ${p.a.mainDomain} · ${p.b.mainDomain}</span>${reasonsText}
    `;
    pairingResult.appendChild(div);
  });

  if (trio && pairs[trio.withPairIndex]) {
    const tDiv = document.createElement('div');
    tDiv.className = 'quote';
    const base = pairs[trio.withPairIndex];
    tDiv.innerHTML = `
      <strong>שלשה</strong><br>
      ${base.a.displayName} · ${base.b.displayName} · ${trio.lone.displayName}<br>
      <span style="opacity:.85">בכיתה עם מספר אי-זוגי - נוצרת שלשה אחת כדי לשמור על שותפות לכל משתתפת.</span>
    `;
    pairingResult.appendChild(tDiv);
  }

  showOnly('pairing');
}

// אתחול
showOnly('managementScreen');
