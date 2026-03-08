import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, query, where } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig, COLLECTIONS, SESSION_ID, SESSION_DURATION_MS, INSTRUCTOR_CODE } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const sessionRef = doc(db, COLLECTIONS.sessions, SESSION_ID);

const screens = {
  locked: document.getElementById("lockedScreen"),
  form: document.getElementById("formScreen"),
  waiting: document.getElementById("waitingScreen"),
  result: document.getElementById("resultScreen")
};

const logo = document.getElementById("secretLogo");
const submitBtn = document.getElementById("submitBtn");
const nameInput = document.getElementById("studentName");
const domainSelect = document.getElementById("domain");
const resultBox = document.getElementById("resultBox");

let myId = localStorage.getItem("pairing_id") || crypto.randomUUID();
localStorage.setItem("pairing_id", myId);

function show(screen){
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[screen].classList.remove("hidden");
}

show("locked");

onSnapshot(sessionRef, snap => {
  if(!snap.exists()) return show("locked");
  const d = snap.data();
  const now = Date.now();
  if(d.started && now < d.startTime + SESSION_DURATION_MS){
    show("form");
  } else {
    show("locked");
  }
});

submitBtn.onclick = async () => {
  await setDoc(doc(db, COLLECTIONS.responses, myId), {
    id: myId,
    name: nameInput.value,
    domain: domainSelect.value,
    submittedAt: Date.now()
  });
  show("waiting");

  const q = query(collection(db, COLLECTIONS.pairs), where("members", "array-contains", myId));
  onSnapshot(q, snap => {
    if(!snap.empty){
      show("result");
      resultBox.innerText = "השותפה שלך מוכנה 🎉";
    }
  });
};

logo.onclick = () => {
  const code = prompt("קוד מדריכה");
  if(code === INSTRUCTOR_CODE) location.href = "admin.html";
};
