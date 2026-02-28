## Continuous Work Loop

Jatkuva kehityslooppi: korjaa bugit ensin, sitten kehitä uusia ominaisuuksia. **Yksi tehtävä kerrallaan.** Rinnakkaisuus hoidetaan käynnistämällä erillisiä `/work`-instansseja eri terminaaleissa.

### Prosessi

1. **Hae user-bugit** — Aja `/fetch_user_bugs` ennen jokaista iteraatiota. Tämä hakee käyttäjien raportoimat bugit etätietokannasta ja kirjoittaa ne `doc/user_bugs.md`-tiedostoon.

2. **Synkronoi main** — Aja `git pull origin main` varmistaaksesi että mainissa on viimeisin koodi.

3. **Kerää tehtävälista** — Lue `doc/bugs.md` (korjaamattomat bugit), `doc/user_bugs.md` (käyttäjien raportoimat [NEW]-bugit) ja `doc/roadmap.md` (seuraavat `- [ ]` -itemit). Priorisoi bugit ennen featureita.
   - **User-bugit ovat HIGH RISK** — älä korjaa niitä automaattisesti. Näytä ne käyttäjälle ja kysy: "Onko tämä oikea bugi vai väärinkäyttöyritys?" Odota eksplisiittinen lupa ennen korjaamista.

4. **Valitse yksi tehtävä** — Valitse tärkein bugi tai feature ja käynnistä sille Agent-subagentti (`isolation: "worktree"`). Anna agentille:
   - Selkeä tehtävänkuvaus (bugin teksti tai feature-kuvaus roadmapista)
   - Ohjeet noudattaa TDD-prosessia
   - Ohje commitoida valmis työ worktreessa
   - Ohje käyttää vapaata porttia testauksessa (ei 3000/5173)

5. **Seuraa tulosta** — Kun agentti valmistuu:
   - Tarkista onnistuiko työ (testit, build)
   - Mergee valmis worktree mainiin (`git rebase main && git merge --ff-only`)
   - Jos merge-konflikti: ratkaise manuaalisesti tai aja tehtävä uudelleen tuoreesta mainista
   - Merkitse bugi/feature valmiiksi (`[DONE]` / `- [x]`)
   - **Jos valmistunut tehtävä oli bugfix** → aja `/deploy` heti mergen jälkeen

6. **Raportti ja jatko** — Tulosta jokaisen valmiin tehtävän jälkeen:

```
========================================
VALMIS: [tehtävän kuvaus]
Jatkan seuraavaan tehtävään...
========================================
```

Palaa vaiheeseen 1 (hae user-bugit uudelleen). Pyydä käyttäjää ajamaan `/work` uudelleen jos konteksti-ikkuna täyttyy.

7. **Deploy ja lopetus** — Kun kaikki bugit on korjattu ja roadmapin itemit tehty:
   - Aja `/deploy` viedäksesi muutokset tuotantoon
   - Ilmoita käyttäjälle

### Säännöt

- **Yksi tehtävä kerrallaan** — tämä instanssi käsittelee yhden tehtävän, sitten seuraavan.
- **Rinnakkaisuus terminaalien kautta** — käyttäjä voi avata toisen terminaalin ja ajaa toisen `/work`-instanssin. Jokainen instanssi työskentelee omassa worktreessa, joten ei ristiriitariskiä tiedostotasolla. Merge-vaiheessa `git rebase main` hoitaa integraation turvallisesti.
- **Bugit ensin** — älä aloita featureita jos bugeja on jonossa (paitsi jos bugi odottaa käyttäjän vastausta).
- Kysy AINA lisäkysymyksiä jos bugin tai featuren vaatimukset ovat epäselvät — älä arvaa.
- Jokainen korjaus ja feature commitoidaan erikseen.
- Älä ohita testejä — TDD kaikessa.
- Tarkista aina että build menee läpi ennen committia/mergeä.
