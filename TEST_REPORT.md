# Rapport de tests — V1 Suivi pédagogique

Date de livraison : 18 août 2026

## Résultats exécutés dans l’environnement de construction

### 1. Test de fumée du projet

Commande :

```bash
node scripts/smoke-check.mjs
```

Résultat : **OK**

Contrôles :

- présence des fichiers métier critiques ;
- présence des routes principales ;
- présence des tables / vues SQL essentielles ;
- navigation V1 détectée.

### 2. Test unitaire du moteur d’indicateurs

Commande :

```bash
node scripts/unit-performance.mjs
```

Résultat : **OK**

Cas testés :

- séance effectuée ;
- séance manquée ;
- séance annulée par l’établissement ;
- séance prévue plus tard aujourd’hui ;
- absence ;
- leçons prévues et terminées ;
- couverture horaire ;
- couverture du programme ;
- assiduité ;
- agrégation départementale.

Résultat attendu vérifié :

- cours annulé exclu du volume attendu ;
- cours futur aujourd’hui exclu tant qu’il n’est pas dû ;
- couverture horaire = 50 % dans le jeu d’essai ;
- assiduité = 50 % ;
- couverture programme = 60 %.

### 3. Analyse syntaxique TypeScript / TSX

Résultat : **OK**

46 fichiers TypeScript / TSX analysés sans erreur de syntaxe.

### 4. Contrôle TypeScript strict avec signatures externes simulées

Résultat : **OK**

Le code applicatif a été vérifié sous `strict: true` avec des signatures minimales simulant Next.js et Supabase, les paquets réels ne pouvant pas être téléchargés dans l’environnement de construction.

## Limites de test de cet environnement

### `npm install` / `next build`

L’accès au registre npm a expiré dans l’environnement de construction. Les dépendances réelles n’ont donc pas pu être installées ici et un `next build` réel n’a pas pu être exécuté.

### Base Supabase réelle

Aucun projet Supabase utilisateur n’était connecté pendant la construction. Les migrations PostgreSQL et les politiques RLS ont été revues statiquement, mais pas exécutées contre une base distante réelle.

## Validation à effectuer au déploiement

Une fois le projet relié à Supabase et après `npm install`, exécuter :

```bash
npm test
npm run typecheck
npm run build
```

Puis tester avec quatre comptes :

1. Administrateur
2. Animateur pédagogique
3. Enseignant
4. Direction

Scénario d’acceptation recommandé :

1. créer une année scolaire ;
2. créer une classe et une matière ;
3. créer un enseignant ;
4. créer une affectation et un créneau ;
5. générer les séances ;
6. créer un programme et une leçon datée ;
7. ouvrir `/today` avec l’enseignant ;
8. valider une séance ;
9. vérifier `/progress` ;
10. vérifier `/statistics` ;
11. enregistrer une absence ;
12. publier et commenter sur `/wall` ;
13. générer le rapport et le CSV ;
14. confirmer que le compte Direction reste en lecture seule.
