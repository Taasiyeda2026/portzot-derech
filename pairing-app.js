import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { 
  firebaseConfig, 
  SESSION_ID, 
  SESSION_DURATION_MS, 
  DAY_MS, 
  DEVICE_ID_KEY,
  VALID_CODE
} from './pairing-config.js';

// אתחול Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const sessionRef = doc(db, "sessions", SESSION_ID);
const responsesRef = collection(db, "responses");

// זיהוי מכשיר
const deviceId = localStorage.getItem(DEVICE_ID_KEY) || crypto.randomUUID();
localStorage.setItem(DEVICE_ID_KEY, deviceId);

let sessionEndsAt = 0;

// אלמנטים DOM
const logoImg = document.getElementById('logoImg');
const startBtn = document.getElementById('startBtn');
const waitTextElement = document.querySelector('p[style*="font-size:20px"]');
const displayName = document.getElementById('displayName');

// משתנה אחסון בחירות
const selections = {};

// האזנה לבחירות
document.querySelectorAll('.choice-group').forEach(group => {
  const field = group.dataset.field;
  group.querySelectorAll('.choice').forEach(ch => {
    ch.addEventListener('click', () => {
      group.querySelectorAll('.choice').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      selections[field] = ch.textContent.trim();
    });
  });
});

// פונקציות עזר
function showOnly(id) {
  document.querySelectorAll('.container .card').forEach(c => {
    c.classList.add('hidden');
  });
  
  const targetEl = document.getElementById(id);
  if (targetEl) targetEl.classList.remove('hidden');
}

function setStartEnabled(enabled) {
  if (enabled) {
    // כשהמדריכה מפעילה - מסתירים את הטקסט ומראים את הכפתור
    if (waitTextElement) waitTextElement.style.display = 'none';
    startBtn.style.display = 'inline-block';
    startBtn.classList.remove('hidden');
    startBtn.classList.remove('start-animate');
    requestAnimationFrame(() => startBtn.classList.add('start-animate'));
  } else {
    // כשעוד לא התחילה - מראים את הטקסט ומסתירים את הכפתור
    if (waitTextElement) waitTextElement.style.display = 'block';
    startBtn.style.display = 'none';
    startBtn.classList.add('hidden');
  }
}

function resetToWaiting() {
  setStartEnabled(false);
  showOnly('introScreen');
}

function isActiveFromData(data) {
  if (!data?.started || typeof data.startTime !== 'number') return false;
  const now = Date.now();
  const endsAt = data.startTime + SESSION_DURATION_MS;
  return now < endsAt;
}

// לחיצה על הלוגו - מקפיץ חלון קוד ועובר ל-admin.html
if (logoImg) {
  logoImg.addEventListener('click', () => {
    const code = prompt('הזיני קוד מדריכה:');
    
    if (!code) {
      return; // ביטול
    }
    
    if (code.trim() !== VALID_CODE) {
      alert('❌ קוד שגוי. נסי שוב.');
      return;
    }
    
    // קוד נכון - מעביר ל-admin.html
    window.location.href = 'admin.html';
  });
}

// האזנה לפעילות
onSnapshot(sessionRef, (snap) => {
  if (!snap.exists()) {
    resetToWaiting();
    return;
  }

  const data = snap.data();

  if (isActiveFromData(data)) {
    sessionEndsAt = data.startTime + SESSION_DURATION_MS;
    setStartEnabled(true);
    
    if (data.pairingReady) {
      showPairing();
    }
    return;
  }

  resetToWaiting();
});

// ניווט בין שלבים
window.next = (n) => {
  const requiredFields = {
    2: ['mainDomain', 'secondDomain'],
    3: ['workStyle', 'teamStyle', 'workPace'],
    4: ['teamRole', 'motivationSource'],
    5: ['pressureResponse', 'conflictStyle', 'communicationStyle', 'lifeInterest']
  };
  
  if (requiredFields[n]) {
    const missing = requiredFields[n].filter(k => !selections[k]);
    if (missing.length) {
      alert('נא לענות על כל השאלות לפני המשך');
      return;
    }
  }
  
  if (!displayName.value.trim() && n === 2) {
    alert('נא למלא שם או כינוי');
    return;
  }
  
  showOnly('step' + n);
};

// התחלת שאלון
startBtn.addEventListener('click', () => {
  if (sessionEndsAt && Date.now() > sessionEndsAt) {
    alert('הזמן נגמר! הפעילות הסתיימה.');
    resetToWaiting();
    return;
  }
  showOnly('step1');
});

// סיום שאלון
window.finish = async () => {
  if (!displayName.value.trim()) {
    alert('כתבי שם פרטי/כינוי כדי שתוכלי לזהות את עצמך במסך החיבורים.');
    return;
  }

  const required = [
    'mainDomain', 'secondDomain', 'workStyle', 'teamStyle', 'workPace',
    'teamRole', 'motivationSource', 'pressureResponse', 'conflictStyle',
    'communicationStyle', 'lifeInterest', 'importanceLevel'
  ];
  
  const missing = required.filter(k => !selections[k]);
  if (missing.length) {
    alert('נא לענות על כל השאלות לפני סיום.');
    return;
  }

  if (sessionEndsAt && Date.now() > sessionEndsAt) {
    alert('הזמן נגמר! לא ניתן לשלוח תשובות.');
    resetToWaiting();
    return;
  }

  const payload = {
    sessionId: SESSION_ID,
    deviceId,
    displayName: displayName.value.trim(),
    mainDomain: selections.mainDomain,
    secondDomain: selections.secondDomain,
    workStyle: selections.workStyle,
    teamStyle: selections.teamStyle,
    workPace: selections.workPace,
    teamRole: selections.teamRole,
    motivationSource: selections.motivationSource,
    pressureResponse: selections.pressureResponse,
    conflictStyle: selections.conflictStyle,
    communicationStyle: selections.communicationStyle,
    lifeInterest: selections.lifeInterest,
    importanceLevel: selections.importanceLevel,
    createdAt: Date.now(),
    expiresAt: new Date(Date.now() + DAY_MS)
  };

  await setDoc(doc(responsesRef, crypto.randomUUID()), payload);
  showOnly('waiting');
};

// הצגת זיווג
async function showPairing() {
  showOnly('thinking');
  await new Promise(r => setTimeout(r, 5000));

  const snap = await getDocs(responsesRef);
  const now = Date.now();
  const all = snap.docs.map(d => d.data());

  const students = all
    .filter(x => x.sessionId === SESSION_ID)
    .filter(x => typeof x.createdAt === 'number' && (now - x.createdAt) <= DAY_MS);

  if (students.length < 2) {
    resetToWaiting();
    return;
  }

  // מציאת השותפה שלי
  const me = students.find(s => s.deviceId === deviceId);
  if (!me) {
    resetToWaiting();
    return;
  }

  // כאן צריך לקרוא את הזוגות מ-Firebase אבל בינתיים נראה הודעה פשוטה
  const pairingResult = document.getElementById('pairingResult');
  pairingResult.innerHTML = `
    <div class="quote">
      <h2>תודה שהשלמת!</h2>
      <p>המדריכה תייצר את הזוגות בקרוב.</p>
      <p>השותפה שלך תופיע כאן.</p>
    </div>
  `;

  showOnly('pairing');
}

// אתחול
resetToWaiting();
