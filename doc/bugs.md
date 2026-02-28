
-[DONE] olen dealer, mutta en näe toimintanappeja, vain fold to any bet tai (auto) check.
-[DONE] muck or show doesn't work. Even if I say show -> it doesn't show the cards.
-[DONE] Create table -nappi ei navigoi watching-näkymään. Juurisyy: Railway-palvelimella oli vanha single-table-koodi ilman multi-table lobbyä. Korjattu: 1) deployattu uusin koodi Railwaylle, 2) lisätty Socket.IO ack-callback create table -flowiin, 3) lisätty connection status -indikaattori (vihreä/punainen pallo) lobbynäkymään.
- Pöydän muoto ei saa muuttua ikkunan koon mukaan. Pöydän tulee säilyttää kiinteä aspect ratio riippumatta selainikkunan koosta.
- Disconnected pelaaja ei voi refreshin jälkeen palata istumaan samaan pöytään.
- Pelaaja ei voi valita omaa istuintaan pelipöytään istuttaessa. Jokainen tyhjä paikka näyttää "Seat <nr>" -tekstin. Hoverin aikana paikan päälle ilmestyy kevyesti pumppaava "Sit In" -teksti vihreällä pohjalla ja hieman glow-efektiä taustalla. Klikkaus istuttaa pelaajan valittuun paikkaan.
