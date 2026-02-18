# Projet EQ7 – Simulation Boursière

# Table des matières

1. [Description du projet](#1-description-du-projet)  
2. [Technologies utilisées](#2-technologies-utilisées)  
3. [Plan de travail en équipe](#3-plan-de-travail-en-équipe)  
4. [Conclusion](#4-conclusion)  

---

# 1. Description du projet

Le **Simulateur Boursier EQ7** est une application web permettant de reproduire le fonctionnement d’un marché financier réel dans un environnement virtuel et sans risque.

L’objectif principal est de permettre aux utilisateurs de :

- S’initier à l’investissement boursier  
- Comprendre les mécanismes de variation des prix  
- Tester différentes stratégies d’investissement  
- Expérimenter sans exposer de capital réel  

---

## 1.1 L’équipe

### Membres

- **Alwafa Altawil**
- **Zachary Legros**
- **Bruno Kwan-Teau**
- **Vlad Gaita**

### Rôles et responsabilités

- **Alwafa Altawil** – Développement *Frontend* (interface utilisateur, design, intégration React)  
- **Zachary Legros** – Développement *Backend* (logique applicative, API, gestion des utilisateurs)  
- **Bruno Kwan-Teau** – Développement *Backend* (algorithmes mathématiques, simulation Monte-Carlo)  
- **Vlad Gaita** – Développement *Frontend* (interface utilisateur, intégration des graphiques TradingView)  

---

## 1.2 L’idée

### Problématique

Investir en bourse comporte des risques importants. Une erreur peut entraîner des pertes financières significatives.  

**Comment développer son expérience en investissement sans risquer son argent réel ?**

### Objectifs

- Développer une plateforme web simulant un marché boursier
- Permettre l’achat et la vente d’actions virtuelles
- Intégrer une simulation basée sur la méthode de Monte-Carlo
- Offrir des outils d’analyse de performance

---

## 1.3 L’utilité

### À quoi sert l’application ?

- Pratiquer l’investissement sans risque financier
- Comprendre les concepts de rendement et de volatilité
- Apprendre la gestion de portefeuille
- Tester différentes stratégies d’investissement

### Problème réel résolu

Le projet répond au besoin d’apprentissage pratique en finance sans exposition au risque monétaire réel.

---

## 1.4 L’innovation

### Nouveautés

- Simulation du marché basée sur la méthode **Monte-Carlo**
- Système de nouvelles économiques simulées influençant les prix
- Visualisation en temps réel avec graphiques interactifs (TradingView)

### Valeur ajoutée

Le simulateur permet de :

- Comprendre les mécanismes probabilistes des marchés
- Observer l’impact du risque sur le rendement
- Expérimenter des stratégies mathématiques

---

## 1.5 Cas d’utilisation

### Acteurs

- Utilisateurs
- Administrateurs
- API

### Scénario principal

Un étudiant crée un compte, reçoit un capital virtuel initial, consulte les actions disponibles, effectue des transactions, puis analyse la performance de son portefeuille.

---

## 1.6 Public cible

- Étudiants en informatique, finance ou économie
- Débutants en investissement
- Enseignants souhaitant illustrer des concepts financiers

---

## 1.7 Liens avec les autres matières

### Informatique

- Développement Web (Frontend / Backend)
- API REST
- Bases de données
- Architecture logicielle
- Sécurité et authentification

### Mathématiques

- Simulation Monte-Carlo
- Statistiques et probabilités
- Modèles stochastiques
- Intérêts composés
- Analyse du risque

### Sciences

- Économie (offre et demande)
- Finance (diversification, gestion du risque)
- Psychologie (prise de décision sous incertitude)

---

# 2. Technologies utilisées

## 2.1 Outils et environnements

### Outils

- VS Code  
- PyCharm  
- GitHub (gestion de versions)  
- Microsoft Teams (communication)

### Base de données

- MongoDB  

### Frontend

- JavaScript  
- React  
- TradingView Charts  

### Backend

- Python  
- Django  
- Django REST Framework (DRF)  

---

## 2.2 Justification des choix

- **Python** : Librairies puissantes pour Monte-Carlo et statistiques (*numpy, pandas, scipy*)  
- **Django** : Gestion intégrée des utilisateurs, authentification et base de données  
- **React** : Interface dynamique et mise à jour en temps réel  
- **VS Code** : Idéal pour JavaScript et Git  
- **PyCharm** : Optimisé pour Python et Django  

---

## 2.3 Défis et difficultés

### Nouveaux outils

- Apprentissage de Django (Python)
- Apprentissage de React (JavaScript)

### Contraintes techniques

- Communication Backend (Python) / Frontend (JavaScript)
- Gestion des API et des erreurs

### Gestion des données

- Récupération et traitement de données boursières
- Nettoyage des données
- Données parfois limitées

### Complexité mathématique

- Modélisation statistique (volatilité, rendements)
- Calculs Monte-Carlo coûteux en performance

### Visualisation

- Affichage clair de nombreux scénarios
- Expérience utilisateur fluide

### Contraintes

- 15 semaines de développement
- Équipe de 4 personnes
- Limitations de performance

---

# 3. Plan de travail en équipe

## 3.1 Échéancier

Un diagramme de Gantt a été réalisé afin de planifier :

- Analyse des besoins
- Conception
- Développement Backend
- Développement Frontend
- Intégration
- Tests
- Présentation finale

---

## 3.2 Analyse du projet

### Enjeux

- Complexité de la simulation Monte-Carlo
- Création complète d’un site web
- Gestion d’un grand volume de données
- Système d’authentification et stockage des comptes

### Contraintes

- Temps limité (15 semaines)
- Calculs optimisés obligatoires
- Petite équipe

---

## 3.3 Modélisation UML


- Diagramme de séquence
- Diagramme des cas d’utilisation

---

## 3.4 Vues

---

# 4. Conclusion

## Résumé

Le projet **Simulateur Boursier EQ7** est une application complète combinant :

- Informatique
- Mathématiques
- Finance

Il permet de mettre en pratique des compétences techniques avancées tout en répondant à un besoin réel d’apprentissage financier.

---

## Prochaines étapes

- Optimisation de l’algorithme Monte-Carlo
- Système de classement entre utilisateurs
- Ajout d’événements économiques simulés
- Amélioration continue de l’interface utilisateur
