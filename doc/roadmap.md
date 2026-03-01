# Poker Softa Roadmap — Full Tilt Poker -henkinen kotipeliapplikaatio

> Pitkän aikavälin kehityssuunnitelma. Tavoite: luoda paras mahdollinen kotipokerisovellus,
> joka ammentaa inspiraationsa Full Tilt Pokerin legendaarisesta käyttökokemuksesta.
>
> **Nykytila:** Toimiva NLHE-pelimoottori, TV-pöytänäkymä, pelaajien puhelinnäkymä,
> Run It Twice, show/muck, pre-action-napit, käsihistoria, ääniefektit, chippianimaatiot.

---

## Vaihe -1: Tärkein asia ensin:
tuki useille kielille. Default: Suomi, vaihtoehtona Englanti. Pieni lippukuvake yläkulmassa lobby näkymässä mahdollistaa kielivalinnat.

## Vaihe 0 — Keskeneräisten ominaisuuksien viimeistely

> Prioriteetti: välitön. Perusasiat kuntoon ennen uusia ominaisuuksia.

### 0.1 Rebuy & Sit-Out -järjestelmän viimeistely
- [x] Rebuy-prompt UI pelaajan puhelimessa (serveri valmis, client puuttuu)
- [x] Sit-out -tilan visuaalinen esitys pöydällä (harmaa/himmennys)
- [x] Rejoin-nappi sit-out-pelaajalle
- [x] Testaus: koko flow pelaajan bustista → rebuy-prompt → rebuy → takaisin peliin

### 0.2 Chip Stack -visualisointi (suunnitelma olemassa)
- [x] Realistiset chippipinovisuaalit beteille ja poteille
- [x] Denominaatiot suhteessa BB:hen (valkoinen/punainen/vihreä/musta/sininen)
- [x] Animaatiot: chip fly seat→bet, collect bet→pot, pot award→winner

### 0.3 PLO:n viimeistely
- [x] 4 kättä PLO-pelaajille (nyt jaetaan vain 2)
- [x] PLO-käsienarviointi: paras 5 kortista 2 kädestä + 3 boardista
- [x] PLO pot-limit -betin laskenta
- [x] Testikattavuus PLO:lle

### 0.4 Käyttäjätilit & sähköpostikirjautuminen
- [ ] Sähköpostikirjautuminen: pelaaja rekisteröityy ja kirjautuu sähköpostilla (+ salasana tai magic link)
- [ ] Pelaajan saldo tallennetaan tietokantaan (pysyvä, sessioiden välillä)
- [ ] Buy-in vähennetään saldosta, cash-out lisätään saldoon
- [ ] Pelaajan profiili: nimi, avatar, sähköposti, saldohistoria
- [ ] Admin voi lisätä/poistaa saldoa pelaajalle (esim. käteismaksu → saldo)
- [x] Teeman mukainen pöydän taustakuva. Basic: green felt, cccp: Red felt with a with soviet star symbol in the middle. Make a wow effect.

---

## Vaihe 1 — Visuaalinen identiteetti & tunnelma

> Full Tiltin sielu oli sen visuaalinen persoonallisuus: sarjakuvamainen mutta tyylikäs,
> tumma ja tunnelmallinen. Tämä vaihe tekee sovelluksesta visuaalisesti vaikuttavan.

### 1.1 Pöytäteemat
- [ ] Tumma perusteema Full Tilt -henkisellä värimaailmalla
- [ ] 4–6 vaihdettavaa pöytäteemaa (esim. Classic Green, Midnight Blue, Vegas Gold, Arctic, Lava)
- [ ] Teeman vaihto asetuksista lennossa (TV-näkymä päivittyy reaaliajassa)
- [ ] Pöydän felt-tekstuuri ja reunukset CSS/SVG:llä
- [ ] Custom table felt & card backs — admin valitsee ulkoasun, pelaajat voivat valita oman card backin

