# Spécification : Inscription Utilisateur Existant aux Tournois

## Contexte
Actuellement, chaque inscription à un tournoi crée un nouvel utilisateur en base de données, même si la personne s'est déjà inscrite à un tournoi précédent. Cela crée des doublons et empêche de compiler les statistiques d'un joueur à travers plusieurs tournois.

## Objectif
Permettre aux utilisateurs de se rattacher à leur compte existant lors d'une nouvelle inscription à un tournoi, en utilisant leur email comme identifiant unique.

## Parcours Utilisateur

### Parcours 1 : Nouvel Utilisateur (Première Inscription)
1. L'utilisateur arrive sur le formulaire d'inscription d'un tournoi
2. Il voit la question : **"Avez-vous déjà participé à un tournoi ?"**
3. Il sélectionne **"Non"** (valeur par défaut)
4. Le formulaire affiche tous les champs standards :
   - Nom
   - Prénom
   - Email
   - Téléphone (optionnel)
   - Photo de profil (optionnel)
   - Niveau de jeu
   - Préférences
5. L'utilisateur remplit le formulaire et valide
6. **Action backend** :
   - Créer un nouvel utilisateur (player) en base
   - Créer une participation au tournoi avec status = 'pending'
   - Envoyer un email de confirmation

### Parcours 2 : Utilisateur Existant (Nouvelle Inscription)
1. L'utilisateur arrive sur le formulaire d'inscription d'un tournoi
2. Il voit la question : **"Avez-vous déjà participé à un tournoi ?"**
3. Il sélectionne **"Oui"**
4. Le formulaire se transforme :
   - **Masquer** tous les champs sauf l'email
   - **Afficher** un message d'information : _"Utilisez l'adresse email de votre première inscription pour retrouver votre compte"_
   - **Afficher** un champ email mis en évidence
5. L'utilisateur saisit son email et clique sur "Vérifier"
6. **Action backend** : Vérifier si l'email existe en base

   **Cas 6a : Email trouvé**
   - Récupérer les données du joueur (nom, prénom, photo, niveau)
   - Afficher un message de succès : _"✓ Compte trouvé : [Prénom Nom]"_
   - Afficher un récapitulatif des infos (nom, prénom, photo) en **lecture seule**
   - Proposer un bouton "Confirmer l'inscription" ou "Ce n'est pas moi"
   - Si "Confirmer l'inscription" :
     - Créer une participation au tournoi avec status = 'pending'
     - **NE PAS créer de nouvel utilisateur**
     - Envoyer un email de confirmation
   - Si "Ce n'est pas moi" :
     - Revenir à l'état initial du formulaire

   **Cas 6b : Email non trouvé**
   - Afficher un message d'erreur : _"✗ Aucun compte trouvé avec cet email. Vérifiez votre adresse ou inscrivez-vous comme nouveau participant."_
   - Proposer un bouton "Réessayer" ou "M'inscrire comme nouveau participant"
   - Si "M'inscrire comme nouveau participant" :
     - Basculer le switch sur "Non"
     - Afficher le formulaire complet

### Parcours 3 : Utilisateur Hésitant
1. L'utilisateur sélectionne "Oui" par erreur
2. Il réalise qu'il n'a jamais participé
3. Il peut basculer le switch sur "Non"
4. Le formulaire complet réapparaît (vide)

## Spécifications Techniques

### Frontend

#### 1. Composant Switch "Avez-vous déjà participé ?"
```tsx
type RegistrationMode = 'new' | 'existing';

const [mode, setMode] = useState<RegistrationMode>('new');
```

**Affichage** :
- Toggle switch avec 2 options : "Non" (gauche) / "Oui" (droite)
- Par défaut : "Non" (nouveau participant)
- Design : Style iOS toggle avec gradient orange quand activé

#### 2. États du Formulaire

**État 1 : Nouveau participant (mode = 'new')**
```tsx
Afficher :
- ✓ Tous les champs (nom, prénom, email, téléphone, photo, niveau)
- ✓ Bouton "S'inscrire"

Masquer :
- ✗ Message d'information email existant
- ✗ Récapitulatif utilisateur
- ✗ Bouton "Vérifier l'email"
```

