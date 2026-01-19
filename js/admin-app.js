import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, deleteDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig, COLLECTIONS, SESSION_ID } from "./config.js";
import { generatePairs, getPairingStats } from "./pairing-algorithm.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const status = document.getElementById("adminStatus");

document.getElementById("startSession").onclick = async () => {
  await setDoc(doc(db, COLLECTIONS.sessions, SESSION_ID), {
    started: true,
    startTime: Date.now()
  });
  status.innerText = "הפעילות פתוחה";
};

document.getElementById("generatePairs").onclick = async () => {
  const snap = await getDocs(collection(db, COLLECTIONS.responses));
  const responses = snap.docs.map(d => d.data());
  const pairs = generatePairs(responses);
  for(const p of pairs){
    await setDoc(doc(db, COLLECTIONS.pairs, p.id), p);
  }
  const stats = getPairingStats(pairs);
  status.innerText = `נוצרו ${stats.pairs} זוגות, ${stats.triples} שלשות | ניקוד ממוצע: ${stats.avgScore}`;
};

document.getElementById("resetSystem").onclick = async () => {
  await deleteDoc(doc(db, COLLECTIONS.sessions, SESSION_ID));
  status.innerText = "איפוס בוצע";
};