### 1.2 Avataarijärjestelmän uudistus
- [x] **BUG:** Avatar-kuvat eivät ole keskitetty valintapallossa puhelinnäkymässä
- [ ] Siirtyminen emoji-avatareista kustomoituihin piirrettyihin hahmoihin (Full Tilt -tyyli)
  - Ninja, Cowgirl, Robot, Pirate, Wizard, Alien, Viking, Detective, Astronaut, Chef, Samurai, Vampire
  - Lisää uusia: Panda, Penguin, Shark, Lion, Phoenix, Dragon, Jester, Gladiator
- [ ] Jokaiselle avatarille 4 tunnetilaa: normaali, iloinen, vihainen, yllättynyt
  - Tunnetila vaihtuu automaattisesti: voitto → iloinen, häviö → vihainen, bad beat → yllättynyt
  - Pelaaja voi myös manuaalisesti vaihtaa tunnetilaa puhelimestaan (bluffi-emote)
- [ ] Avatarin valintanäkymän uudistus: galleria kategorioineen

### 1.3 Korttien ulkoasu
- [ ] Laadukkaat korttikuvat (SVG) selkeillä symboleilla
- [ ] 4-väri-pakka optio (treflat=vihreä, ruudut=sininen, hertat=punainen, padat=musta)
- [ ] Kortin kääntöanimaatio 3D-flipillä (olemassa, hienosäätö)
- [ ] Voittavan käden korttien korostus glow-efektillä

### 1.4 Pöytäanimaatiot & visuaaliefektit
- [x] Pakan sekoitusanimaatio käden alussa: pakka ilmestyy pöydän keskelle, sekoitetaan (teemakohtainen sekoitustyyli), kasataan yhteen, jaetaan pelaajille
- [ ] Dealer-napin siirtoanimaatio käsien välillä
- [ ] All-in -tilanne: dramaattinen efekti (esim. valaistuksen muutos, pulssi)
- [ ] Royal Flush / Straight Flush: erikoisanimaatio (confetti/fireworks)
- [ ] Winner-ilmoitus: bannerianimaatio voittajan kohdalla
- [ ] Fold-animaatio: kortit liukuvat pois pöydältä
- [x] Bad beat -animaatio: erikoisefekti suck-outille (Full Tilt -tyylinen räjähdys)
- [ ] "The Nuts" -ilmoitus: erikoisefekti showdownissa kun pelaajalla on paras mahdollinen käsi

### 1.5 Use caset
 - [ ] Jos pöytä on jo täynnä, mutta käyttäjä haluaa tulla katselijaksi, niin hänellä on mahdollisuus painaa nappia "JOIN WAITING LIST". Hän pääsee jonoon, ja heti kun yksi pelaaja poistuu pöydästä, ensimmäinen waiting list jonosta päätyy automaattisesti istumaan hänen paikalleen. Pelaaja poistetaan waiting list jonosta.
 
---

## Vaihe 2 — Äänimaailma

> Full Tiltin äänet olivat hillityt mutta tunnistettavat — osa nostalgista kokemusta.

### 2.1 Ääniefektien laajennus
- [ ] Synteettisistä äänistä oikeisiin sampleihin:
  - Kortin jako (liukas napsahdus)
  - Chippien liikkuminen (keraaminen kilahdus)
  - Check (napautus pöytään)
  - Fold (hiljainen pyyhkäisy)
  - All-in (dramaattinen efekti)
  - Voitto (chippien kerääminen)
  - Ajastimen varoitus (tikitys)
  - Vuorosi (huomioääni)
- [ ] Äänitasojen hienosäätö asetuksista
- [ ] Mute per äänityyppi (esim. chat-äänet pois, peliäänet päälle)

### 2.3 Soundboard
- [ ] Pelaaja voi soittaa ääniefektejä pöytään puhelimestaan (applause, sad trombone, "nice hand")
- [ ] Äänet kuuluvat kaikille ja näkyvät TV-näkymässä (kotipelihenki)

### 2.2 Tunnelmamusiikki (stretch goal)
- [ ] Hiljainen ambient-taustamusiikki pöytänäkymään
- [ ] Musiikin intensiteetti nousee suurissa poteissa
- [ ] Päälle/pois asetuksista

