# Changelog

Notable changes per release. Versions before 3.0.0 predate this file; see the
[tags](https://github.com/shbernal/mdanki/tags) for their history.

## 3.0.0

A dependency round. Nothing about the markdown you write changes, but which Anki
notes a rebuilt deck matches on import does — read the first entry before
upgrading.

### Changed

- **`@shbernal/anki-apkg-export` is now `^5.1.0`**, which changes how a note's
  `guid` is derived, and the `guid` is what Anki matches on at import.

  What you get: rebuilding a deck and re-importing it now **updates** its notes.
  Before, the guid was derived from the deck id — a timestamp, different on every
  run — so every re-import added a second copy of every card, and the only way to
  stay tidy was to delete the deck first.

  What it costs, once: **the first import after upgrading duplicates the deck you
  already have.** Old guids and new guids do not overlap at all, so Anki sees an
  entirely new set of notes rather than an update. Every import after that one is
  stable.

  If you would rather not merge the two copies by hand, delete the deck in Anki
  before importing the first deck built with this version. Review history goes
  with it either way, so a deck you have been studying is worth the merge.

- **The exporter's database is released when the deck is written.** `mdanki` held
  a sql.js WASM heap per run until the process exited; long-running programs that
  called the library in a loop grew steadily. No API change.

### Added

- **A `now` option on `Transformer` and `convertMarkdownToAnkiDeck`.** Every
  timestamp in the archive derives from one clock reading, so passing a fixed
  epoch-millisecond value makes a build byte-reproducible across processes.
  Omitting it behaves as before. Programmatic only; there is no CLI flag.

- **A warning when two cards are identical, front and back.** Anki identifies a
  note by its content, so such cards have always collapsed into a single note —
  silently, and in every previous version. `mdanki` now says so instead of
  handing back a deck quietly shorter than the file. Cards that share only a
  front are unaffected: their backs differ, so their notes do.

### Deprecated

Both of the following still work exactly as before in 3.0.0. The next major stops
recognizing them, and — this is the reason for the warning — it will not report an
error when it does: the lines simply become part of the answer. `mdanki` now warns
on any file that uses either, so that a rebuild after the next upgrade does not
change your cards behind your back.

- **The `%` front/back separator**, replaced by a line of exactly `***`.
- **`[#tag]` tag lines**, replaced by bare `#tag` tokens.

The replacements come from a markdown flashcard specification shared across these
packages, which is what the next major implements.
