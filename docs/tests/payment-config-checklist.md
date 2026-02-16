# Checklist tests manuels – Paiements tournois

## Admin (onglet Paiements)
- [ ] Ouvrir l’admin inscriptions et vérifier l’apparition de l’onglet Paiements.
- [ ] Sélectionner un tournoi et vérifier que les champs sont pré-remplis (avec les valeurs sauvegardées).
- [ ] Activer “Paiements activés”, activer un moyen (ex: Lydia), saisir un identifiant, sauvegarder.
- [ ] Recharger la page (ou changer d’onglet puis revenir) et vérifier la persistance des valeurs.
- [ ] Désactiver tous les moyens de paiement, sauvegarder, vérifier que l’inscription affiche “Aucun moyen…”.
- [ ] Tester le bouton “Changer de tournoi” et vérifier que la sélection est partagée avec l’onglet Tournois.

## API
- [ ] Appeler l’API `PUT /api/tournaments/[id]/payment-config?token=...` avec un token invalide → 401.
- [ ] Appeler l’API avec un token valide et un payload valide → 200 + sauvegarde en DB.

## Formulaire inscription (public)
- [ ] Tournoi gratuit (price = 0) → le bloc Paiement ne s’affiche pas.
- [ ] Tournoi payant (price > 0) + paiements activés → bloc Paiement visible + bouton “Voir les moyens”.
- [ ] Ouvrir la modale, vérifier l’affichage des moyens activés et des valeurs (IBAN/BIC/etc.).
- [ ] Vérifier l’affichage de l’email de confirmation et du délai (heures) si renseignés.