---

## Vaihe 3 — Pelaajan puhelinnäkymän parantaminen

> Puhelinnäkymä on pelaajan tärkein rajapinta. Sen pitää olla sujuva ja informatiivinen.

### 3.1 Parannettu action-paneeli
- [ ] Raise-sliderin haptinen palaute (vibra puhelimessa)
- [ ] Pikavalintanapit: 1/3 pot, 1/2 pot, 2/3 pot, pot, all-in
- [ ] Edellisen betin muistaminen (nopea re-raise samalla summalla)
- [ ] Pot odds -näyttö (valinnainen)
- [ ] Rahasumman syöttö näppäimistöllä: nappi avaa custom numeronäppäimistön
  - Näppäimistö nousee kauniisti alhaalta (0.3s slide-up animaatio)
  - Touch-optimoitu: isot numeropainikkeet, helppo valita tarkat summat
  - Backspace, clear, confirm-napit
  - Min/max-rajat näkyvissä, virheellinen syöttö estetään

### 3.2 Pelaajan tilastot
- [ ] Session stats pelaajan puhelimessa:
  - Voitto/tappio nykyisessä sessiossa
  - Pelatut kädet
  - VPIP%, PFR% (vapaaehtoinen, voi piilottaa)
  - Suurin voitettu potti
  - Sessioajan kesto
- [ ] Graafi: stack size / session earnings reaaliajassa (profit curve pelin aikana)

### 3.3 Pelaajan muistiinpanot (Player Notes)
- [ ] Muistiinpanokenttä jokaiselle vastustajalle (tallentuu paikallisesti)
- [ ] Värikoodatut pelaajamerkinnät (Full Tiltin 14 väriä)
  - Värit näkyvät pelaajan nimen vieressä minipöydässä
- [ ] Muistiinpanot säilyvät sessioiden välillä (localStorage)

### 3.4 Parannettu käsihistoria
- [ ] Käden uusinta visuaalisella pöytänäkymällä (ei vain tekstinä)
- [ ] Käden jakaminen muille pelaajille (linkki tai screenshot)
- [ ] Suodatus: voitetut/hävityt/kaikki kädet
- [ ] Equity-laskuri käsihistoriassa: "sinulla oli X% equity flopilla"

---

## Vaihe 4 — TV-pöytänäkymän hienous

> TV-näkymä on kotipelin "näyteikkuna" — sen pitää näyttää upealta.

### 4.1 Parannettu pöytäasettelu
- [ ] Kaksi vaihtoehtoista pöytämuotoa:
  - Classic (pyöreä, nykyinen)
  - Racetrack (soikea, Full Tilt -henkinen)
- [ ] Pelaajapaikat selkeämmin: nimi, avatar, stack, bet — kaikki hyvin luettavissa TV:stä
- [ ] Dealer-nappi näkyvämmin animoituna

### 4.2 HUD-tiedot pöytänäkymässä
- [ ] Pottin koko aina näkyvissä keskellä pöytää
- [ ] Blindien taso ja peli-info (NLHE/PLO, blind-taso) yläpalkissa
- [ ] Pelaajien timerbar selkeämmin (iso palkki, värit)

### 4.3 Showdown-esitys
- [ ] Showdownissa kädet paljastetaan dramaattisesti:
  - Ensimmäinen pelaaja: kortit kääntyvät
  - Viive
  - Toinen pelaaja: kortit kääntyvät
  - Voittavan käden nimi ilmestyy animoidusti ("Full House, Aces full of Kings!")
- [ ] Häviäjän kortit himmenevät, voittajan kortit korostuvat
- [ ] Run It Twice: kaksi boardia esitetään selkeästi rinnakkain animaatioineen

### 4.4 Pot award -esitys
- [ ] Chippipino liikkuu voittajalle
- [ ] Voittosumma näytetään hetkeksi voittajan kohdalla (+150)
- [ ] Side pot -voitot esitetään erikseen järjestyksessä

---

## Vaihe 5 — Turnausmoodi

