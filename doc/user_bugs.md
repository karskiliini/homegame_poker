# User Bug Reports

## [DONE] Bug #23 — 2026-03-01 09:25:19
**Reporter:** marski
**Table:** 5058b580

kun painaa check, ja tulee seuraava kortti, niin sinulla näkyy hetken aikaa edellisen kierroksen valintanapit ennenkuin ne päivittyvät oikein.

---

## [NEW] Bug #22 — 2026-03-01 09:13:23
**Reporter:** marski2
**Table:** 826d31bc

jokaisella pöydällä pitää olla equity counter, joka näyttää prosenttien mukaan "oikeutetun" voittosumman. Lopuksi näkee sitten todellisen ja teoreettisen eron. Tee graafi, sininen väri kertoo teoreettisen ja vihreä/punainen todellisen profit/loss.

---

## [DONE] Bug #21 — 2026-03-01 08:57:05
**Reporter:** marski2
**Table:** 826d31bc

button merkkii pitää olla isompi, eikä se saa mennä avatarin kanssa päällekkäin

---

## [DONE] Bug #20 — 2026-03-01 08:54:51
**Reporter:** marski2
**Table:** 826d31bc

bugi: ylhäällä istuvan pelaajan kortit peittää stackin koko numeron.

---

## [NEW] Bug #19 — 2026-03-01 08:51:25
**Reporter:** marski2
**Table:** 826d31bc

timebank feature, when in desperate need.

---

## [NEW] Bug #18 — 2026-03-01 08:46:21
**Reporter:** marski2
**Table:** ee452322

refill feature

---

## [NEW] Bug #17 — 2026-03-01 08:46:14
**Reporter:** marski2
**Table:** ee452322

auto rebuy feature.

---

## [NEW] Bug #16 — 2026-03-01 08:13:43
**Reporter:** Anonymous
**Table:** N/A

tee työkalu jolla voi 2d:na suunnitella chip trickit. wireframena chippejä, aikajanalla niitä voi siirrellä ja chipit animoituu itsestään keyframejen välillä. voi siirtää chippejä xy akseleilla, sekä rotatoida z akselilla.

---

## [NEW] Bug #15 — 2026-03-01 07:59:10
**Reporter:** Anonymous
**Table:** N/A

feature: meta quest 3 integraatio. Sivulle voi kirjautua meta quest 3:lla, näkymä sallii vain yhden pöydän avaamisen kerrallaan, kun pelaaja istuu pöytään, niin näkymä on 3D maailmassa jossa voi katsella ympäriinsä. Edessä näkyy pelipöytä ja pelaajien avatarit sen ympärillä. Näytön alalaidassa on aina kiinteästi chat, omat kortit, toimintanapit ja omien korttien yläpuolella community cardit.

---

## [WONTFIX] Bug #14 — 2026-03-01 07:30:55
**Reporter:** Anonymous
**Table:** N/A

poista koko tv näkymä pois koko projektista. Varmista ettei käyttäjän workflowssa näy koskaan TV näkymä mitenkään.

---

## [DONE] Bug #13 — 2026-03-01 07:25:41
**Reporter:** Anonymous
**Table:** N/A

kun pelaaja clickaa lobbyssä että liity pöytään, niin kyseisen pöydän pitäisi aueta uudessa ikkunassa. Näitä ikkunoita pitää pystyä olemaan auki vain yksi kerrallaan per käyttäjätili. Näin pelaaja voi pelata monessa eri pöydässä yhtä aikaa, mutta ei koskaan yhdellä tilillä samassa pöydässä kahdella istuimella.

---

## [DONE] Bug #12 — 2026-03-01 06:20:04
**Reporter:** marski
**Table:** 2fca99d6

ylälaidassa istuvan pelaajan kortit ovat nimikyltin päällä. Pidä huoli että missään kohtaa istuvan pelaavan kortit eivät peitä olennaisia UI komponentteja.

---

## [DONE] Bug #11 — 2026-03-01 06:16:45
**Reporter:** marski
**Table:** 2fca99d6

