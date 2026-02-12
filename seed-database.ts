/**
 * Script de génération de données de test pour la base de données
 *
 * Usage:
 *   npx tsx seed-database.ts
 *
 * Génère:
 * - 100 joueurs avec noms réels
 * - 10 tournois sur les 2 dernières années
 * - Entre 15 et 30 équipes par tournoi
 * - Matchs de poules et phases finales avec résultats aléatoires
 */

import { neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";

// Configuration pour support local
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

neonConfig.webSocketConstructor = require("ws");

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
});

// Liste de prénoms français
const prenoms = [
  "Alexandre", "Antoine", "Arthur", "Baptiste", "Benjamin", "Clément", "Damien",
  "David", "Enzo", "Étienne", "Florian", "Gabriel", "Guillaume", "Hugo", "Jean",
  "Julien", "Lucas", "Mathieu", "Maxime", "Nathan", "Nicolas", "Olivier", "Paul",
  "Pierre", "Raphaël", "Romain", "Samuel", "Simon", "Thomas", "Victor",
  "Adrien", "Alexis", "Benoît", "Charles", "Dylan", "Emma", "Fabien", "François",
  "Gaëtan", "Henri", "Louis", "Marc", "Mathis", "Michaël", "Noé", "Oscar",
  "Quentin", "Rémi", "Sébastien", "Théo", "Valentin", "Xavier", "Yann", "Zoé",
  "Chloé", "Julie", "Laura", "Léa", "Manon", "Marie", "Sarah", "Sophie",
  "Camille", "Charlotte", "Clara", "Elise", "Inès", "Jade", "Juliette", "Léna",
  "Lisa", "Louise", "Lucie", "Margaux", "Marion", "Océane", "Pauline", "Romane",
  "Alice", "Amélie", "Anaïs", "Aurore", "Céline", "Coralie", "Élodie", "Emilie",
  "Eva", "Fanny", "Iris", "Justine", "Laurie", "Maëva", "Marina", "Mathilde",
  "Mélanie", "Morgane", "Nathalie", "Nina", "Salomé", "Victoire", "Yasmine", "Zoé"
];

// Liste de noms français
const noms = [
  "MARTIN", "BERNARD", "DUBOIS", "THOMAS", "ROBERT", "RICHARD", "PETIT", "DURAND",
  "LEROY", "MOREAU", "SIMON", "LAURENT", "LEFEBVRE", "MICHEL", "GARCIA", "DAVID",
  "BERTRAND", "ROUX", "VINCENT", "FOURNIER", "MOREL", "GIRARD", "ANDRE", "LEFEVRE",
  "MERCIER", "DUPONT", "LAMBERT", "BONNET", "FRANCOIS", "MARTINEZ", "LEGRAND", "GARNIER",
  "FAURE", "ROUSSEAU", "BLANC", "GUERIN", "MULLER", "HENRY", "ROUSSEL", "NICOLAS",
  "PERRIN", "MORIN", "MATHIEU", "CLEMENT", "GAUTHIER", "DUMONT", "LOPEZ", "FONTAINE",
  "CHEVALIER", "ROBIN", "MASSON", "SANCHEZ", "GERARD", "NGUYEN", "BOYER", "DENIS",
  "LEMAIRE", "DUVAL", "JOLY", "GAUTIER", "ROGER", "ROCHE", "ROY", "NOEL",
  "MEYER", "LUCAS", "MEUNIER", "JEAN", "PEREZ", "MARCHAND", "DUFOUR", "BLANCHARD",
  "MARIE", "BARBIER", "BRUN", "DUMAS", "BRUNET", "SCHMITT", "LEROUX", "COLIN",
  "FERNANDEZ", "PIERRE", "RENARD", "ARNAUD", "ROLLAND", "CARON", "AUBERT", "GIRAUD",
  "LECLERC", "VIDAL", "BOURGEOIS", "RENAUD", "LEMOINE", "PICARD", "GAILLARD", "PHILIPPE",
  "LECLERCQ", "LACROIX", "FABRE", "DUPUIS"
];