> Full Tilt oli kuuluisa turnausformaateistaan. Kotipeliin riittää SNG ja pienet MTT:t.

### 5.1 Sit & Go -turnaukset
- [ ] SNG-pelimoodi: kiinteä buy-in, nousevat blindit, pelataan loppuun
- [ ] Blind-rakenne: konfiguroidaan ennen peliä (nopea/normaali/hidas)
- [ ] Palkintojako: top 3 (50/30/20 tai konfiguroidaan)
- [ ] Sijoitusnäkymä: pelaajien ranking chipitilanteen mukaan
- [ ] Turnauksen lobbynäkymä: blind-level, seuraava korotus, pelaajat jäljellä

### 5.2 Blind-rakenne
- [ ] Ajastettu blind-nosto (esim. 10/15/20 min per taso)
- [ ] Ante tietystä tasosta alkaen
- [ ] Näyttö: nykyinen taso, seuraava taso, aika seuraavaan nostoon
- [ ] Tauko-nappi (isäntä voi pausettaa turnauksen)

### 5.3 Turnauksen päättyminen
- [ ] Palkintojako automaattisesti
- [ ] Tulostaulukko: sijoitukset, voitot, merkittävät kädet
- [ ] ICM-deal: pelaajat voivat ehdottaa diiliä finaalipöydässä (ICM tai chip ratio)

### 5.4 Rebuy-turnaukset
- [ ] Rebuy-periodi (X ensimmäistä tasoa)
- [ ] Add-on rebuy-periodin lopussa
- [ ] Double/Triple stack -aloitus
- [ ] Late registration — pelaaja voi liittyä kesken turnauksen rebuy-periodin aikana

---

## Vaihe 6 — Chat & sosiaalinen vuorovaikutus

> Full Tiltin "Learn, Chat and Play with the Pros" — chatti oli olennainen osa kokemusta.

### 6.1 Pöytächat
- [ ] Pelaajat voivat lähettää viestejä pöydälle puhelimestaan
- [ ] Viestit näkyvät TV-näkymässä (chat bubble pelaajan kohdalla)
- [ ] Chat-kupla häviää automaattisesti muutaman sekunnin jälkeen
- [ ] Emoji-reaktiot pikavalinnoilla (thumbs up, crying, clap, fire, shark)
- [ ] Reaktioemojit livenä — paina reaktio joka näkyy pöydällä reaaliajassa

### 6.4 Push-to-Talk (stretch goal)
- [ ] Push-to-talk -mikrofoni suoraan softassa (ei tarvitse erillistä Discordia/Zoomia)

### 6.2 Emote-järjestelmä
- [ ] Pelaaja voi triggeröidä avatarin tunnetilan muutoksen manuaalisesti
- [ ] "Table tap" — pelaaja voi naputtaa pöytää (good hand -arvostus)
- [ ] "Show one" — pelaaja voi näyttää yhden kortin foldatessaan

### 6.3 Chat-hallinta
- [ ] Mute-pelaaja (isäntä tai pelaaja itse)
- [ ] Chat päälle/pois asetuksista

---

## Vaihe 7 — Isäntä/Admin-hallinta

> Kotipelissä tarvitaan isäntä, joka hallinnoi peliä — vastaava kuin floor manager.

### 7.1 Admin-paneeli
- [ ] Isännän erillinen hallintanäkymä (erillinen URL tai suojattu salasanalla)
- [ ] Pelin aloitus/pysäytys/tauko
- [ ] Pelin asetusten muuttaminen lennossa:
  - Blind-tason muutos
  - Max buy-in muutos
  - Pelimoodin vaihto (NLHE ↔ PLO)
  - Action-ajan muutos

### 7.2 Pelaajahallinta
- [ ] Pelaajan poistaminen pöydästä
- [ ] Pelaajan stackin korjaus (virhetilanteet)
- [ ] Pelaajan siirtäminen toiseen paikkaan (seat change)
- [ ] Pakollinen sit-out pelaajalle
- [ ] Seat randomizer — satunnainen istumisjärjestys joka kerta

