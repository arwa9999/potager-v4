// firebase.js — Potager v5 stable (séparation stock / parcelles)
// Gère les synchros sectionnées sans écraser d’autres données

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* === CONFIGURATION FIREBASE === */
const firebaseConfig = {
  apiKey: "AIzaSyDU2n_yXwYtFL7GrxZmHiqb6o1ihhmuBkU",
  authDomain: "potager-v4.firebaseapp.com",
  databaseURL: "https://potager-v4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "potager-v4",
  storageBucket: "potager-v4.firebasestorage.app",
  messagingSenderId: "604451790592",
  appId: "1:604451790592:web:7f9c8a43b8ab0f8e3c5de5",
  measurementId: "G-7ZWWZH18J0"
};

/* === INITIALISATION === */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Identifiant utilisateur (local unique)
const userId = localStorage.getItem("userId") || crypto.randomUUID();
localStorage.setItem("userId", userId);

console.log("🔥 Firebase initialisé — utilisateur:", userId);

/* === OUTILS === */
function sectionPath(section) {
  return `potager/${userId}/${section}`;
}

/* === ÉCRITURE (non destructive) === */
export async function syncSection(section, data) {
  try {
    await update(ref(db, `potager/${userId}`), { [section]: data });
    console.log(`✅ Section "${section}" synchronisée vers Firebase`);
  } catch (err) {
    console.error(`⚠️ Erreur de sync Firebase (${section}):`, err);
  }
}

/* === LECTURE === */
export async function loadSection(section) {
  try {
    const snap = await get(child(ref(db), sectionPath(section)));
    if (snap.exists()) {
      console.log(`☁️ Données ${section} chargées depuis Firebase`);
      return snap.val();
    } else {
      console.warn(`⚠️ Section "${section}" vide ou absente`);
      return [];
    }
  } catch (err) {
    console.error(`⚠️ Erreur de lecture Firebase (${section}):`, err);
    return [];
  }
}

/* === COMPATIBILITÉ ===
   Ces fonctions sont conservées pour app.js / stock.js
   mais redirigent vers les nouvelles versions sectionnées.
*/
export async function syncToCloud(data) {
  return syncSection("parcelles", data);
}

export async function loadFromCloud() {
  return loadSection("parcelles");
}

/* === FONCTION BONUS : tester la connexion === */
export async function testFirebaseConnection() {
  try {
    const testRef = ref(db, `potager/${userId}/_ping`);
    await set(testRef, { time: Date.now() });
    console.log("✅ Ping Firebase OK");
    return true;
  } catch (err) {
    console.error("⚠️ Erreur de connexion Firebase:", err);
    return false;
  }
}

export { db, userId };
