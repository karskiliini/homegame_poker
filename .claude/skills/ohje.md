---
name: ohje
description: Näyttää ohjeet serverin käynnistämiseen ja clientien yhdistämiseen
user_invocable: true
---

Tulosta seuraava ohje käyttäjälle:

## Kehitystila (dev)

```bash
bun run dev
```

Käynnistää sekä serverin (portti 3000) että Vite-clientin (portti 5173) samaan aikaan.

- **Pelaajat (sama kone):** `http://localhost:5173`
- **Pelaajat (puhelimella):** `http://<koneen-ip>:5173` (esim. `http://192.168.1.100:5173`)

Vite proxyy WebSocket-yhteydet automaattisesti serverille.

## Tuotantotila (lokaali)

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

Serveri tarjoaa buildin suoraan:

- **Pelaajat (sama kone):** `http://localhost:3000`
- **Pelaajat (puhelimella):** `http://<koneen-ip>:3000` (esim. `http://192.168.1.100:3000`)

## IP-osoite ja lähiverkko

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

- **Pelaajat:** avaa selaimella `https://pokersofta.vercel.app`

### Deploy-komennot

```bash
# Client (Vercel) — pushaa main-branchiin tai manuaalisesti:
vercel --prod

# Serveri (Railway) — deployaa automaattisesti main-pushista tai:
railway up
```