### 7.3 Pelitilanteiden korjaus
- [ ] Edellisen käden peru (esim. väärä fold puhelimen kosketuksesta)
- [ ] Käsin jaettu potti (split pot -tilanne jota kone ei tunnista)
- [ ] Chippi-ledger: kuka toi ja vei kuinka paljon (buy-in/cash-out seuranta)

---

## Vaihe 8 — Edistyneet peliominaisuudet

> Full Tiltin innovaatiot sovellettuna kotipeliin.

### 8.1 Bomb Pot
- [ ] Bomb pot -moodi: kaikki laittavat sovitun summan pottiin, flop jaetaan suoraan
- [ ] Isäntä voi triggeröidä bomb potin milloin tahansa
- [ ] Automaattinen bomb pot joka X:s käsi (konfiguroidaan)

### 8.2 Straddle
- [ ] Vapaaehtoinen straddle (UTG-pelaaja laittaa 2×BB ennen jakoa)
- [ ] Mississippi straddle (mistä tahansa positiosta)
- [ ] Straddle-asetus: sallittu/ei sallittu

### 8.3 Running It Twice — laajennukset
- [ ] Run It Three Times -optio (kolmas board, kolmasosa potista)
- [ ] RIT-statistiikka: kuinka usein RIT muutti lopputulosta

### 8.4 Mandatory Show
- [ ] Isäntä voi asettaa pakollisen show-kädet -säännön (ei muck-optiota)
- [ ] Esim. "kaikki all-in-kädet näytetään aina"

### 8.5 Time Bank
- [ ] Jokaiselle pelaajalle erillinen aikapankki (esim. 120s per sessio)
- [ ] Aikapankki aktivoituu automaattisesti kun perusaika loppuu
- [ ] Aikapankin käyttö näkyy pöydällä (eri väri timerissa)
- [ ] Aikapankin täydennys: X sekuntia per pelattu käsi

### 8.6 Auto Top-Up
- [ ] Pelaaja voi asettaa "auto top-up" päälle: stack täydentyy automaattisesti max buy-iniin käsien välissä
- [ ] Edellyttää riittävää "pankkia" (erillinen saldo tai luotto)

---

## Vaihe 9 — Tilastot & analytiikka

> Pelien jälkeinen analyysi tekee kotipelistä vakavamman ja opettavaisemman.

### 9.1 Session-raportti
- [ ] Sessiokohtainen yhteenveto kaikille pelaajille:
  - Kokonaisvoitto/tappio
  - Pelatut kädet, VPIP%, PFR%, AF
  - Suurin voitto, suurin tappio
  - Showdown win rate
  - BB/h (big bets per tunti)
- [ ] Raportti jaettavissa (linkki tai kuvakaappaus)
- [ ] "Shark of the Night" -palkinnot session lopussa: eniten bluffeja, suurin potti, tightest player, loosest cannon
- [ ] Highlight reel — session lopussa automaattisesti generoidut "top 3 hands" animaatioina

### 9.2 Chippi-ledger (Cash Game)
- [ ] Kirjanpito: kuka toi kuinka paljon, kuka lähti kuinka paljon
- [ ] Automaattinen "kuka on velkaa kenelle" -laskuri
- [ ] Automaattinen Mobilepay/Tikkie-maksulinkkien generointi cash-outissa
- [ ] Debt tracker — softa muistaa maksamattomat velat ja muistuttaa seuraavassa pelissä
- [ ] Sessiohistoria: aiempien iltojen ledgerit
- [ ] Export CSV/tekstinä

### 9.3 Leaderboard
- [ ] Pitkäaikainen tulostaulu: kuka on voitolla/tappiolla kokonaisuudessaan
- [ ] Ranking per sessio ja kumulatiivisesti
- [ ] "Achievements": eniten voittoja, suurin potti, eniten bluffeja (näytti huonot kortit voiton jälkeen)

### 9.4 Equity-laskuri
- [ ] Käsihistoriasta valitun käden equity eri vaiheissa (preflop, flop, turn)
- [ ] "Olisitko voittanut jos olisit jatkanut?" -analyysi foldatuille käsille

