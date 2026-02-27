---
name: ohje
description: Näyttää ohjeet serverin käynnistämiseen ja clientien yhdistämiseen
user_invocable: true
---

Tulosta seuraava ohje käyttäjälle:

## Serverin käynnistys

```bash
bun run start -- --small-blind 1 --big-blind 2 --max-buy-in 200 --game nlhe
```

Parametrit ovat säädettävissä:
- `--small-blind <summa>` — pieni sokko (oletus: 1)
- `--big-blind <summa>` — iso sokko (oletus: 2)
- `--max-buy-in <summa>` — maksimi sisäänosto (oletus: 200)
- `--game <nlhe|plo>` — pelityyppi (oletus: nlhe)
- `--action-time <sekunnit>` — aikaraja toiminnolle (oletus: 30)
- `--port <portti>` — portti (oletus: 3000)

## Clientien yhdistäminen

Serveri käynnistyy osoitteeseen `http://localhost:3000`.

- **TV/pöytänäkymä:** avaa tietokoneella `http://localhost:3000/table`
- **Pelaajat:** avaa puhelimella `http://<koneen-ip>:3000` (esim. `http://192.168.1.100:3000`)

Pelaajien tulee olla samassa lähiverkossa (Wi-Fi) kuin serveri. Koneen IP-osoitteen saat komennolla:
```bash
ipconfig getifaddr en0
```

## Tuotantoympäristö (Vercel + Railway)

**Serveri** pyörii Railwayssa. **Client** on deployattu Verceliin.

### Vercel-ympäristömuuttuja

Vercel-projektiin täytyy asettaa ympäristömuuttuja, joka osoittaa Railway-serveriin:
```
VITE_SERVER_URL=https://<railway-app>.up.railway.app
```
Tämän voi asettaa Vercelin dashboardissa (Settings → Environment Variables) tai CLI:llä:
```bash
vercel env add VITE_SERVER_URL
```

### Clientien avaaminen

- **Pelaajat:** avaa Vercel-URL puhelimella (esim. `https://homegame-poker.vercel.app`)
- **TV/pöytänäkymä:** avaa sama URL + `/table` tietokoneella

### Deploy-komennot

```bash
# Client (Vercel) — pushaa main-branchiin tai manuaalisesti:
vercel --prod

# Serveri (Railway) — deployaa automaattisesti main-pushista tai:
railway up
```