bugi: istuin samaan pöytään kahdesta eri selaimesta samalla käyttäjätunnuksella. Saman tilin ei pitäisi pystyä avaamaan toista selainta, tai ainakaan samalla tunnuksella ei pidä pystyä istumaan pöytään uudestaan. Pöytänäkymään tullessa, pitäisi olla selvää että onko oma pelaaja jo istumassa pöydässä. Samoin sit-in nappia painettaessa pidä huoli, että atomisesti varmistat, ettei sama käyttäjä ole jo painanut sit-in nappia toisesta selaimesta.

---

## [DONE] Bug #10 — 2026-02-28 23:24:27
**Reporter:** Anonymous
**Table:** N/A

kaikki pelaajat painoivat sit out ja lähtivät pois pelistä, paitsi minä. Keskelle pöytää jäi silti edellinen potti. Se potti olisi pitänyt palautua viimeisen käden voittajalle, eikä jäädä pöytään.

---

## [NEW] Bug #9 — 2026-02-28 23:21:51
**Reporter:** Anonymous
**Table:** N/A

jos painan sit out, ja leave table, niin poistuin kyllä pöydästä, mutta avatarini jäi edelleen istumaan pöytään, ja varmaankin varasi paikankin vielä muilta pelaajilta.

---

## [DONE] Bug #8 — 2026-02-28 23:20:15
**Reporter:** marski
**Table:** 6e240a41

riverin peel ei toimi oiekin muissa tapauksissa kuin silloin kun on menty flopilta all-in. Jos mennään all-in pre-flop, niin river peel toimii väärin. Samoin jos tehdään pre-flop allin run it twice, niin se toimii väärin.

---

## [DONE] Bug #7 — 2026-02-28 22:04:52
**Reporter:** marski
**Table:** 09f11d07

pelin katsojanäkymä ei pitäisi olla lainkaan eri näkymä kuin pelipöydässä istuvan näkymä.

---

## [DONE] Bug #6 — 2026-02-28 22:01:08
**Reporter:** marski2
**Table:** 09f11d07

jos pelaaja on sitout tilassa, niin hänelle pitäisi välittömästi tulla vasempaan yläkulmaan nappi jolla noustaan pöydästä pois. Tällä napilla pelaaja häviää pöydästä, mutta jää edelleen seuraamaan peliä. Sen jälkeen voi painaa vasemmasta yläkulmasta nappia leave.

---

## [DONE] Bug #5 — 2026-02-28 22:00:10
**Reporter:** marski2
**Table:** 09f11d07

Jos pelaaja on sitout tilassa, niin hänen pitää voida siinä valita uusi istuinpaikka.

---

## [DONE] Bug #4 — 2026-02-28 21:59:10
**Reporter:** marski2
**Table:** 09f11d07

all in tilanteissa pitää olla mahdollista laittaa tick box: always run it twice

---

## [DONE] Bug #3 — 2026-02-28 21:58:44
**Reporter:** marski2
**Table:** 09f11d07

kun tulee all-in tilanne, ja jaetaan flop, flopin jälkeen pitäisi pitää parin sekunnin tauko, sitten jaetaan turn, parin sekunnin tauko, ja sitten pihistetään river... Mutta ei enää pihistyksen jälkeen pidä enää jakaa riveriä uudestaan. Ja river korttia ei saa näyttää ennen pihistystä!

---

## [DONE] Bug #2 — 2026-02-28 21:35:11
**Reporter:** marski
**Table:** 53c02a5b

kun istun pelipöydässä ja painan sit out, niin nappi "poistu pöydästä" ei ilmesty näkyviin. Eikä myöskään nappi sit in (tai sit down). Sen sijaan sitout jää näkyviin, mutta sitä ei voi painaa. Sitout napin tulisi kadota näkyvistä tässä kohtaa.

---

## [DONE] Bug #1 — 2026-02-28 21:27:58
**Reporter:** marski
**Table:** 53c02a5b

käyttäjädata pitää tallentaa tietokantaan, ei palvelimen muistiin.

---
