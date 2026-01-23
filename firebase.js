// firebase.js — Potager v5 (sécurisé + sync bidirectionnelle)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Identifiant utilisateur (persistant localement)
const userId = localStorage.getItem("userId") || crypto.randomUUID();
localStorage.setItem("userId", userId);

/* ==========================================================
   🔁 API Firebase générique (lecture / écriture par section)
   ========================================================== */

export async function syncSection(sectionName, data) {
  try {
    await update(ref(db, `potager/${userId}`), { [sectionName]: data });
    console.log(`✅ Section "${sectionName}" synchronisée vers Firebase`);
  } catch (err) {
    console.error(`⚠️ Erreur sync section ${sectionName}:`, err);
  }
}

export async function loadSection(sectionName) {
  try {
    const snapshot = await get(child(ref(db), `potager/${userId}/${sectionName}`));
    if (!snapshot.exists()) {
      console.log(`ℹ️ Section "${sectionName}" inexistante — renvoie []`);
      return [];
    }
    return snapshot.val();
  } catch (err) {
    console.error(`⚠️ Erreur de lecture section ${sectionName}:`, err);
    return [];
  }
}

/* === Compatibilité ancienne API === */
export async function syncToCloud(data) {
  await syncSection("parcelles", data);
}
export async function loadFromCloud() {
  return await loadSection("parcelles");
}

console.log("🔥 Firebase initialisé — utilisateur:", userId);
