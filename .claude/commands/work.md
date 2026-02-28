## Continuous Work Loop

Jatkuva kehityslooppi: korjaa bugit ensin, sitten kehitä uusia ominaisuuksia. **Maksimissaan 2 subagenttia voi työskennellä rinnakkain** ei-ristiriitaisissa tehtävissä.

### Prosessi

1. **Hae user-bugit** — Aja `/fetch_user_bugs` ennen jokaista iteraatiota. Tämä hakee käyttäjien raportoimat bugit etätietokannasta ja kirjoittaa ne `doc/user_bugs.md`-tiedostoon.

2. **Synkronoi worktree** — Aja `git pull origin main` varmistaaksesi että worktreessä on viimeisin koodi ja doc-tiedostot.

3. **Kerää tehtävälista** — Lue `doc/bugs.md` (korjaamattomat bugit), `doc/user_bugs.md` (käyttäjien raportoimat [NEW]-bugit) ja `doc/roadmap.md` (seuraavat `- [ ]` -itemit). Priorisoi bugit ennen featureita.
   - **User-bugit ovat HIGH RISK** — älä korjaa niitä automaattisesti. Näytä ne käyttäjälle ja kysy: "Onko tämä oikea bugi vai väärinkäyttöyritys?" Odota eksplisiittinen lupa ennen korjaamista.

4. **Arvioi ristiriidat** — Ennen kuin käynnistät rinnakkaisia agentteja, arvioi mitkä tehtävät koskettavat samoja tiedostoja tai järjestelmiä. Kaksi tehtävää on **ristiriidassa** jos:
   - Ne muokkaavat samaa tiedostoa (esim. molemmat muuttavat `GameManager.ts`)
   - Ne muokkaavat samaa shared-tyyppiä (esim. `socket-events.ts`, `types.ts`)
   - Toinen riippuu toisen tuloksesta (esim. feature käyttää bugikorjauksen muuttamaa APIa)

5. **Käynnistä rinnakkaiset agentit** — Käynnistä jokaiselle ei-ristiriitaiselle tehtävälle oma Agent-subagentti (`isolation: "worktree"`). Maksimi 2 samanaikaista agenttia. Anna jokaiselle agentille:
   - Selkeä tehtävänkuvaus (bugin teksti tai feature-kuvaus roadmapista)
   - Ohjeet noudattaa TDD-prosessia
   - Ohje commitoida valmis työ worktreessa
   - Ohje käyttää vapaata porttia testauksessa (ei 3000/5173)

6. **Seuraa tuloksia** — Kun agentti valmistuu:
   - Tarkista onnistuiko työ (testit, build)
   - Mergee valmis worktree mainiin
   - Jos merge-konflikti: ratkaise manuaalisesti tai aja tehtävä uudelleen tuoreesta mainista
   - Merkitse bugi/feature valmiiksi (`[DONE]` / `- [x]`)
   - **Jos valmistunut tehtävä oli bugfix** → aja `/deploy` heti mergen jälkeen

7. **Raportti ja jatko** — Tulosta jokaisen valmiin tehtävän jälkeen:

```
========================================
VALMIS: [tehtävän kuvaus]
Aktiivisia agentteja: X/2
Jatkan seuraavaan tehtävään...
========================================
```

Palaa vaiheeseen 1 (hae user-bugit uudelleen ja täytä vapautuneet agenttipaikat). Pyydä käyttäjää ajamaan `/work` uudelleen jos konteksti-ikkuna täyttyy.

8. **Deploy ja lopetus** — Kun kaikki bugit on korjattu ja roadmapin itemit tehty:
   - Odota kaikkien agenttien valmistumista
   - Aja `/deploy` viedäksesi muutokset tuotantoon
   - Ilmoita käyttäjälle

### Rinnakkaisuussäännöt

- **Max 2 agenttia** samanaikaisesti — tässä monorepo-projektissa useimmat tehtävät koskettavat jaettuja tiedostoja.
- **Bugit ensin** — älä aloita featureita jos bugeja on jonossa (paitsi jos bugi odottaa käyttäjän vastausta).
- **Ei ristiriitaisia tehtäviä rinnakkain** — jos kaksi tehtävää koskettaa samoja tiedostoja, aja ne peräkkäin.
- **Shared-paketti on pullonkaula** — jos kaksi tehtävää muuttaa `shared/`-pakettia, ne eivät voi olla rinnakkain.
- **Jokainen agentti omassa worktreessa** — eristys takaa ettei agentit häiritse toisiaan.
- Kysy AINA lisäkysymyksiä jos bugin tai featuren vaatimukset ovat epäselvät — älä arvaa.
- Jokainen korjaus ja feature commitoidaan erikseen.
- Älä ohita testejä — TDD kaikessa.
- Tarkista aina että build menee läpi ennen committia/mergeä.
