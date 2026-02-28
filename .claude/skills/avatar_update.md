---
name: avatar_update
description: Leikkaa avatarit spritesheet-kuvasta teeman avatars-hakemistoon
user_invocable: true
---

Luo avatar-hahmot spritesheet-kuvasta teeman avatars-hakemistoon.

## Lähde

- Tiedosto: käyttäjän antama spritesheet-kuva
- Käytä `magick identify` tarkistaaksesi kuvan koon ja laske solukoko

## Leikkaus

Käytä ImageMagickia (`magick`). Jokaiselle hahmolla (rivi ja sarake):

1. **Laske solukoko**: `CW = kuvan_leveys / sarakkeet`, `CH = kuvan_korkeus / rivit`
2. **Leikkaa solu**: `-crop ${CW}x${CH}+${x}+${y} +repage`
3. **Rajaa neliöksi**: `-gravity North -crop ${CW}x${CW}+0+15 +repage` (kasvo-alue ylhäältä)
4. **Skaalaa**: `-resize 100x100`
5. **Tallenna**: `client/public/themes/<teema>/avatars/avatar-{NN}.png` missä NN = 01, 02, ... (järjestys vasemmalta oikealle, ylhäältä alas)

## Teeman konfigurointi

Päivitä teeman `avatarCount` vastaamaan leikattua määrää tiedostossa `client/src/themes/<teema>.ts`:

```typescript
assets: {
  avatarBasePath: '/themes/<teema>/avatars',
  avatarCount: <lukumäärä>,
}
```

Avatarit identifioidaan numerolla (string "1", "2", ...). Kuvatiedosto lasketaan automaattisesti: `avatar-${id.padStart(2, '0')}.png`.

## Verifiointi

1. Tarkista että `client/public/themes/<teema>/avatars/` sisältää oikean määrän PNG-tiedostoja
2. Tarkista että teeman `avatarCount` vastaa tiedostojen määrää
3. Aja `bun run build` varmistaaksesi kompilaus
4. Ilmoita käyttäjälle tulos
