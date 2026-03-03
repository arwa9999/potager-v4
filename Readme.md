# 🌱 Potager – Gestion intelligente de parcelles

Application web collaborative pour la gestion d’un potager (individuel ou collectif) avec aide à la décision intégrée.

🔗 Accès en ligne : https://arwa9999.github.io/potager-v4/

---

## 🎯 Objectif du projet

Ce projet vise à créer un outil simple, visuel et structuré permettant :

* De gérer des parcelles de potager via un plan interactif
* D’enregistrer les actions (semis, plantation, récolte…)
* De conserver un historique par parcelle
* D’afficher automatiquement le compagnonnage
* De synchroniser les données en temps réel
* De fonctionner en français et néerlandais

L’outil est pensé pour être évolutif, collaboratif et pédagogique.

---

## 🚀 Fonctionnalités principales

### 🗺 Plan interactif

* Plan SVG des parcelles
* Numérotation automatique
* Sélection dynamique d’une parcelle

### 📝 Historique par parcelle

* Enregistrement des actions avec date
* Historique affiché dans le panneau latéral
* Stockage structuré par clé technique

### 🌿 Compagnonnage intelligent

* Détection automatique de la culture en place
* Affichage des cultures favorables et défavorables
* Traduction dynamique FR / NL

### 🔄 Synchronisation collaborative

* Données partagées via Firebase Realtime Database
* Mise à jour en temps réel
* Multi-utilisateur

### 🌍 Multilingue

* Interface FR / NL
* Traduction dynamique sans rechargement
* Les données stockées restent indépendantes de la langue

---

## 🧠 Architecture technique

* **Frontend** : HTML / CSS / JavaScript (vanilla)
* **Base de données** : Firebase Realtime Database
* **Hébergement** : GitHub Pages
* **Structure des cultures** : JSON structuré par clé (`key`)

---

## 📦 Structure des données

Chaque parcelle est stockée sous forme :

```json
{
  "id": 12,
  "history": [
    {
      "date": "2026-03-03",
      "action": "Semis",
      "culture": "fava"
    }
  ]
}
```

### Important :

* Les cultures sont enregistrées par **clé technique stable**
* L’affichage utilise la traduction dynamique
* Les labels ne sont jamais stockés en base

---

## 🔐 Synchronisation

Les données sont partagées entre tous les utilisateurs accédant à l’application.
Chaque modification est synchronisée automatiquement.

---

## 🌱 Philosophie du projet

Ce projet repose sur :

* La séparation entre données techniques et affichage
* Une architecture simple mais évolutive
* Une approche pédagogique du compagnonnage
* Une logique collaborative adaptée aux jardins partagés

---

## 🔮 Évolutions envisagées

* Rotation automatique des familles botaniques
* Alerte conflits entre parcelles voisines
* Visualisation saisonnière
* Export PDF du plan et historique
* Indicateur de santé des parcelles
* Dashboard de suivi annuel

---

## 📜 Licence

Projet open-source à vocation pédagogique et collaborative.

---

## 👤 Auteur

Projet développé et structuré pour la gestion intelligente d’un potager collectif.

---

🌿 *Un potager bien organisé commence par une bonne architecture.*
