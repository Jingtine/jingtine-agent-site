# Sidebar Playlist Expansion Design

## Summary

Extend the sidebar player from one song to a twelve-song playlist: the existing 一见如故 plus the eleven user-provided 许嵩 songs, in the folder's numbered order. Every new source is AAC/fMP4 mislabeled `.mp3`, so all are transcoded to real MP3; each song's cover is cropped square and converted to WebP.

## Change

- A temporary build script walks `C:\Users\LJT\Desktop\new-songs-list`, and for each of the eleven numbered folders:
  - transcodes the audio with the bundled ffmpeg to `source/audio/<slug>.mp3` (MP3 96 kbps, 44.1 kHz stereo, tags stripped);
  - center-crops the cover to a square and saves `source/audio/<slug>.webp` (640×640, quality 82).
- Slugs in folder order: `laoge`, `yumu`, `sudi`, `rumi`, `shanshui`, `qingming`, `qiandu`, `huanting`, `wenquan`, `mingzhi`, `ruyue`. Titles come from the audio file names (the `4-如秘` folder holds `如谜.mp3`, so the title is 如谜); the artist is 许嵩 everywhere.
- `_config.reimu.yml` lists twelve audio entries (一见如故 first, then 1→11) and adds `listFolded: true` and `loop: all` beside the existing `preload: none`.
- Estimated repository growth: about 34 MB of audio plus under 1 MB of covers.

## Non-goals

- No lyrics for the new songs.
- No Meting or remote audio.
- No shared-cover deduplication (two songs use the same 寻宝游戏 artwork; each keeps its own WebP).
- The audio remains publicly redistributed at the owner's decision.

## Tests

- Unit (`tests/unit/config.test.mjs`): the `audio:` names appear in the exact playlist order, and `listFolded: true` is set.
- Unit (`tests/unit/assets.test.mjs`): a table of all twelve slugs checks each MP3 header and size (< 4 MB) and each cover's WebP magic and size (< 150 KB).
- Unit (`tests/unit/generated-site.test.mjs`): the home page embeds twelve audio JSON entries in playlist order with project-root URLs.
- E2E (`tests/e2e/site.spec.js`): every audio and cover asset responds 200 and the sidebar player element exists.

## Files

- `_config.reimu.yml`
- `source/audio/<slug>.mp3` ×11 (new)
- `source/audio/<slug>.webp` ×11 (new)
- `tests/unit/config.test.mjs`
- `tests/unit/assets.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The sidebar playlist shows twelve songs in order with their covers; playback works for the new tracks.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass; screenshots confirm the playlist UI.
