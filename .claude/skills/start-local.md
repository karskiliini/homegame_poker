---
name: start-local
description: Käynnistää paikallisen kehityspalvelimen uudelleen ja näyttää linkit pöydälle ja pelaajille
user_invocable: true
---

Tee seuraavat asiat järjestyksessä:

1. **Tapa vanhat prosessit** — Tapa kaikki prosessit jotka kuuntelevat portteja 3000 ja 5173 (käytä `lsof -ti :3000 -ti :5173 | xargs kill -9 2>/dev/null || true`)

2. **Käynnistä dev-moodi** — Aja `bun run dev` taustalla (background). Odota muutama sekunti ja tarkista että molemmat portit (3000 ja 5173) ovat päällä.

3. **Hae koneen IP** — Aja `ipconfig getifaddr en0` saadaksesi lähiverkon IP-osoitteen.

4. **Avaa selainikkunat** — Aja seuraavat komennot avataksesi kaksi selainikkunaa (2 pelaajaa):
   - `open http://localhost:5173`
   - `open -na "Google Chrome" --args --incognito http://localhost:5173`

5. **Hae koneen IP** — Aja `ipconfig getifaddr en0` (tai fallback `en1` / `ifconfig`) saadaksesi lähiverkon IP-osoitteen.

6. **Tulosta linkit** käyttäjälle tässä muodossa (korvaa IP oikealla arvolla):

---

**Serveri käynnistetty!**

Selainikkunat avattu: 2 pelaajaa (toinen incognito).

| Näkymä | URL |
|--------|-----|
| Pelaaja 1 | http://localhost:5173 |
| Pelaaja 2 | http://localhost:5173 (incognito) |
| Pelaaja puhelimella | http://<IP>:5173 |

---
