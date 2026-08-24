# Suivi pédagogique — Département Informatique

Plateforme web V1 de suivi et d’évaluation pédagogique pour un département d’informatique de lycée.

## Fonctionnalités V1

### Enseignants
- connexion par e-mail / mot de passe ;
- consultation des cours du jour ;
- validation d’une séance : effectuée, partielle, non effectuée ou reportée ;
- saisie de l’heure réellement effectuée, de la leçon et d’une observation ;
- consultation de sa progression, de son emploi du temps, de ses absences et de ses indicateurs ;
- publication et commentaires sur le mur pédagogique ;
- changement de mot de passe.

### Animateur pédagogique / Administrateur
- tableau de bord global ;
- suivi des cours prévus et réalisés ;
- heures prévues / réalisées par jour, semaine, mois et année ;
- leçons prévues / terminées par période ;
- couverture horaire ;
- couverture des programmes ;
- taux d’assiduité ;
- suivi des absences jour / semaine / mois / année ;
- gestion des années scolaires, périodes, classes, matières et interruptions ;
- gestion des enseignants, affectations et emplois du temps ;
- génération automatique des séances à partir de l’emploi du temps ;
- gestion des programmes, chapitres et leçons ;
- rapports imprimables / PDF via le navigateur ;
- export CSV ;
- modération et épinglage du mur pédagogique.

### Direction
- accès en consultation aux tableaux de bord, cours, progressions, statistiques et rapports ;
- aucune modification des séances ou progressions.

## Architecture

- Next.js + TypeScript
- Supabase Auth
- PostgreSQL / Supabase Database
- Row Level Security (RLS)
- interface responsive mobile / tablette / ordinateur
- architecture monolithique modulaire

Versions épinglées dans `package.json` : Next.js 16.3.1, React 19.2, Supabase JS 2.112.3, `@supabase/ssr` 0.12.4.

---

# Installation locale

## 1. Prérequis

- Node.js 22 ou version LTS compatible
- npm
- un projet Supabase

## 2. Installer les dépendances

Dans le dossier du projet :

```bash
npm install
```

Puis :

```bash
npm run dev
```

Ouvrir ensuite `http://localhost:3000`.

Sans configuration Supabase, la racine redirige vers `/demo`.

---

# Configuration Supabase

## 3. Variables d’environnement

Copier `.env.example` vers `.env.local`.

Sous Windows PowerShell :

```powershell
Copy-Item .env.example .env.local
```

Renseigner :

```env
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLIABLE
SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_SERVICE_ROLE
```

`SUPABASE_SERVICE_ROLE_KEY` est facultative pour la consultation et la saisie pédagogique, mais nécessaire pour créer directement de nouveaux comptes depuis `/admin/users`.

**Ne jamais exposer la clé Service Role dans le navigateur, dans un dépôt public ou dans une variable commençant par `NEXT_PUBLIC_`.**

## 4. Créer la base de données