// Noms de tournois
const nomsLieux = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg",
  "Bordeaux", "Lille", "Rennes"
];

// Niveaux de jeu
const niveaux = ["beginner", "intermediate", "advanced", "expert"];

/**
 * Génère un email à partir d'un prénom et nom
 */
function genererEmail(prenom: string, nom: string): string {
  const domaines = ["gmail.com", "hotmail.fr"];
  const domaine = domaines[Math.floor(Math.random() * domaines.length)];
  return `${prenom.toLowerCase()}.${nom.toLowerCase()}@${domaine}`;
}

/**
 * Génère un slug à partir d'un nom
 */
function genererSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Génère une date aléatoire dans les X derniers mois
 */
function genererDatePassee(moisDepuis: number): Date {
  const maintenant = new Date();
  const debut = new Date(maintenant);
  debut.setMonth(debut.getMonth() - moisDepuis);

  const timestamp = debut.getTime() + Math.random() * (maintenant.getTime() - debut.getTime());
  return new Date(timestamp);
}

/**
 * Mélange un tableau (Fisher-Yates shuffle)
 */
function melanger<T>(tableau: T[]): T[] {
  const resultat = [...tableau];
  for (let i = resultat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
  }
  return resultat;
}

/**
 * Génère un score de set réaliste
 */
function genererScoreSet(equipeGagnante: 1 | 2): { team1: number; team2: number } {
  const scoreGagnant = 6;
  const scorePerdant = Math.random() < 0.7
    ? Math.floor(Math.random() * 5) // 0-4
    : Math.random() < 0.5
      ? 5 // 6-5
      : 7; // 7-6 (tie-break)

  if (equipeGagnante === 1) {
    return { team1: scoreGagnant, team2: scorePerdant };
  } else {
    return { team1: scorePerdant, team2: scoreGagnant };
  }
}

/**
 * Génère les scores d'un match (meilleur de 3 sets)
 */
function genererScoresMatch(): {
  sets: Array<{ team1: number; team2: number }>;
  winnerId: 1 | 2;
} {
  const nbSets = Math.random() < 0.6 ? 2 : 3; // 60% de matchs en 2 sets
  const winnerId: 1 | 2 = Math.random() < 0.5 ? 1 : 2;

  let setsGagnesTeam1 = 0;
  let setsGagnesTeam2 = 0;
  const sets: Array<{ team1: number; team2: number }> = [];

  while (setsGagnesTeam1 < 2 && setsGagnesTeam2 < 2 && sets.length < nbSets) {
    // Si on est au dernier set possible, le gagnant doit gagner ce set
    const dernierSet = sets.length === 2;
    let gagnantSet: 1 | 2;

    if (dernierSet) {
      gagnantSet = winnerId;
    } else {
      // Favoriser le gagnant final du match
      gagnantSet = Math.random() < (winnerId === 1 ? 0.6 : 0.4) ? 1 : 2;
    }

    const scoreSet = genererScoreSet(gagnantSet);
    sets.push(scoreSet);

    if (gagnantSet === 1) setsGagnesTeam1++;
    else setsGagnesTeam2++;
  }

  return { sets, winnerId };
}

