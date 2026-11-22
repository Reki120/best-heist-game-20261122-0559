# Vaultfall — a tiny stealth heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Reki120/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Reki120/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

One thief. One diamond. Three guards, two cameras, one alarm.

**Vaultfall** is a complete top-down stealth heist that plays offline in a desktop
browser from its own static files — no build step, no libraries, no network requests.
Cross a five-room museum (gallery, great hall, vault, lobby, offices) while guards
patrol with vision cones and wall-mounted cameras sweep theirs; every cone is clipped
by the walls, so doorways and corners are real cover. Being seen feeds the **alarm
meter**: at 100% the museum locks down and the night is over, and a guard who lays a
hand on you ends it sooner.

Lift the **Star Diamond** from the vault, grab whatever side loot your greed insists
on — paintings, gems, gold, cash — and slip out the exit. Throw a coin to pull a guard
off his patrol, sneak to stay hard to see, and chase a score built from the haul, a
quiet alarm and a quick night.

## Play it

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

Open the page in a desktop browser. **WASD / arrow keys** move, the **mouse** aims,
a **click** throws a coin, **Shift** sneaks, **P** pauses. All sound is synthesised
live with WebAudio; there are no audio files.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun library in
`vendor/makefun-game.ts`. The screenshots are real renders of the game in a browser,
staged through its own `?shot=start|play|alarm|end` scenes.

An entry for the make.fun bounty
[Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559).
MIT licensed — see `LICENSE`.