---

## Vaihe 10 — Tekninen laatu & skaalautuvuus

> Luotettavuus ja suorituskyky ovat kriittisiä reaaliaikaisessa pelissä.

### 10.1 Yhteyden luotettavuus
- [ ] Reconnect-logiikan parantaminen (socket.io auto-reconnect + tilan palautus)
- [ ] Offline-indikaattori: pelaaja näkee selkeästi jos yhteys katkeaa
- [ ] Jonopuskuri: jos yhteys katkeaa toiminnon aikana, toiminto lähetetään uudelleen
- [ ] Heartbeat-seuranta ja latenssin näyttö

### 10.2 State management -parannus
- [ ] Optimistic updates: pelaajan toiminto näkyy heti omassa näkymässä
- [ ] Server-side state snapshot: uusi pelaaja/katsoja saa täyden tilan liittyessään
- [ ] Event sourcing: kaikki tapahtumat tallentuvat → täydellinen uudelleentoisto mahdollinen

### 10.3 Testauksen laajentaminen
- [ ] E2E-testit Playwrightilla (client + server yhdessä)
- [ ] Load testing: 10 pelaajaa samanaikaisesti, 100 kättä
- [ ] PLO-spesifiset testit
- [ ] Turnaus-flow-testit

### 10.4 Monitorointi & logitus
- [ ] Server-side logitus: kaikki tapahtumat aikaleimoilla
- [ ] Error tracking (esim. Sentry)
- [ ] Metriikat: käsiä per tunti, keskimääräinen pottikoko, peliajan kesto

---

## Vaihe 11 — Multi-table & katsojatuki

> Kotipeli voi kasvaa — kaksi pöytää yhtä aikaa tai kaverit katsomassa TV:stä.

### 11.1 Multi-table
- [ ] Useampi pöytä samalla serverillä (eri huoneet)
- [ ] Isäntä voi luoda uuden pöydän eri asetuksilla
- [ ] Pelaaja voi siirtyä pöydästä toiseen
- [ ] TV-näkymä: mahdollisuus vaihtaa pöydän välillä tai split screen

### 11.2 Katsojatuki (Railbird Mode)
- [ ] Katsojat voivat liittyä peliin ilman rahaa
- [ ] Katsojat näkevät pöydän mutta eivät pelaajien kortteja (paitsi showdownissa)
- [ ] Katsoja-chat (erillinen katsojaviestit)
- [ ] "Delayed hole cards" -moodi: katsojat näkevät kortit 1 käsi myöhässä (estää huijauksen)

### 11.3 Streaming-moodi
- [ ] OBS-ystävällinen näkymä: puhdas pöytänäkymä ilman UI-elementtejä
- [ ] Valinnainen "commentator view": kaikki kortit näkyvissä viiveellä
- [ ] Overlay-grafiikat: pelaajatiedot, pottikoko, equity

---

## Vaihe 12 — Pelilliset lisäominaisuudet

> Erikoisuudet, jotka tekevät kotipelistä uniikin kokemuksen.

### 12.1 Mixed Games
- [ ] Lisää pelityyppejä: Omaha Hi/Lo, Stud, Razz, 2-7 Triple Draw
- [ ] Mixed game -rotaatio: peli vaihtuu automaattisesti X käden tai Y minuutin välein
- [ ] Dealer's Choice: jakaja valitsee seuraavan pelin puhelimestaan

### 12.2 Side Bets & Prop Bets
- [ ] Isäntä voi asettaa side bettejä (esim. "ensimmäinen pelaaja joka saa royal flushin")
- [ ] "High hand bonus": paras käsi viimeisen tunnin aikana saa bonuksen
- [ ] "Bad beat jackpot" -tyyppinen bonus
- [ ] Bounty-mode — aseta bounty tietylle pelaajalle, tipottaessa bonus

### 12.3 Saavutukset & haasteet
- [ ] Session-aikaiset haasteet: "voita 3 pottia putkeen", "bluffaa onnistuneesti"
- [ ] Pidemmän aikavälin saavutukset: "pelaa 1000 kättä", "voita royal flushilla"
- [ ] Saavutusilmoitukset pöytänäkymässä

