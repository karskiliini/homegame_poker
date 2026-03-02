---
name: test
description: Ajaa testit kevyellä Haiku-mallilla ja raportoi tulokset. Käytä aina kun testejä pitää ajaa.
user_invocable: true
---

Aja testit käyttäen Haiku-agenttia kustannusten ja latenssin minimoimiseksi.

## Ohjeet

Käynnistä Agent-työkalu näillä parametreillä:

- **subagent_type**: `general-purpose`
- **model**: `haiku`
- **description**: `Run tests with Haiku`
- **prompt**: Alla oleva prompt (kopioi sellaisenaan, korvaa `{filter}` jos käyttäjä antoi suodattimen):

```
Aja testit komennolla: bun run test --run {filter}

Jos testit on ajettava tietyssä hakemistossa (worktree), käytä oikeaa polkua.

Tehtäväsi:
1. Aja testit
2. Raportoi tulos tiivistetysti:
   - Montako testitiedostoa ajettiin, montako meni läpi / epäonnistui
   - Montako yksittäistä testiä meni läpi / epäonnistui
   - Ajoaika
3. Jos testejä epäonnistui, listaa JOKAISESTA epäonnistuneesta:
   - Testitiedoston nimi ja testin nimi
   - Assertion-virhe (odotettu vs saatu arvo)
   - Tarkka rivi ja tiedosto jossa virhe tapahtui
4. ÄLÄ yritä korjata mitään — raportoi vain tulokset

Palauta tulos suomeksi.
```

## Suodatin

Jos käyttäjä antoi argumentteja (esim. `/test hand-rank`), lisää ne vitest-suodattimeksi:
- `/test hand-rank` → `bun run test --run hand-rank`
- `/test` (ilman argumentteja) → `bun run test --run`

## Tulosten käsittely

Kun Haiku-agentti palauttaa tulokset:
- Jos kaikki testit menivät läpi: raportoi lyhyesti käyttäjälle
- Jos testejä failasi: näytä failanneet testit ja kysy haluaako käyttäjä debugata niitä (debugging tehdään Opus-mallilla tässä sessiossa)
