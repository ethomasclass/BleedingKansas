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
| `js/world.js` | The 3D town: layout, buildings, walking, collision, camera, time of day. |
| `js/models.js` | The 3D people and animals, built in code from simple shapes and animated by hand. No model files. |
| `js/game.js` | Screens and game flow: title, intro, talking scenes, notebook, solving the case, case report. |
| `js/art.js` | Character colors, placeholder portraits and backgrounds, intro maps, and loading of real art. |
| `cast.html` | A development page that lines up every 3D character. Drag to turn them, press W to make them walk. |
| `css/game.css` | All styling. |
| `art/` | Real art from Google Flow (see below). |
| `js/vendor/three.min.js` | three.js r149 (MIT license). |

## Adding Google Flow art

The people walking around town are 3D models built in code, so they need no art. Flow art is only for the face-to-face scenes and the intro.

1. Export images from Flow. Make portraits on the flat green background.
2. Remove the green from portraits:
   ```
   python3 tools/key_green.py pike-proud.png pike-teary.png --out art/portraits
   ```
   Backgrounds and intro scenes don't need this step. Copy them straight into `art/backgrounds` and `art/intro`.
3. List each new file in `art/manifest.js`. The game uses placeholder art for anything not listed.

File names:

| Kind | Name | Notes |
| --- | --- | --- |
| Portraits | `art/portraits/<character>-<expression>.png` | e.g. `pike-proud.png`. Expressions are listed in `js/data.js`. |
| Goat | `art/portraits/senator-chewing.png`, `senator-bleating.png` | |
| Backgrounds | `art/backgrounds/bg-<place>.png` | cabin, polling, tavern, store, post, forge, ferry, print, wagon, school |
| Intro scenes | `art/intro/intro-<n>.png` | 2, 3, 4, 6, 7, 8, 9. Panels 1 and 5 are maps drawn in code. |

Character ids: `mrsbrown`, `whitcomb`, `pruitt`, `pike`, `tuttle`, `grayson`, `byrne`, `bell`, `cobb`, `hale`, `senator`.
