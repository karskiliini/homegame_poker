---
name: avatar_update
description: Leikkaa avatarit spritesheet-kuvasta ja luo kaikki 36 avatar-hahmoa client/public/avatars/ -hakemistoon
user_invocable: true
---

Luo kaikki 36 avatar-hahmoa `resources/avatars/avatars.png` spritesheet-kuvasta.

## Lähde

- Tiedosto: `resources/avatars/avatars.png`
- Grid: 9 saraketta x 4 riviä = 36 hahmoa
- Käytä `magick identify` tarkistaaksesi kuvan koon ja laske solukoko: leveys/9, korkeus/4

## Leikkaus

Käytä ImageMagickia (`magick`). Jokaiselle 36 hahmolla (rivi 0-3, sarake 0-8):

1. **Laske solukoko**: `CW = kuvan_leveys / 9` (pyöristä alas), `CH = kuvan_korkeus / 4`
2. **Leikkaa solu**: `-crop ${CW}x${CH}+${x}+${y} +repage` missä `x = sarake * CW`, `y = rivi * CH`
3. **Rajaa neliöksi**: `-gravity North -crop ${CW}x${CW}+0+15 +repage` (kasvo-alue ylhäältä)
4. **Skaalaa**: `-resize 100x100`
5. **Tallenna**: `client/public/avatars/avatar-{NN}.png` missä NN = 01..36 (järjestys vasemmalta oikealle, ylhäältä alas)

Shell-komento:

```bash
SRC="resources/avatars/avatars.png"
mkdir -p client/public/avatars

# Lue kuvan koko
SIZE=$(magick identify -format "%wx%h" "$SRC")
W=${SIZE%x*}
H=${SIZE#*x}
CW=$((W / 9))
CH=$((H / 4))

n=1
for row in $(seq 0 3); do
  for col in $(seq 0 8); do
    x=$((col * CW))
    y=$((row * CH))
    num=$(printf "%02d" $n)
    magick "$SRC" \
      -crop ${CW}x${CH}+${x}+${y} +repage \
      -gravity North -crop ${CW}x${CW}+0+15 +repage \
      -resize 100x100 \
      "client/public/avatars/avatar-${num}.png"
    n=$((n + 1))
  done
done
```

## Päivitys avatars.ts

Leikkauksen jälkeen päivitä `shared/src/avatars.ts`:
- `AvatarId` union type: 36 nimeä
- `AvatarOption[]`: jokaiselle `{ id, label, image: '/avatars/avatar-NN.png' }`
- Poista vanhat emoji-kentät jos niitä on

Avatarien nimet (järjestys 01-36):

| # | id | label |
|---|-----|-------|
| 01 | link | Link |
| 02 | vader | Vader |
| 03 | lincoln | Lincoln |
| 04 | napoleon | Napoleon |
| 05 | einstein | Einstein |
| 06 | doc-brown | Doc Brown |
| 07 | evil-santa | Evil Santa |
| 08 | goblin | Goblin |
| 09 | gnome | Gnome |
| 10 | princess | Princess |
| 11 | poseidon | Poseidon |
| 12 | gandalf | Gandalf |
| 13 | balrog | Balrog |
| 14 | agent | Agent |
| 15 | punk | Punk |
| 16 | shark | Shark |
| 17 | cowboy | Cowboy |
| 18 | homer | Homer |
| 19 | bart | Bart |
| 20 | joker | Joker |
| 21 | batman | Batman |
| 22 | superman | Superman |
| 23 | mummy | Mummy |
| 24 | dracula | Dracula |
| 25 | vampire | Vampire |
| 26 | pharaoh | Pharaoh |
| 27 | yoda | Yoda |
| 28 | ironman | Iron Man |
| 29 | wolverine | Wolverine |
| 30 | medusa | Medusa |
| 31 | sherlock | Sherlock |
| 32 | scared-guy | Scared Guy |
| 33 | angry-guy | Angry Guy |
| 34 | hitman | Hitman |
| 35 | mobster | Mobster |
| 36 | boss | The Boss |

## Verifiointi

1. Tarkista että `client/public/avatars/` sisältää tasan 36 PNG-tiedostoa
2. Aja `bun run build` varmistaaksesi kompilaus
3. Ilmoita käyttäjälle tulos
