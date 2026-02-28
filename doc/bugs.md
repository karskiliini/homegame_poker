
-[DONE] olen dealer, mutta en näe toimintanappeja, vain fold to any bet tai (auto) check.
-[DONE] muck or show doesn't work. Even if I say show -> it doesn't show the cards.
-[DONE] Create table -nappi ei navigoi watching-näkymään. Juurisyy: Railway-palvelimella oli vanha single-table-koodi ilman multi-table lobbyä. Korjattu: 1) deployattu uusin koodi Railwaylle, 2) lisätty Socket.IO ack-callback create table -flowiin, 3) lisätty connection status -indikaattori (vihreä/punainen pallo) lobbynäkymään.