async function main() {
  console.log("🎾 Génération des données de test pour Le Tournoi des Frérots");
  console.log("━".repeat(60));

  try {
    // 1. GÉNÉRATION DES JOUEURS
    console.log("\n📝 Génération de 100 joueurs...");

    const joueurs: Array<{ id: string; prenom: string; nom: string }> = [];
    const prenomsUtilises = new Set<string>();
    const nomsUtilises = new Set<string>();

    for (let i = 0; i < 100; i++) {
      // Éviter les doublons de nom complet
      let prenom: string, nom: string, nomComplet: string;
      do {
        prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
        nom = noms[Math.floor(Math.random() * noms.length)];
        nomComplet = `${prenom} ${nom}`;
      } while (prenomsUtilises.has(nomComplet));

      prenomsUtilises.add(nomComplet);

      const email = genererEmail(prenom, nom);
      const niveau = niveaux[Math.floor(Math.random() * niveaux.length)];
      const phone = `+336${Math.floor(10000000 + Math.random() * 90000000)}`;

      const [joueur] = await sql`
        INSERT INTO players (first_name, last_name, email, phone, level, created_at)
        VALUES (${prenom}, ${nom}, ${email}, ${phone}, ${niveau}, NOW())
        RETURNING id, first_name, last_name
      `;

      joueurs.push({
        id: joueur.id,
        prenom: joueur.first_name,
        nom: joueur.last_name,
      });

      if ((i + 1) % 20 === 0) {
        console.log(`   ✓ ${i + 1}/100 joueurs créés`);
      }
    }

    console.log(`✅ 100 joueurs créés`);

    // 2. GÉNÉRATION DES TOURNOIS
    console.log("\n🏆 Génération de 10 tournois...");

    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() - 24); // Il y a 2 ans

    for (let t = 0; t < 10; t++) {
      const dateTournoi = new Date(dateDebut);
      dateTournoi.setMonth(dateTournoi.getMonth() + t * 2 + Math.floor(Math.random() * 2));

      const lieu = nomsLieux[t % nomsLieux.length];
      const nomTournoi = `Tournoi ${lieu} ${dateTournoi.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      const slug = genererSlug(nomTournoi);

      // Créer le tournoi
      const [tournoi] = await sql`
        INSERT INTO tournaments (name, slug, start_date, location, status, max_participants, teams_qualified, created_at)
        VALUES (
          ${nomTournoi},
          ${slug},
          ${dateTournoi.toISOString()},
          ${`Club de ${lieu}`},
          'completed',
          64,
          16,
          NOW()
        )
        RETURNING id, name
      `;

      console.log(`\n   🎾 ${tournoi.name}`);

      // Nombre d'équipes (15-30)
      const nbEquipes = 15 + Math.floor(Math.random() * 16);
      console.log(`      Équipes: ${nbEquipes}`);

      // Créer les équipes avec des paires aléatoires
      const joueursDisponibles = melanger([...joueurs]);
      const equipes: Array<{ id: string; name: string; players: string[] }> = [];

      for (let e = 0; e < nbEquipes; e++) {
        const joueur1 = joueursDisponibles[e * 2];
        const joueur2 = joueursDisponibles[e * 2 + 1];

        if (!joueur1 || !joueur2) break;

        const nomEquipe = `${joueur1.prenom} & ${joueur2.prenom}`;

        const [equipe] = await sql`
          INSERT INTO teams (name, tournament_id, created_at)
          VALUES (${nomEquipe}, ${tournoi.id}, NOW())
          RETURNING id, name
        `;

        // Ajouter les membres de l'équipe
        await sql`
          INSERT INTO team_members (team_id, player_id, created_at)
          VALUES
            (${equipe.id}, ${joueur1.id}, NOW()),
            (${equipe.id}, ${joueur2.id}, NOW())
        `;

        // Créer les participations
        await sql`
          INSERT INTO participations (tournament_id, player_id, status, created_at)
          VALUES
            (${tournoi.id}, ${joueur1.id}, 'confirmed', NOW()),
            (${tournoi.id}, ${joueur2.id}, 'confirmed', NOW())
        `;

        equipes.push({
          id: equipe.id,
          name: equipe.name,
          players: [joueur1.id, joueur2.id],
        });
      }

      console.log(`      ✓ ${equipes.length} équipes créées`);

      // Créer les poules (4-7 selon nombre d'équipes)
      const nbPoules = Math.min(7, Math.max(4, Math.floor(equipes.length / 4)));
      console.log(`      Poules: ${nbPoules}`);

      const poules: Array<{ id: string; name: string; teams: string[] }> = [];

      for (let p = 0; p < nbPoules; p++) {
        const nomPoule = `Poule ${String.fromCharCode(65 + p)}`; // A, B, C, etc.

        const [poule] = await sql`
          INSERT INTO pools (tournament_id, name, created_at)
          VALUES (${tournoi.id}, ${nomPoule}, NOW())
          RETURNING id, name
        `;

        poules.push({
          id: poule.id,
          name: poule.name,
          teams: [],
        });
      }

      // Répartir les équipes dans les poules (round-robin)
      const equipesM = melanger([...equipes]);
      for (let i = 0; i < equipesM.length; i++) {
        const pouleIndex = i % nbPoules;
        const equipe = equipesM[i];

        await sql`
          INSERT INTO pool_teams (pool_id, team_id, created_at)
          VALUES (${poules[pouleIndex].id}, ${equipe.id}, NOW())
        `;

        poules[pouleIndex].teams.push(equipe.id);
      }

      console.log(`      ✓ ${nbPoules} poules créées avec équipes réparties`);

      // Générer les matchs de poules (chaque équipe joue contre toutes les autres de sa poule)
      let totalMatchsPoules = 0;
      for (const poule of poules) {
        const teamsInPool = poule.teams;

        for (let i = 0; i < teamsInPool.length; i++) {
          for (let j = i + 1; j < teamsInPool.length; j++) {
            const { sets, winnerId } = genererScoresMatch();
            const winnerTeamId = winnerId === 1 ? teamsInPool[i] : teamsInPool[j];

            const [match] = await sql`
              INSERT INTO matches (
                tournament_id, pool_id, round_number, match_number,
                team1_id, team2_id, winner_id, status, created_at
              )
              VALUES (
                ${tournoi.id}, ${poule.id}, 1, ${totalMatchsPoules + 1},
                ${teamsInPool[i]}, ${teamsInPool[j]}, ${winnerTeamId}, 'completed', NOW()
              )
              RETURNING id
            `;

            // Créer les sets
            for (let s = 0; s < sets.length; s++) {
              await sql`
                INSERT INTO sets (match_id, set_number, team1_score, team2_score, created_at)
                VALUES (${match.id}, ${s + 1}, ${sets[s].team1}, ${sets[s].team2}, NOW())
              `;
            }

            totalMatchsPoules++;
          }
        }
      }

      console.log(`      ✓ ${totalMatchsPoules} matchs de poules générés`);

      // Calculer les classements des poules et sélectionner les 16 meilleures équipes
      const equipesAvecStats = await Promise.all(
        equipes.map(async (equipe) => {
          const [stats] = await sql`
            SELECT
              COUNT(CASE WHEN winner_id = ${equipe.id} THEN 1 END)::int as victoires,
              COUNT(*)::int as matchs_joues,
              COALESCE(SUM(
                CASE
                  WHEN team1_id = ${equipe.id} THEN
                    (SELECT COUNT(*) FROM sets WHERE match_id = matches.id AND team1_score > team2_score)
                  WHEN team2_id = ${equipe.id} THEN
                    (SELECT COUNT(*) FROM sets WHERE match_id = matches.id AND team2_score > team1_score)
                END
              ), 0)::int as sets_gagnes,
              COALESCE(SUM(
                CASE
                  WHEN team1_id = ${equipe.id} THEN
                    (SELECT SUM(team1_score) FROM sets WHERE match_id = matches.id)
                  WHEN team2_id = ${equipe.id} THEN
                    (SELECT SUM(team2_score) FROM sets WHERE match_id = matches.id)
                END
              ), 0)::int as jeux_gagnes
            FROM matches
            WHERE (team1_id = ${equipe.id} OR team2_id = ${equipe.id})
              AND status = 'completed'
              AND pool_id IS NOT NULL
          `;

          return {
            ...equipe,
            victoires: stats.victoires,
            matchs_joues: stats.matchs_joues,
            sets_gagnes: stats.sets_gagnes,
            jeux_gagnes: stats.jeux_gagnes,
          };
        })
      );

      // Trier par victoires, sets gagnés, jeux gagnés
      equipesAvecStats.sort((a, b) => {
        if (b.victoires !== a.victoires) return b.victoires - a.victoires;
        if (b.sets_gagnes !== a.sets_gagnes) return b.sets_gagnes - a.sets_gagnes;
        return b.jeux_gagnes - a.jeux_gagnes;
      });

      // Sélectionner les 16 meilleures
      const equipesQualifiees = equipesAvecStats.slice(0, 16);
      console.log(`      ✓ 16 équipes qualifiées pour les phases finales`);

      // Créer les rounds de phases finales
      const rounds = [
        { number: 1, name: "16èmes de finale", matches: 8 },
        { number: 2, name: "8èmes de finale", matches: 4 },
        { number: 3, name: "Quarts de finale", matches: 2 },
        { number: 4, name: "Demi-finales", matches: 1 },
        { number: 5, name: "Finale", matches: 1 },
      ];

      for (const round of rounds) {
        await sql`
          INSERT INTO playoff_rounds (tournament_id, round_number, round_name, created_at)
          VALUES (${tournoi.id}, ${round.number}, ${round.name}, NOW())
        `;
      }

      // Générer les matchs des phases finales
      let equipesRestantes = [...equipesQualifiees];
      let totalMatchsPlayoffs = 0;

      for (const round of rounds) {
        const nbMatchs = Math.floor(equipesRestantes.length / 2);
        const gagnants: typeof equipesQualifiees = [];

        for (let m = 0; m < nbMatchs; m++) {
          const team1 = equipesRestantes[m * 2];
          const team2 = equipesRestantes[m * 2 + 1];

          if (!team1 || !team2) break;

          const { sets, winnerId } = genererScoresMatch();
          const winnerTeam = winnerId === 1 ? team1 : team2;

          const [match] = await sql`
            INSERT INTO matches (
              tournament_id, round_number, match_number,
              team1_id, team2_id, winner_id, status, created_at
            )
            VALUES (
              ${tournoi.id}, ${round.number}, ${m + 1},
              ${team1.id}, ${team2.id}, ${winnerTeam.id}, 'completed', NOW()
            )
            RETURNING id
          `;

          // Créer les sets
          for (let s = 0; s < sets.length; s++) {
            await sql`
              INSERT INTO sets (match_id, set_number, team1_score, team2_score, created_at)
              VALUES (${match.id}, ${s + 1}, ${sets[s].team1}, ${sets[s].team2}, NOW())
            `;
          }

          gagnants.push(winnerTeam);
          totalMatchsPlayoffs++;
        }

        equipesRestantes = gagnants;
      }

      console.log(`      ✓ ${totalMatchsPlayoffs} matchs de phases finales générés`);

      // Définir le vainqueur du tournoi
      if (equipesRestantes.length > 0) {
        await sql`
          UPDATE tournaments
          SET winner_id = ${equipesRestantes[0].id}
          WHERE id = ${tournoi.id}
        `;
        console.log(`      🏆 Vainqueur: ${equipesRestantes[0].name}`);
      }
    }

    console.log("\n━".repeat(60));
    console.log("✅ Génération terminée avec succès !");
    console.log("\n📊 Résumé:");
    console.log(`   • 100 joueurs`);
    console.log(`   • 10 tournois`);
    console.log(`   • ~20-25 équipes par tournoi`);
    console.log(`   • ~200-300 matchs de poules`);
    console.log(`   • 150 matchs de phases finales (15 par tournoi)`);

  } catch (error) {
    console.error("\n❌ Erreur lors de la génération:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

main();