**État 2 : Participant existant - Saisie email (mode = 'existing')**
```tsx
Afficher :
- ✓ Champ email uniquement (agrandi, mis en évidence)
- ✓ Message d'info : "Utilisez l'adresse email de votre première inscription"
- ✓ Bouton "Vérifier"

Masquer :
- ✗ Tous les autres champs (nom, prénom, téléphone, photo, niveau)
```

**État 3 : Participant existant - Compte trouvé (mode = 'existing', emailVerified = true)**
```tsx
Afficher :
- ✓ Message de succès : "✓ Compte trouvé : [Prénom Nom]"
- ✓ Card avec infos utilisateur (photo, nom, prénom, niveau) en lecture seule
- ✓ Bouton "Confirmer l'inscription" (principal, orange)
- ✓ Bouton "Ce n'est pas moi" (secondaire, gris)

Masquer :
- ✗ Champ email (ou en lecture seule)
- ✗ Tous les autres champs de saisie
```

**État 4 : Participant existant - Compte non trouvé (mode = 'existing', emailVerified = false, error = true)**
```tsx
Afficher :
- ✓ Champ email (en erreur, bordure rouge)
- ✓ Message d'erreur : "✗ Aucun compte trouvé avec cet email"
- ✓ Bouton "Réessayer"
- ✓ Lien "M'inscrire comme nouveau participant"
```

#### 3. Validation Frontend

**Validation de l'email** :
- Format email valide (regex standard)
- Non vide
- Pas d'espaces avant/après (trim)

**Avant soumission** :
- Si mode = 'new' : valider tous les champs (nom, prénom, email)
- Si mode = 'existing' : valider que l'email a été vérifié (emailVerified = true)

### Backend

#### 1. Nouvelle Route : Vérifier Email Existant

**Endpoint** : `POST /api/tournaments/[tournamentId]/verify-email`

**Body** :
```json
{
  "email": "user@example.com"
}
```

**Réponse Success (200)** :
```json
{
  "success": true,
  "player": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "photoUrl": "/uploads/player-photos/123.jpg",
    "level": "intermediate"
  }
}
```

**Réponse Not Found (404)** :
```json
{
  "success": false,
  "error": "Aucun compte trouvé avec cet email"
}
```

**Logique Backend** :
```typescript
async function verifyEmail(email: string) {
  const database = getDatabaseClient();

  const [player] = await database<Player[]>`
    select id, first_name, last_name, email, photo_url, level
    from players
    where lower(email) = lower(${email.trim()})
    limit 1
  `;

  if (!player) {
    return { success: false, error: "Aucun compte trouvé avec cet email" };
  }

  return { success: true, player };
}
```

#### 2. Modifier Route d'Inscription

**Endpoint** : `POST /api/tournaments/[tournamentId]/register`

**Body (Nouveau Participant)** :
```json
{
  "mode": "new",
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "phone": "+33612345678",
  "photoUrl": "/uploads/player-photos/123.jpg",
  "level": "intermediate"
}
```

**Body (Participant Existant)** :
```json
{
  "mode": "existing",
  "playerId": "uuid-du-joueur",
  "email": "user@example.com"
}
```

**Logique Backend** :
```typescript
async function registerToTournament(tournamentId: string, data: RegistrationData) {
  const database = getDatabaseClient();

  let playerId: string;

  if (data.mode === 'new') {
    // Vérifier que l'email n'existe pas déjà
    const [existing] = await database`
      select id from players where lower(email) = lower(${data.email})
    `;

    if (existing) {
      return {
        success: false,
        error: "Cet email est déjà utilisé. Utilisez le mode 'Participant existant'."
      };
    }

    // Créer un nouveau joueur
    const [newPlayer] = await database`
      insert into players (first_name, last_name, email, phone, photo_url, level)
      values (${data.firstName}, ${data.lastName}, ${data.email}, ${data.phone}, ${data.photoUrl}, ${data.level})
      returning id
    `;

    playerId = newPlayer.id;

  } else if (data.mode === 'existing') {
    // Vérifier que le joueur existe
    const [player] = await database`
      select id from players where id = ${data.playerId}
    `;

    if (!player) {
      return { success: false, error: "Joueur non trouvé" };
    }

    playerId = data.playerId;
  }

  // Vérifier que le joueur n'est pas déjà inscrit à ce tournoi
  const [existingParticipation] = await database`
    select id from participations
    where tournament_id = ${tournamentId}
    and player_id = ${playerId}
  `;

  if (existingParticipation) {
    return {
      success: false,
      error: "Vous êtes déjà inscrit à ce tournoi"
    };
  }

  // Créer la participation
  await database`
    insert into participations (tournament_id, player_id, status)
    values (${tournamentId}, ${playerId}, 'pending')
  `;

  // Envoyer email de confirmation
  await sendConfirmationEmail(playerId, tournamentId);

  return { success: true };
}
```

