// firebase.js — Potager partagé (multi-utilisateur)
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child, 
  onValue 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU2n_yXwYtFL7GrxZmHiqb6o1ihhmuBkU",
  authDomain: "potager-v4.firebaseapp.com",
  databaseURL: "https://potager-v4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "potager-v4",
  storageBucket: "potager-v4.firebasestorage.app",
  messagingSenderId: "604451790592",
  appId: "1:604451790592:web:7f9c8a43b8ab0f8e3c5de5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInAnonymously(auth)
  .then(() => {
    console.log("🔐 Auth anonyme OK");
  })
  .catch(error => {
    console.error("Erreur auth :", error);
  });
const db = getDatabase(app);

/* ==========================================================
   🌱 SECTION PARTAGÉE UNIQUE
   ========================================================== */

const BASE_PATH = "potager/shared";

/* ==========================================================
   🔁 ÉCRITURE
   ========================================================== */

export async function syncSection(sectionName, data) {
  try {
    await set(ref(db, `${BASE_PATH}/${sectionName}`), data);
    console.log(`✅ Section "${sectionName}" synchronisée`);
  } catch (err) {
    console.error("⚠️ Erreur sync:", err);
  }
}

/* ==========================================================
   📥 LECTURE SIMPLE
   ========================================================== */

export async function loadSection(sectionName) {
  try {
    const snapshot = await get(child(ref(db), `${BASE_PATH}/${sectionName}`));
    if (!snapshot.exists()) return null;
    return snapshot.val();
  } catch (err) {
    console.error("⚠️ Erreur lecture:", err);
    return null;
  }
}

/* ==========================================================
   🔄 SYNCHRO TEMPS RÉEL (optionnelle mais recommandée)
   ========================================================== */

export function listenSection(sectionName, callback) {
  const sectionRef = ref(db, `${BASE_PATH}/${sectionName}`);
  onValue(sectionRef, snapshot => {
    callback(snapshot.val());
  });
}

console.log("🔥 Firebase initialisé — mode partagé");