Dans Supabase → SQL Editor, exécuter **dans cet ordre** :

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_setup_hardening.sql`
3. `supabase/migrations/003_v1_completion.sql`

Ces migrations créent notamment :

- les profils et rôles ;
- enseignants, classes et matières ;
- emplois du temps et séances ;
- programmes, chapitres et leçons ;
- progressions ;
- absences ;
- mur pédagogique et commentaires ;
- fonctions de génération des séances ;
- vues d’indicateurs ;
- politiques RLS.

---

# Premier administrateur

## 5. Créer le premier compte

Après les migrations, créer le premier utilisateur depuis Supabase → Authentication → Users.

Puis exécuter dans SQL Editor :

```sql
update public.profiles
set role = 'admin', active = true
where email = 'votre-email@lycee.cm';
```

Se connecter ensuite à `/login`.

---

# Mise en service initiale

Suivre cet ordre :

## A. `/admin/setup`

1. Créer l’année scolaire.
2. L’activer.
3. Créer les périodes.
4. Créer les classes.
5. Créer les matières.
6. Enregistrer les congés, jours fériés, examens et autres interruptions officielles.

## B. `/admin/users`

Créer les comptes des collègues et définir les rôles :

- `admin` — Administrateur
- `pedagogical_lead` — Animateur pédagogique
- `teacher` — Enseignant
- `management_viewer` — Direction / consultation

La création de comptes depuis cette page nécessite `SUPABASE_SERVICE_ROLE_KEY`.

## C. `/admin/schedule`

1. Relier chaque compte à une fiche enseignant.
2. Créer les affectations Enseignant → Classe → Matière.
3. Renseigner le volume horaire hebdomadaire.
4. Créer les créneaux d’emploi du temps.
5. Générer les séances attendues sur la période voulue.

La génération est idempotente : relancer la même plage ne duplique pas les séances existantes.

## D. `/admin/programs`

1. Créer un programme pour chaque couple Classe + Matière.
2. Ajouter les chapitres.
3. Ajouter les leçons.
4. Renseigner si possible la date prévue de chaque leçon.

Les dates prévues permettent à l’écran `Aujourd’hui` d’afficher la leçon attendue et aux statistiques de compter les leçons prévues dans chaque période.

---

# Utilisation quotidienne

## `/today`

Affiche les séances d’une date donnée :

- heure prévue ;
- enseignant ;
- classe ;
- matière ;
- leçon prévue ;
- statut ;
- durée réelle ;
- leçon réellement faite.

Une séance validée alimente automatiquement les indicateurs.

## `/progress`

Affiche :

- couverture réelle ;
- couverture attendue à la date du jour ;
- chapitre et leçons ;
- statut Non commencée / En cours / Terminée.

## `/absences`

Filtres disponibles :

- jour ;
- semaine ;
- mois ;
- année.

## `/statistics`

Filtres disponibles :

- jour ;
- semaine ;
- mois ;
- année.

Indicateurs :

- heures prévues ;
- heures réalisées ;
- leçons prévues ;
- leçons terminées ;
- couverture horaire ;
- couverture du programme ;
- assiduité ;
- absences.

## `/wall`

Tous les membres connectés peuvent :

- publier ;
- commenter ;
- lire les publications.

Les responsables peuvent épingler et modérer les publications.

## `/reports`

- impression directe ;
- « Enregistrer en PDF » via le dialogue d’impression du navigateur ;
- export CSV.

---

# Formules V1

### Couverture horaire

```text
heures réellement effectuées / heures attendues × 100
```

Les séances `reportées` et `annulées par l’établissement` sont exclues du volume attendu.

Une séance prévue plus tard dans la journée n’est pas encore comptée comme due.

### Couverture du programme

```text
leçons terminées / nombre total de leçons du programme × 100
```

### Assiduité

```text
séances assurées / séances attendues × 100
```

Les séances annulées officiellement et reportées sont exclues du dénominateur.

---

# Tests

Après `npm install` :

```bash
npm test
npm run typecheck
npm run build
```

Tests fournis :

- `npm run test:smoke` — structure, routes et schéma ;
- `npm run test:unit` — moteur d’indicateurs ;
- `npm run typecheck` — TypeScript strict ;
- `npm run build` — compilation Next.js complète.

Voir `TEST_REPORT.md` pour le résultat des vérifications effectuées lors de la livraison.

---

# Déploiement Vercel

1. Déposer le projet dans un dépôt Git privé.
2. Importer le dépôt dans Vercel.
3. Ajouter les trois variables d’environnement Supabase.
4. Déployer.
5. Vérifier `/login`, puis créer les données de référence.

Aucune clé Service Role ne doit être utilisée dans une variable publique.

---

# Structure principale

```text
app/
  dashboard/       Tableau de bord
  today/           Séances quotidiennes
  progress/        Progression pédagogique
  absences/        Absences
  wall/            Mur collaboratif
  statistics/      Indicateurs
  teachers/        Fiches enseignants
  timetable/       Emploi du temps
  reports/         Rapports + CSV
  account/         Mot de passe
  admin/
    setup/          Année, classes, matières, calendrier
    schedule/       Affectations et emploi du temps
    programs/       Programmes, chapitres, leçons
    users/          Comptes et rôles
components/        Composants d’interface
lib/               Auth, dates, indicateurs, Supabase
supabase/migrations/ Schéma PostgreSQL et sécurité
scripts/            Tests de fumée et tests unitaires
```
