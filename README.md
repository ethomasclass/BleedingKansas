# Where Is Reese Brown?

A 30-minute investigation game for Unit 4, Lesson 3 (Congress and Local Voters: the Compromise of 1850 and Bleeding Kansas). Students play an investigator for the 1856 U.S. House committee, walk around a 3D Easton, Kansas Territory, talk to townspeople, and decide who should decide about slavery.

Runs in Chrome on Chromebooks. No install, no accounts, no build step.

## Run it

- **Online:** turn on GitHub Pages for this repo (Settings > Pages > Deploy from branch > `main` / root). Students open the Pages link.
- **On one computer:** open `index.html` in Chrome. Everything, including three.js, is in this folder, so it also works offline.

Progress saves in the browser automatically. "Start a new team" on the title screen clears it for the next group.

## Controls

- Walk: W A S D, arrow keys, or click the ground
- Talk: walk up to someone and press E, or click them
- Notebook: N
- Menu: Esc (read aloud, graphics quality, replay the intro, teacher unlock for the case questions, start over)

## Where things live

| File | What it holds |
| --- | --- |
| `js/data.js` | Every word students read: intro, dialogue, notebook entries, case questions, reality card. Mirrors the script doc. |
| `js/world.js` | The 3D town: layout, buildings, walking, collision, camera. |
| `js/game.js` | Screens and game flow: title, intro, talking scenes, notebook, solving the case, case report. |
| `js/art.js` | Placeholder art drawn in code, and loading of real art. |
| `css/game.css` | All styling. |
| `art/` | Real art from Google Flow (see below). |
| `js/vendor/three.min.js` | three.js r149 (MIT license). |

## Adding Google Flow art

1. Export images from Flow on the flat green background.
2. Remove the green:
   ```
   python3 tools/key_green.py pike-proud.png pike-teary.png --out art/portraits
   python3 tools/key_green.py pike-idle.png --frames 2 --out art/sprites
   python3 tools/key_green.py player-walk-front.png player-walk-back.png --frames 3 --out art/sprites
   ```
   Backgrounds and intro scenes don't need this step. Copy them straight into `art/backgrounds` and `art/intro`.
3. List each new file in `art/manifest.js`. The game uses placeholder art for anything not listed.

File names:

| Kind | Name | Notes |
| --- | --- | --- |
| Portraits | `art/portraits/<character>-<expression>.png` | e.g. `pike-proud.png`. Expressions are listed in `js/data.js`. |
| Townsperson sprites | `art/sprites/<character>-idle.png` | 2 frames side by side |
| Player sprites | `art/sprites/player-walk-front.png`, `player-walk-back.png` | 3 frames side by side |
| Goat | `art/portraits/senator-chewing.png`, `senator-bleating.png`, `art/sprites/senator-idle.png` | |
| Backgrounds | `art/backgrounds/bg-<place>.png` | cabin, polling, tavern, store, post, forge, ferry, print, wagon, school |
| Intro scenes | `art/intro/intro-<n>.png` | 2, 3, 4, 6, 7, 8, 9. Panels 1 and 5 are maps drawn in code. |

Character ids: `mrsbrown`, `whitcomb`, `pruitt`, `pike`, `tuttle`, `grayson`, `byrne`, `bell`, `cobb`, `hale`, `senator`.
