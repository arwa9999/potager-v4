# 🌱 Potager – Gestion intelligente de parcelles

Application web collaborative pour la gestion d’un potager individuel ou collectif, avec plan interactif, historique par parcelle, compagnonnage, gestion de stock et outils d’aide à la décision.

**Accès en ligne :**  
https://arwa9999.github.io/potager-v4/

---

## 🎯 Objectif du projet

Ce projet vise à créer un outil simple, visuel et structuré permettant de :

- gérer un potager à partir d’un **plan interactif**
- enregistrer les actions réalisées sur chaque parcelle
- conserver un **historique détaillé**
- visualiser les cultures en place et leur **compagnonnage**
- gérer un **stock de semences, plants et bulbes**
- partager les données entre plusieurs utilisateurs
- fonctionner en **français et en néerlandais**

L’outil est pensé pour être :

- **évolutif**
- **collaboratif**
- **pédagogique**
- **utilisable en jardin partagé**

---

## 🚀 Fonctionnalités principales

### 🗺 Plan interactif

- plan SVG des parcelles
- numérotation automatique des parcelles
- ouverture d’un panneau latéral au clic
- affichage dynamique des informations liées à la parcelle sélectionnée

### 📝 Historique par parcelle

Chaque parcelle possède un historique structuré des actions réalisées :

- semis
- plantation
- récolte
- arrachage
- engrais

Chaque entrée peut inclure :

- date
- culture
- famille botanique
- variété utilisée
- quantité utilisée

### 🌿 Compagnonnage intelligent

Le système analyse les cultures actuellement en place dans une parcelle et affiche :

- les cultures compatibles
- les cultures à éviter
- les recommandations dans la langue de l’interface

Le compagnonnage est basé sur des **clés techniques stables**, indépendantes des libellés affichés.

### 📦 Gestion du stock

Le projet intègre un module de stock permettant de gérer :

- semences
- plants
- bulbes

Chaque article peut contenir :

- nom affiché
- clé technique de culture
- variété
- quantité
- unité
- type
- année
- durée de viabilité
- seuil bas
- source
- notes

Deux modes sont disponibles :

- **📦 gestion du stock** : ajout, modification, suppression
- **📋 état du stock** : vue de consultation rapide pour savoir ce qui est disponible, faible, épuisé ou à remplacer

### 🔁 Mise à jour automatique du stock

Lorsqu’un **semis** ou une **plantation** est encodé dans une parcelle, l’application peut :

- retrouver l’article concerné dans le stock
- prendre en compte la variété si elle est précisée
- décrémenter automatiquement la quantité utilisée

### 🎯 Filtres visuels sur le plan

Le bandeau supérieur permet de mettre les parcelles en évidence selon :

- une action
- une culture
- une période
- un état / une tâche

Les parcelles peuvent ainsi être colorées pour visualiser rapidement :

- les semis
- les plantations
- les récoltes
- les arrachages
- les parcelles encore occupées
- les parcelles vides
- les zones à surveiller

### 🌍 Interface multilingue

- français / néerlandais
- traduction dynamique sans rechargement
- séparation claire entre :
  - données techniques stockées
  - libellés visibles par l’utilisateur

### 🔄 Synchronisation collaborative

Les données sont partagées via **Firebase Realtime Database** :

- synchronisation automatique
- mise à jour en temps réel
- usage multi-utilisateur
- fonctionnement adapté à un potager collectif

---

## 🧠 Architecture technique

- **Frontend** : HTML / CSS / JavaScript vanilla
- **Base de données** : Firebase Realtime Database
- **Hébergement** : GitHub Pages
- **Données cultures** : JSON structuré par clé technique
- **Plan** : SVG interactif

---

## 📦 Structure des données

### Parcelles

Chaque parcelle est stockée sous forme structurée :

```json
{
  "id": 12,
  "history": [
    {
      "date": "2026-03-03",
      "action": "Semis",
      "culture": "fava",
      "family": "fabaceae",
      "usedVariety": "aguadulce",
      "usedQty": 0.5
    }
  ]
}
```
---

### Stock

Le stock repose sur une structure de type :

```json
{
  "id": "uuid",
  "name": "Fenouil bronze",
  "cultureKey": "fennel",
  "variety": "bronze",
  "qty": 1,
  "unit": "sachet",
  "type": "semence",
  "year": 2025,
  "viabilityYears": 2,
  "lowStockThreshold": 0.5,
  "source": "semaille.com",
  "notes": ""
}

```
---

🌱 Philosophie du projet

Le projet repose sur plusieurs principes :

séparer les données métier et l’affichage
construire une base simple mais solide
favoriser la lisibilité et l’usage concret sur le terrain
proposer une logique compatible avec les jardins partagés
garder une approche pédagogique autour :
des cultures
du compagnonnage
de la rotation
du suivi saisonnier
👥 Usages visés

L’application peut être utilisée pour :

un potager individuel
un jardin collectif
un projet de quartier
un usage pédagogique
un support de suivi pour bénévoles ou habitants

Elle permet à une personne de saisir les données, mais aussi à d’autres de :

consulter l’état des parcelles
voir ce qui est en place
vérifier le stock disponible
identifier les tâches restantes

---

## 📜 Licence

Projet open-source à vocation pédagogique et collaborative.

---

## 👤 Auteur

Projet développé et structuré pour la gestion intelligente d’un potager collectif.

---

🌿 *Un potager bien organisé commence par une bonne architecture.*