### Base de Données

#### Contraintes à Ajouter (si pas déjà présentes)

**1. Email unique sur la table players** :
```sql
-- Ajouter une contrainte d'unicité sur l'email (case insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_email_unique
ON players (lower(email));
```

**2. Contrainte d'unicité sur les participations** :
```sql
-- Empêcher les doublons (même joueur inscrit 2 fois au même tournoi)
CREATE UNIQUE INDEX IF NOT EXISTS idx_participations_unique
ON participations (tournament_id, player_id);
```

#### Requêtes Utiles

**Trouver les doublons d'email existants** (pour nettoyage si nécessaire) :
```sql
select email, count(*) as count
from players
group by lower(email)
having count(*) > 1;
```

**Fusionner les doublons** (script à exécuter manuellement si nécessaire) :
```sql
-- Pour chaque email en doublon, garder le plus ancien et migrer les participations
-- Exemple pour user@example.com :

-- 1. Identifier les IDs
select id, email, created_at
from players
where lower(email) = 'user@example.com'
order by created_at asc;

-- 2. Migrer les participations vers l'ID le plus ancien
update participations
set player_id = 'oldest-player-id'
where player_id in ('duplicate-id-1', 'duplicate-id-2');

-- 3. Supprimer les doublons
delete from players
where id in ('duplicate-id-1', 'duplicate-id-2');
```

## Messages Utilisateur

### Messages d'Information
- **Switch activé "Oui"** : _"Utilisez l'adresse email de votre première inscription pour retrouver votre compte"_
- **Compte trouvé** : _"✓ Compte trouvé : [Prénom Nom]. Confirmez pour vous inscrire à ce tournoi."_

### Messages d'Erreur
- **Email non trouvé** : _"✗ Aucun compte trouvé avec cet email. Vérifiez votre adresse ou inscrivez-vous comme nouveau participant."_
- **Email invalide** : _"Veuillez entrer une adresse email valide"_
- **Déjà inscrit** : _"Vous êtes déjà inscrit à ce tournoi"_
- **Email déjà utilisé (mode 'new')** : _"Cet email est déjà utilisé. Veuillez utiliser le mode 'Participant existant' pour vous rattacher à votre compte."_

### Messages de Succès
- **Nouvelle inscription** : _"✓ Inscription réussie ! Votre demande est en attente de validation par l'administrateur."_
- **Inscription existante** : _"✓ Inscription réussie ! Votre compte a été rattaché à ce tournoi. Votre demande est en attente de validation."_

## Expérience Utilisateur (UX)

### Principes
1. **Simplicité** : Le parcours par défaut (nouveau participant) reste simple et direct
2. **Guidance** : Messages clairs à chaque étape pour guider l'utilisateur
3. **Feedback** : Retour visuel immédiat (success, error, loading)
4. **Réversibilité** : L'utilisateur peut toujours changer d'avis (switch, boutons retour)
5. **Protection** : Éviter les erreurs (validation, messages explicites)

### Animations et Transitions
- **Switch** : Transition fluide de 200ms
- **Affichage/Masquage champs** : Fade in/out 300ms
- **Vérification email** : Loading spinner pendant la requête
- **Messages** : Slide down avec animation 300ms

### Accessibilité
- **Labels** : Tous les champs ont un label visible
- **ARIA** : Attributs aria-label, aria-describedby pour les messages
- **Keyboard** : Navigation complète au clavier (Tab, Enter, Esc)
- **Focus** : États focus visibles (outline orange)
- **Screen readers** : Messages d'erreur/succès annoncés

## Cas Limites et Edge Cases

### 1. Email avec Casse Différente
**Problème** : user@example.com vs User@Example.COM
**Solution** : Toujours normaliser en lowercase avant comparaison
```typescript
where lower(email) = lower(${email.trim()})
```

