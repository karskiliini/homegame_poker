# Vaihe 1.4 — Pöytäanimaatiot & visuaaliefektit

## Scope

4 uutta animaatiota (dealer-napin siirto ja fold-animaatio jo valmiita):

1. **All-in Spotlight** — pöytä himmenee, all-in pelaajat + community cards kirkkaana
2. **Royal/Straight Flush -juhlinta** — kultainen säteily + confetti
3. **Winner-banneri** — käden nimi animoituna voittajan kohdalle
4. **"The Nuts" -efekti** — erikoisefekti kun voittajalla paras mahdollinen käsi

## 1. All-in Spotlight

**Triggeri:** `ALLIN_SHOWDOWN` socket-event (kaikki aktiiviset pelaajat all-in)

**Visuaali:**
- Tumma overlay koko pöydän päälle (rgba(0,0,0,0.6), fade-in 800ms)
- All-in pelaajien seatit nostetaan overlay:n yläpuolelle (z-index)
- Community cards nostetaan overlay:n yläpuolelle
- Poistuu fade-out 600ms kun HAND_RESULT saapuu

**Toteutus:**
- `PokerTable.tsx`: uusi overlay-div, ohjataan `allInSpotlight`-flagilla
- `useTableAnimations.ts`: setti `allInSpotlight = true` ALLIN_SHOWDOWN:issa, false HAND_RESULT:issa
- CSS: `animate-spotlight-in` (800ms fade) ja `animate-spotlight-out` (600ms fade)

## 2. Royal/Straight Flush -juhlinta

**Triggeri:** POT_AWARD-event jossa `handRank === 'royal_flush' || handRank === 'straight_flush'`

**Visuaali (2 vaihetta):**
- **Vaihe 1 (0–1.5s):** Voittavien korttien ympärille laajeneva kultainen radial glow
- **Vaihe 2 (1–4s):** Confettihiukkaset putoavat ylhäältä (CSS-animoidut divit, 30–50 hiukkasta). Pienet starburst-räjähdykset korttien ympärillä.

**Toteutus:**
- Uusi `RoyalFlushCelebration.tsx` -komponentti PokerTable:n sisällä
- Confetti: 40 absolute-positioned div-hiukkasta, satunnaiset värit/koot/viiveet
- CSS keyframes: `confetti-fall` (3.5s, ylhäältä alas + sivusuuntainen sway), `starburst` (0.8s scale + fade)
- Serveri: POT_AWARD-eventiin lisätään `handRank: string`

## 3. Winner-banneri

**Triggeri:** POT_AWARD-event (jokaiselle voittajalle)

**Visuaali:**
- Voittajan seatin yläpuolelle ilmestyy banneri:
  - Rivi 1: käden tyyppi isolla (**"FULL HOUSE"**)
  - Rivi 2: tarkenne pienemmällä ("Aces full of Kings")
- Scale-in (0→1, 500ms overshoot), kultainen glow, häipyy 2.5s jälkeen
- Teksti on kultainen gradient (Full Tilt -tyyli)

**Toteutus:**
- `WinnerBanner.tsx` -komponentti, renderöidään PlayerSeatin yhteyteen
- `useTableAnimations.ts`: tallennetaan `winnerBanners: Map<seatIndex, {handName, isNuts}>`, tyhjennetään timeoutilla
- Serveri: POT_AWARD-eventiin lisätään `handName: string` (esim. "Full House, Aces full of Kings")
- CSS: `animate-winner-banner-in` (500ms), `animate-winner-banner-out` (400ms)

## 4. "The Nuts" -efekti

**Triggeri:** POT_AWARD-event jossa `isNuts: true`

**Visuaali:**
- Winner-bannerin sijaan/päälle: "THE NUTS!" kultaisena tekstinä
- Voimakkaampi glow-efekti, säteilyanimaatio (radial pulse)
- Käden nimi näytetään alla normaalisti

**Serverilogiikka (nuts-laskenta):**
- Käy läpi kaikki mahdolliset 2-kortin yhdistelmät jäljellä olevasta pakasta + muiden pelaajien tunnetut kortit
- Laske paras mahdollinen käsi jokaiselle yhdistelmälle boardin kanssa
- Jos voittajan käsi ≥ kaikkia mahdollisia käsiä → `isNuts: true`
- Optimointi: 45 yhdistelmää (C(remaining,2)), nopea laskenta

**Toteutus:**
- `server/src/evaluation/hand-rank.ts`: uusi `isNuts(board, holeCards, knownCards)` -funktio
- POT_AWARD-eventiin lisätään `isNuts: boolean`
- Client: WinnerBanner renderöi "THE NUTS!" -variantin kun isNuts=true
- CSS: `animate-nuts-glow` (pulsing radial, voimakkaampi kuin normaali winner)

## Serverimuutokset yhteenveto

POT_AWARD-eventin uudet kentät:
```typescript
{
  awards: { seatIndex, amount }[],
  potIndex: number,
  winningCards: string[],
  handName: string,      // NEW: "Full House, Aces full of Kings"
  handRank: string,      // NEW: "full_house", "royal_flush", etc.
  isNuts: boolean         // NEW: true if winning hand is the nuts
}
```

## Tiedostot

| Tiedosto | Muutos |
|----------|--------|
| `server/src/game/GameManager.ts` | POT_AWARD-eventin laajennos |
| `server/src/evaluation/hand-rank.ts` | `isNuts()`, `getHandName()` |
| `shared/src/types/socket-events.ts` | POT_AWARD-tyyppi päivittyy |
| `client/src/hooks/useTableAnimations.ts` | spotlight, winner banner, celebration state |
| `client/src/views/table/PokerTable.tsx` | overlay, uudet komponentit |
| `client/src/views/table/WinnerBanner.tsx` | **UUSI** |
| `client/src/views/table/RoyalFlushCelebration.tsx` | **UUSI** |
| `client/src/styles/index.css` | Uudet keyframes |