---

## Vaihe 13 — Ulkoasu & brändäys

> Viimeistely, joka tekee sovelluksesta ammattimaisen.

### 13.1 Landing page & lobbynäkymä
- [ ] Tyylikäs landing page peliin liittymiseen
- [ ] Lobbynäkymä Full Tilt -henkinen: pöytälista, pelaajamäärät, käynnissä olevat pelit
- [ ] Pelin luontidialogi: blind-tasojen, pelityypin ja asetusten valinta

### 13.2 Brändäys
- [ ] Oma logo ja nimi (konfiguroidaan — jokainen kotipokeriseurue voi nimetä omansa)
- [ ] Favicon ja PWA-tuki (puhelinpelaajat voivat "asentaa" applikaation)
- [ ] Splash screen käynnistyksessä

### 13.3 Responsiivisuus
- [ ] Pöytänäkymä skaalautuu eri TV-kokoihin (1080p, 4K)
- [ ] Puhelinnäkymä toimii kaikilla laitteilla (iPhone SE → iPad)
- [ ] Landscape-tuki puhelimessa (valinnainen)

---

## Prioriteettijärjestys (suositus)

| Järjestys | Vaihe | Perustelu |
|-----------|-------|-----------|
| 1 | **Vaihe 0** — Keskeneräiset | Perusasiat kuntoon ennen kaikkea muuta |
| 2 | **Vaihe 1** — Visuaalinen identiteetti | Suurin vaikutus käyttäjäkokemukseen |
| 3 | **Vaihe 3** — Pelaajapuhelinnäkymä | Pelaajan päivittäin käyttämä rajapinta |
| 4 | **Vaihe 7** — Admin-hallinta | Kotipelissä isäntä tarvitsee kontrollia |
| 5 | **Vaihe 2** — Äänimaailma | Tunnelman viimeistely |
| 6 | **Vaihe 4** — TV-pöytänäkymä | Showdown-draama ja visuaalit |
| 7 | **Vaihe 8** — Edistyneet peliominaisuudet | Bomb pot, straddle, time bank — lisää syvyyttä |
| 8 | **Vaihe 9** — Tilastot & analytiikka | Pelin jälkeinen analyysi |
| 9 | **Vaihe 5** — Turnausmoodi | SNG:t laajentavat pelitarjontaa |
| 10 | **Vaihe 6** — Chat & sosiaalisuus | Sosiaalinen ulottuvuus |
| 11 | **Vaihe 10** — Tekninen laatu | Luotettavuus ja skaalautuvuus |
| 12 | **Vaihe 12** — Pelilliset lisäominaisuudet | Mixed games, side bets |
| 13 | **Vaihe 11** — Multi-table & katsojat | Laajennettavuus |
| 14 | **Vaihe 13** — Ulkoasu & brändäys | Viimeistely ja kiillotus |

---

## Full Tilt -inspiraation ydinperiaatteet

Nämä periaatteet ohjaavat kaikkea kehitystä:

1. **Pelaaja ensin** — Kaikki suunnittelupäätökset tehdään pelaajan kokemuksen näkökulmasta, ei teknisestä näkökulmasta
2. **Persoonallisuus** — Sovelluksella on oma tunnistettava visuaalinen identiteetti, ei geneerinen pokeri-look
3. **Sujuvuus** — Animaatiot, äänet ja siirtymät ovat suunniteltuja ja harkittuja, eivät satunnaisia
4. **Draama** — Isot potit, showdownit ja voitot tuntuvat merkityksellisiltä ja dramaattisilta
5. **Kotipeli > Online** — Sovellus on optimoitu kotipeliympäristöön: TV + puhelimet, ei multi-tabling 18 pöytää
6. **Innovaatio** — Full Tilt keksi Rush Pokerin ja Run It Twicen. Tämä sovellus voi keksiä omia kotipeli-innovaatioita

---

*Dokumentti luotu 2026-02-28. Päivitetään kehityksen edetessä.*
