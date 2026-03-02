---
name: sync-layout
description: Hakee layout-positiot palvelimen tietokannasta ja päivittää ne lähdetiedostoon (client/src/views/table/layout-positions.ts)
user_invocable: true
---

Hae layout-positiot palvelimen tietokannasta ja kirjoita ne source-tiedostoon:

1. **Hae positiot** — `curl -s http://localhost:3000/api/layout-positions`. Jos serveri ei vastaa, kokeile myös Railway-osoitetta: `curl -s https://homegame-poker-production.up.railway.app/api/layout-positions`

2. **Validoi vastaus** — Tarkista että JSON sisältää kentät: `SEAT_POSITIONS` (10 paikkaa), `BET_POSITIONS` (10 paikkaa), `POT_CENTER`, `COMMUNITY_CARDS_POS`, `GAME_INFO_POS`, `WINNING_HAND_POS`, `DECK_POS`, `DEALER_BTN_OFFSET`, `CARD_OFFSET_DISTANCE`. Jos vastaus sisältää `error`-kentän, ilmoita käyttäjälle ettei positioita ole tallennettu vielä.

3. **Kirjoita tiedosto** — Päivitä `client/src/views/table/layout-positions.ts` uusilla arvoilla. Käytä samaa formaattia kuin tiedostossa on nyt (TypeScript-vakiot, kommentit seat-indekseillä). Pyöristä kaikki arvot kokonaisluvuiksi.

4. **Vahvista** — Tulosta mitä muuttui (vertaa vanhaan) ja ilmoita onnistumisesta.