### 2. Espaces Avant/Après l'Email
**Problème** : " user@example.com "
**Solution** : Trim automatique côté frontend et backend
```typescript
email.trim()
```

### 3. Utilisateur Change d'Email
**Problème** : L'utilisateur ne se souvient plus de son ancien email
**Solution** :
- Ajouter un lien "Email oublié ?" qui ouvre une modale
- Proposer de contacter l'administrateur
- Ou permettre la recherche par nom/prénom (future feature)

### 4. Double Inscription Simultanée
**Problème** : 2 onglets ouverts, inscription en même temps
**Solution** : Contrainte unique en DB empêche le doublon
```sql
UNIQUE INDEX idx_participations_unique ON participations (tournament_id, player_id)
```

### 5. Session Expirée
**Problème** : Token JWT expiré pendant le formulaire
**Solution** :
- Gérer l'erreur 401
- Proposer de se reconnecter
- Sauvegarder les données du formulaire (localStorage)

### 6. Email Existant en Mode "New"
**Problème** : User sélectionne "Non" mais son email existe déjà
**Solution** : Backend détecte et retourne une erreur explicite suggérant le mode "existing"

## Analytics et Suivi

### Events à Tracker
- `registration_started` : L'utilisateur arrive sur le formulaire
- `registration_mode_selected` : Mode sélectionné (new/existing)
- `email_verification_requested` : Vérification d'email déclenchée
- `email_verification_success` : Email trouvé
- `email_verification_failed` : Email non trouvé
- `registration_submitted` : Soumission finale
- `registration_success` : Inscription réussie
- `registration_error` : Erreur lors de l'inscription

### Métriques Importantes
- Taux de conversion : % qui complètent l'inscription
- Taux d'utilisateurs existants : % qui utilisent le mode "existing"
- Taux d'erreur email : % d'emails non trouvés
- Temps moyen de complétion du formulaire

## Tests à Effectuer

### Tests Unitaires
- [ ] Validation email (format, vide, espaces)
- [ ] Normalisation email (lowercase, trim)
- [ ] Création utilisateur (mode 'new')
- [ ] Rattachement utilisateur (mode 'existing')
- [ ] Détection doublons

### Tests d'Intégration
- [ ] Parcours complet nouveau participant
- [ ] Parcours complet participant existant - succès
- [ ] Parcours complet participant existant - échec (email non trouvé)
- [ ] Changement de mode (new → existing → new)
- [ ] Vérification contraintes DB (unicité email, unicité participation)

### Tests End-to-End
- [ ] Inscription nouveau participant + validation admin
- [ ] Inscription participant existant + vérification données conservées
- [ ] Tentative double inscription (même email, même tournoi)
- [ ] Email avec casse différente
- [ ] Navigation back/forward du navigateur

### Tests Manuels
- [ ] UX sur mobile (taille écran, touch)
- [ ] UX sur desktop (hover states, keyboard)
- [ ] Accessibilité (screen reader, keyboard only)
- [ ] Messages d'erreur compréhensibles
- [ ] Loading states (spinner, disabled buttons)

## Déploiement

### Phase 1 : Préparation
1. Ajouter les contraintes DB (uniqueness)
2. Nettoyer les doublons existants (si nécessaire)
3. Créer l'endpoint de vérification email
4. Tester en staging

### Phase 2 : Déploiement
1. Déployer le backend (nouvelle route + logique modifiée)
2. Déployer le frontend (nouveau formulaire)
3. Vérifier les logs
4. Monitorer les erreurs

### Phase 3 : Post-Déploiement
1. Communiquer la nouvelle feature aux utilisateurs
2. Mettre à jour la documentation
3. Collecter les retours utilisateurs
4. Ajuster si nécessaire

## Améliorations Futures

### Court Terme
- [ ] Recherche par nom/prénom en plus de l'email
- [ ] "Email oublié ?" avec recherche alternative
- [ ] Auto-complétion email (si plusieurs emails du même domaine)

### Moyen Terme
- [ ] Authentification complète (login/password)
- [ ] Espace personnel joueur (voir ses tournois, stats)
- [ ] Modification de profil (email, photo, niveau)
- [ ] Notifications email personnalisées

### Long Terme
- [ ] OAuth (Google, Facebook)
- [ ] Application mobile
- [ ] Historique des participations visible avant inscription
- [ ] Recommandations de tournois basées sur le profil
