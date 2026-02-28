## Continuous Work Loop

Jatkuva kehityslooppi: korjaa bugit ensin, sitten kehitä uusia ominaisuuksia. Toista kunnes tehtävää ei enää ole.

### Prosessi

0. **Luo worktree** — Aloita aina luomalla worktree (`EnterWorktree`). Tämä pitää main-haaran puhtaana ja ajokelpoisena käyttäjälle.

1. **Aja /bugfix** — Etsi ja korjaa bugeja. Kysy lisäkysymyksiä jos bugi ei ole riittävän selkeä.

2. **Tarkista tulos** — Jos /bugfix ei löytänyt mitään korjattavaa, siirry vaiheeseen 3. Jos korjattiin bugi, commitoi, mergee mainiin ja palaa vaiheeseen 1.

3. **Aja /feature-develop** — Valitse seuraava ominaisuus roadmapista ja toteuta se. Kysy lisäkysymyksiä jos feature ei ole riittävän selkeä.

4. **Kun feature on valmis** — Commitoi, mergee mainiin ja palaa vaiheeseen 1.

5. **Lopeta** — Kun bugeja ei ole ja kaikki roadmapin itemit on tehty, ilmoita käyttäjälle.

### Säännöt

- Kysy AINA lisäkysymyksiä jos bugin tai featuren vaatimukset ovat epäselvät — älä arvaa.
- Jokainen korjaus ja feature commitoidaan erikseen.
- Älä ohita testejä — TDD kaikessa.
- Tarkista aina että build menee läpi ennen committia.
