# Sidebar Music Player Design

## Summary

Add a self-hosted single-song APlayer to the sidebar for 许嵩《一见如故》, with the user-provided cover. The audio is transcoded from the provided AAC/fMP4 file into a real MP3 so every browser can play it; no third-party Meting API is involved.

## Change

- `source/audio/yi-jian-ru-gu.mp3`: transcoded with the bundled ffmpeg (imageio-ffmpeg, temporary install) to MP3 96 kbps, 44.1 kHz stereo, tags stripped; the source is AAC-LC 65 kbps, 4:22.
- `source/audio/yi-jian-ru-gu.webp`: the 5836×5836 cover resized to 640×640 WebP (quality 82).
- `_config.reimu.yml` enables `aplayer` with one audio entry (`name: 一见如故`, `artist: 许嵩`, project-root `url` and `cover`), `preload: none`, and keeps `meting.enable: false` and `disable_on_mobile: true`.
- The theme renders the player at `player.position: before_sidebar`, so it sits at the top of the desktop sidebar; no lyrics (`lrcType` default 0).

## Non-goals

- No Meting API, no remote audio, no lyrics file, no playlist.
- The MP3 is intentionally redistributed from the public repository; the trade-off (rights and repository size) was accepted by the owner.
- No theme or `node_modules/` edits; no npm dependencies.

## Tests

- Unit (`tests/unit/config.test.mjs`): aplayer enabled, meting disabled, the song entry fields, and `preload: none`.
- Unit (`tests/unit/assets.test.mjs`): the MP3 starts with a valid MPEG frame sync and stays under 4 MB; the cover is a WebP under 150 KB.
- Unit (`tests/unit/generated-site.test.mjs`): the home page mounts `#aplayer`, embeds the audio JSON with the project-root URLs, loads the APlayer vendor, and does not load MetingJS.
- E2E (`tests/e2e/site.spec.js`): the sidebar player element exists and both the MP3 and cover respond 200.

## Files

- `_config.reimu.yml`
- `source/audio/yi-jian-ru-gu.mp3`
- `source/audio/yi-jian-ru-gu.webp`
- `tests/unit/config.test.mjs`
- `tests/unit/assets.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The sidebar shows the player with cover, 一见如故 / 许嵩; pressing play streams the local MP3.
- Mobile keeps the player disabled; no third-party API is required.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass; screenshots confirm the rendered player.
