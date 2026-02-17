DO $$
DECLARE
  v_tournament_id uuid;
BEGIN
  SELECT id INTO v_tournament_id
  FROM public.tournaments
  WHERE slug = 'fev2026';

  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Tournament slug fev2026 not found';
  END IF;

  WITH new_players AS (
    INSERT INTO public.players (
      first_name,
      last_name,
      email,
      phone,
      level,
      is_ranked,
      ranking,
      play_preference
    ) VALUES
      ('Julien','Martin','julien.martin.fev202601@exemple.fr','0610000001','P250',true,'P500','droite'),
      ('Claire','Dubois','claire.dubois.fev202602@exemple.fr','0610000002','P250',false,NULL,'gauche'),
      ('Thomas','Bernard','thomas.bernard.fev202603@exemple.fr','0610000003','P100',true,'P250','aucune'),
      ('Sophie','Petit','sophie.petit.fev202604@exemple.fr','0610000004','P250',false,NULL,'droite'),
      ('Lucas','Robert','lucas.robert.fev202605@exemple.fr','0610000005','P500',true,'P500','gauche'),
      ('Emma','Richard','emma.richard.fev202606@exemple.fr','0610000006','P100',false,NULL,'aucune'),
      ('Maxime','Durand','maxime.durand.fev202607@exemple.fr','0610000007','P250',true,'P100','droite'),
      ('Camille','Moreau','camille.moreau.fev202608@exemple.fr','0610000008','P500',false,NULL,'gauche'),
      ('Hugo','Laurent','hugo.laurent.fev202609@exemple.fr','0610000009','P100',true,'P250','droite'),
      ('Lea','Simon','lea.simon.fev202610@exemple.fr','0610000010','P250',false,NULL,'aucune'),
      ('Antoine','Michel','antoine.michel.fev202611@exemple.fr','0610000011','P500',true,'P500','gauche'),
      ('Manon','Lefevre','manon.lefevre.fev202612@exemple.fr','0610000012','P100',false,NULL,'droite'),
      ('Romain','Garcia','romain.garcia.fev202613@exemple.fr','0610000013','P250',true,'P250','aucune'),
      ('Chloe','David','chloe.david.fev202614@exemple.fr','0610000014','P500',false,NULL,'gauche'),
      ('Adrien','Roux','adrien.roux.fev202615@exemple.fr','0610000015','P100',true,'P100','droite'),
      ('Sarah','Vincent','sarah.vincent.fev202616@exemple.fr','0610000016','P250',false,NULL,'aucune'),
      ('Nicolas','Fournier','nicolas.fournier.fev202617@exemple.fr','0610000017','P500',true,'P250','gauche'),
      ('Pauline','Morel','pauline.morel.fev202618@exemple.fr','0610000018','P100',false,NULL,'droite'),
      ('Quentin','Girard','quentin.girard.fev202619@exemple.fr','0610000019','P250',true,'P500','aucune'),
      ('Laura','Andre','laura.andre.fev202620@exemple.fr','0610000020','P500',false,NULL,'gauche'),
      ('Olivier','Lefort','olivier.lefort.fev202621@exemple.fr','0610000021','P100',true,'P250','droite'),
      ('Alice','Lambert','alice.lambert.fev202622@exemple.fr','0610000022','P250',false,NULL,'aucune'),
      ('Pierre','Fontaine','pierre.fontaine.fev202623@exemple.fr','0610000023','P500',true,'P100','gauche'),
      ('Julie','Rousseau','julie.rousseau.fev202624@exemple.fr','0610000024','P100',false,NULL,'droite'),
      ('Victor','Mercier','victor.mercier.fev202625@exemple.fr','0610000025','P250',true,'P250','aucune'),
      ('Marine','Blanchard','marine.blanchard.fev202626@exemple.fr','0610000026','P500',false,NULL,'gauche'),
      ('Baptiste','Chevalier','baptiste.chevalier.fev202627@exemple.fr','0610000027','P100',true,'P500','droite'),
      ('Elise','Gauthier','elise.gauthier.fev202628@exemple.fr','0610000028','P250',false,NULL,'aucune'),
      ('Benjamin','Payet','benjamin.payet.fev202629@exemple.fr','0610000029','P500',true,'P250','gauche'),
      ('Anais','Renault','anais.renault.fev202630@exemple.fr','0610000030','P100',false,NULL,'droite'),
      ('Kevin','Dupont','kevin.dupont.fev202631@exemple.fr','0610000031','P250',true,'P100','aucune'),
      ('Marion','Lemoine','marion.lemoine.fev202632@exemple.fr','0610000032','P500',false,NULL,'gauche'),
      ('Jeremy','Rolland','jeremy.rolland.fev202633@exemple.fr','0610000033','P100',true,'P250','droite'),
      ('Audrey','Perrin','audrey.perrin.fev202634@exemple.fr','0610000034','P250',false,NULL,'aucune'),
      ('Alexandre','Lopez','alexandre.lopez.fev202635@exemple.fr','0610000035','P500',true,'P500','gauche'),
      ('Helene','Brun','helene.brun.fev202636@exemple.fr','0610000036','P100',false,NULL,'droite'),
      ('Guillaume','Bertrand','guillaume.bertrand.fev202637@exemple.fr','0610000037','P250',true,'P250','aucune'),
      ('Noemie','Colin','noemie.colin.fev202638@exemple.fr','0610000038','P500',false,NULL,'gauche'),
      ('Florian','Caron','florian.caron.fev202639@exemple.fr','0610000039','P100',true,'P100','droite'),
      ('Ines','Masson','ines.masson.fev202640@exemple.fr','0610000040','P250',false,NULL,'aucune'),
      ('Mathieu','Boucher','mathieu.boucher.fev202641@exemple.fr','0610000041','P500',true,'P250','gauche'),
      ('Lucie','Rey','lucie.rey.fev202642@exemple.fr','0610000042','P100',false,NULL,'droite'),
      ('Cedric','Leblanc','cedric.leblanc.fev202643@exemple.fr','0610000043','P250',true,'P500','aucune'),
      ('Justine','Marchand','justine.marchand.fev202644@exemple.fr','0610000044','P500',false,NULL,'gauche'),
      ('Franck','Dumas','franck.dumas.fev202645@exemple.fr','0610000045','P100',true,'P250','droite'),
      ('Laure','Schmitt','laure.schmitt.fev202646@exemple.fr','0610000046','P250',false,NULL,'aucune'),
      ('Yannick','Noel','yannick.noel.fev202647@exemple.fr','0610000047','P500',true,'P100','gauche'),
      ('Clara','Meunier','clara.meunier.fev202648@exemple.fr','0610000048','P100',false,NULL,'droite'),
      ('Samuel','Aubert','samuel.aubert.fev202649@exemple.fr','0610000049','P250',true,'P250','aucune'),
      ('Oceane','Faure','oceane.faure.fev202650@exemple.fr','0610000050','P500',false,NULL,'gauche')
    RETURNING id
  )
  INSERT INTO public.registrations (
    tournament_id,
    player_id,
    status,
    payment_status
  )
  SELECT v_tournament_id, id, 'pending', false
  FROM new_players;
END $$;
