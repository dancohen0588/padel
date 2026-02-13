/**
 * Script de génération de données de test pour la base de données
 * Version 2 - Adapté au schéma réel
 *
 * Usage:
 *   npx tsx seed-database-v2.ts
 *
 * Génère:
 * - 100 joueurs avec noms réels
 * - 10 tournois sur les 2 dernières années
 * - Entre 15 et 30 équipes par tournoi
 * - Matchs de poules et phases finales avec résultats aléatoires
 */

import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 10,
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

const nomsLieux = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg",
  "Bordeaux", "Lille", "Rennes"
];

const niveaux = ["beginner", "intermediate", "advanced", "expert"];

function genererEmail(prenom: string, nom: string): string {
  const domaines = ["gmail.com", "hotmail.fr"];
  const domaine = domaines[Math.floor(Math.random() * domaines.length)];
  return `${prenom.toLowerCase()}.${nom.toLowerCase()}@${domaine}`;
}

function genererSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function melanger<T>(tableau: T[]): T[] {
  const resultat = [...tableau];
  for (let i = resultat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
  }
  return resultat;
}

function genererScoreSet(equipeGagnante: "a" | "b"): { team_a: number; team_b: number } {
  const scoreGagnant = 6;
  const scorePerdant = Math.random() < 0.7
    ? Math.floor(Math.random() * 5)
    : Math.random() < 0.5
      ? 5
      : 7;

  if (equipeGagnante === "a") {
    return { team_a: scoreGagnant, team_b: scorePerdant };
  } else {
    return { team_a: scorePerdant, team_b: scoreGagnant };
  }
}

function genererScoresMatch(): {
  sets: Array<{ team_a: number; team_b: number }>;
  winnerId: "a" | "b";
  sets_won_a: number;
  sets_won_b: number;
} {
  const nbSets = Math.random() < 0.6 ? 2 : 3;
  const winnerId: "a" | "b" = Math.random() < 0.5 ? "a" : "b";

  let setsGagnesA = 0;
  let setsGagnesB = 0;
  const sets: Array<{ team_a: number; team_b: number }> = [];

  while (setsGagnesA < 2 && setsGagnesB < 2 && sets.length < nbSets) {
    const dernierSet = sets.length === 2;
    let gagnantSet: "a" | "b";

    if (dernierSet) {
      gagnantSet = winnerId;
    } else {
      gagnantSet = Math.random() < (winnerId === "a" ? 0.6 : 0.4) ? "a" : "b";
    }

    const scoreSet = genererScoreSet(gagnantSet);
    sets.push(scoreSet);

    if (gagnantSet === "a") setsGagnesA++;
    else setsGagnesB++;
  }

  return { sets, winnerId, sets_won_a: setsGagnesA, sets_won_b: setsGagnesB };
}

