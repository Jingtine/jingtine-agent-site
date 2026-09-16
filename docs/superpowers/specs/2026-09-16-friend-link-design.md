# Friend Link Design

## Summary

Add one friend card for the classmate blog 江畔絮语 (`https://water1i1y.org/`) using Reimu's built-in `{% friendsLink %}` design and the information displayed on whyself's links page.

## Change

`source/friend/_data.yml` becomes:

```yaml
- name: 江畔絮语
  url: https://water1i1y.org/
  desc: 一位文院学生思考的存档地
  image: https://water1i1y.org/img/dia.jpg
```

Reimu's `scripts/tag/friendLink.js` renders each entry as a card with an overlay link; the template already emits `rel="noopener nofollow noreferrer"` and `target="_blank"`, and uses the name as the avatar `alt`.

## Non-goals

- No theme or `node_modules/` edits.
- No local copy of the avatar; it stays hotlinked from the friend's own site (if it fails, the name, description, and link still render).
- No other friend entries and no changes to the friend page prose.

## Tests

- Unit (`tests/unit/content.test.mjs`): the data file contains exactly the agreed name, https URL, description, and https image.
- Unit (`tests/unit/generated-site.test.mjs`): the generated friend page renders the card with the link target and `rel`, the name text, and the avatar `src`.
- E2E (`tests/e2e/site.spec.js`): the friend page shows the card (name and description visible, link attributes correct, avatar `src` present).

## Files

- `source/friend/_data.yml`
- `tests/unit/content.test.mjs`
- `tests/unit/generated-site.test.mjs`
- `tests/e2e/site.spec.js`

## Acceptance

- The friend page shows the 江畔絮语 card in Reimu's friend design.
- `npm run check`, `npm run test:unit`, and `npm run test:e2e` pass.
- Friend page screenshots in light and dark themes confirm the card.