async function main() {
  console.log("🎾 Génération des données de test pour Le Tournoi des Frérots");
  console.log("━".repeat(60));

  try {
    // 1. GÉNÉRATION DES JOUEURS
    console.log("\n📝 Génération de 100 joueurs...");

    const joueurs: Array<{ id: string; prenom: string; nom: string }> = [];
    const nomsComplets = new Set<string>();

    for (let i = 0; i < 100; i++) {
      let prenom: string, nom: string, nomComplet: string;
      do {
        prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
        nom = noms[Math.floor(Math.random() * noms.length)];
        nomComplet = `${prenom} ${nom}`;
      } while (nomsComplets.has(nomComplet));

      nomsComplets.add(nomComplet);

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
    dateDebut.setMonth(dateDebut.getMonth() - 24);

    for (let t = 0; t < 10; t++) {
      const dateTournoi = new Date(dateDebut);
      dateTournoi.setMonth(dateTournoi.getMonth() + t * 2 + Math.floor(Math.random() * 2));

      const lieu = nomsLieux[t % nomsLieux.length];
      const nomTournoi = `Tournoi ${lieu} ${dateTournoi.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
      const slug = genererSlug(nomTournoi);

      const [tournoi] = await sql`
        INSERT INTO tournaments (name, slug, date, location, status, max_players, config, created_at)
        VALUES (
          ${nomTournoi},
          ${slug},
          ${dateTournoi.toISOString().split('T')[0]},
          ${`Club de ${lieu}`},
          'published',
          64,
          '{"teams_qualified": 16}'::jsonb,
          NOW()
        )
        RETURNING id, name
      `;

      console.log(`\n   🎾 ${tournoi.name}`);

      const nbEquipes = 15 + Math.floor(Math.random() * 16);
      console.log(`      Équipes: ${nbEquipes}`);

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

        await sql`
          INSERT INTO team_players (team_id, player_id, created_at)
          VALUES
            (${equipe.id}, ${joueur1.id}, NOW()),
            (${equipe.id}, ${joueur2.id}, NOW())
        `;

        await sql`
          INSERT INTO registrations (tournament_id, player_id, status, registered_at)
          VALUES
            (${tournoi.id}, ${joueur1.id}, 'approved', NOW()),
            (${tournoi.id}, ${joueur2.id}, 'approved', NOW())
        `;

        equipes.push({
          id: equipe.id,
          name: equipe.name,
          players: [joueur1.id, joueur2.id],
        });
      }

      console.log(`      ✓ ${equipes.length} équipes créées`);

      const nbPoules = Math.min(7, Math.max(4, Math.floor(equipes.length / 4)));
      console.log(`      Poules: ${nbPoules}`);

      const poules: Array<{ id: string; name: string; teams: string[] }> = [];

      for (let p = 0; p < nbPoules; p++) {
        const nomPoule = `Poule ${String.fromCharCode(65 + p)}`;

        const [poule] = await sql`
          INSERT INTO pools (tournament_id, name, pool_order, created_at)
          VALUES (${tournoi.id}, ${nomPoule}, ${p}, NOW())
          RETURNING id, name
        `;

        poules.push({
          id: poule.id,
          name: poule.name,
          teams: [],
        });
      }

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

      console.log(`      ✓ ${nbPoules} poules créées`);

      let totalMatchsPoules = 0;
      for (const poule of poules) {
        const teamsInPool = poule.teams;

        for (let i = 0; i < teamsInPool.length; i++) {
          for (let j = i + 1; j < teamsInPool.length; j++) {
            const { sets, winnerId, sets_won_a, sets_won_b } = genererScoresMatch();
            const winnerTeamId = winnerId === "a" ? teamsInPool[i] : teamsInPool[j];

            const games_won_a = sets.reduce((sum, set) => sum + set.team_a, 0);
            const games_won_b = sets.reduce((sum, set) => sum + set.team_b, 0);

            const [match] = await sql`
              INSERT INTO matches (
                tournament_id, pool_id,
                team_a_id, team_b_id, winner_team_id,
                sets_won_a, sets_won_b,
                games_won_a, games_won_b,
                status, created_at
              )
              VALUES (
                ${tournoi.id}, ${poule.id},
                ${teamsInPool[i]}, ${teamsInPool[j]}, ${winnerTeamId},
                ${sets_won_a}, ${sets_won_b},
                ${games_won_a}, ${games_won_b},
                'finished', NOW()
              )
              RETURNING id
            `;

            for (let s = 0; s < sets.length; s++) {
              await sql`
                INSERT INTO match_sets (match_id, set_order, team_a_games, team_b_games, created_at)
                VALUES (${match.id}, ${s + 1}, ${sets[s].team_a}, ${sets[s].team_b}, NOW())
              `;
            }

            totalMatchsPoules++;
          }
        }
      }

      console.log(`      ✓ ${totalMatchsPoules} matchs de poules générés`);

      // Classement et qualification
      const equipesAvecStats = await Promise.all(
        equipes.map(async (equipe) => {
          const [stats] = await sql`
            SELECT
              COUNT(CASE WHEN winner_team_id = ${equipe.id} THEN 1 END)::int as victoires,
              COALESCE(SUM(
                CASE
                  WHEN team_a_id = ${equipe.id} THEN sets_won_a
                  WHEN team_b_id = ${equipe.id} THEN sets_won_b
                  ELSE 0
                END
              ), 0)::int as sets_gagnes,
              COALESCE(SUM(
                CASE
                  WHEN team_a_id = ${equipe.id} THEN games_won_a
                  WHEN team_b_id = ${equipe.id} THEN games_won_b
                  ELSE 0
                END
              ), 0)::int as jeux_gagnes
            FROM matches
            WHERE (team_a_id = ${equipe.id} OR team_b_id = ${equipe.id})
              AND status = 'finished'
              AND pool_id IS NOT NULL
          `;

          return {
            ...equipe,
            victoires: stats.victoires,
            sets_gagnes: stats.sets_gagnes,
            jeux_gagnes: stats.jeux_gagnes,
          };
        })
      );

      equipesAvecStats.sort((a, b) => {
        if (b.victoires !== a.victoires) return b.victoires - a.victoires;
        if (b.sets_gagnes !== a.sets_gagnes) return b.sets_gagnes - a.sets_gagnes;
        return b.jeux_gagnes - a.jeux_gagnes;
      });

      const equipesQualifiees = equipesAvecStats.slice(0, 16);
      console.log(`      ✓ 16 équipes qualifiées`);

      // Phases finales
      const rounds = [
        { number: 1, name: "16èmes de finale" },
        { number: 2, name: "8èmes de finale" },
        { number: 3, name: "Quarts de finale" },
        { number: 4, name: "Demi-finales" },
        { number: 5, name: "Finale" },
      ];

      const roundIds: Record<number, string> = {};
      for (const round of rounds) {
        const [r] = await sql`
          INSERT INTO playoff_rounds (tournament_id, round_number, round_name, created_at)
          VALUES (${tournoi.id}, ${round.number}, ${round.name}, NOW())
          RETURNING id
        `;
        roundIds[round.number] = r.id;
      }

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
          const winnerTeam = winnerId === "a" ? team1 : team2;

          const [match] = await sql`
            INSERT INTO playoff_matches (
              tournament_id, round_id, match_number,
              team1_id, team2_id, winner_id,
              status, created_at
            )
            VALUES (
              ${tournoi.id}, ${roundIds[round.number]}, ${m + 1},
              ${team1.id}, ${team2.id}, ${winnerTeam.id},
              'completed', NOW()
            )
            RETURNING id
          `;

          for (let s = 0; s < sets.length; s++) {
            await sql`
              INSERT INTO playoff_sets (match_id, set_number, team1_score, team2_score, created_at)
              VALUES (${match.id}, ${s + 1}, ${sets[s].team_a}, ${sets[s].team_b}, NOW())
            `;
          }

          gagnants.push(winnerTeam);
          totalMatchsPlayoffs++;
        }

        equipesRestantes = gagnants;
      }

      console.log(`      ✓ ${totalMatchsPlayoffs} matchs de playoffs générés`);
      if (equipesRestantes[0]) {
        console.log(`      🏆 Vainqueur: ${equipesRestantes[0].name}`);
      }
    }

    console.log("\n━".repeat(60));
    console.log("✅ Génération terminée avec succès !");
    console.log("\n📊 Résumé:");
    console.log(`   • 100 joueurs`);
    console.log(`   • 10 tournois`);
    console.log(`   • ~200-250 équipes`);
    console.log(`   • ~1500-2000 matchs`);

  } catch (error) {
    console.error("\n❌ Erreur lors de la génération:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

main();
