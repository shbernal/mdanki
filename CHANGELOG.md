# Changelog

Notable changes per release. Versions before 3.0.0 predate this file; see the
[tags](https://github.com/shbernal/mdanki/tags) for their history.

## 4.0.0

The format round. MDAnki now implements
[Flashcard Markdown 1.0](https://github.com/shbernal/flashcard-md-spec) — a written
specification with a conformance corpus, shared with the other tools that read the same
files — and the two syntaxes only MDAnki ever accepted are gone.

**Neither removal produces an error on a file that still uses them**, which is the whole
risk of this release: a `%` line becomes body text and a `[#tag]()` line becomes visible
text in the answer. MDAnki warns about both, on every file it sees them in.

### Changed

- **`***` replaces `%` as the front/back separator.** The separator is a line of exactly
  `***`, at the top level of the card — not indented into a list, not in a blockquote,
  and not inside a code fence, where it is content. `---`, `___`, `* * *` and `****` are
  ordinary thematic breaks and stay in the card.

  `***` rather than `---` because in CommonMark a text line followed by `---` is a setext
  heading, so `---` would make the split depend on where the blank lines fall.

- **Bare `#tag` replaces the `[#tag]()` link form.** Tags follow Obsidian's grammar:
  letters and digits, `_`, `-`, and `/` to nest, with at least one non-numeric character,
  and not recognized inside a code span or a code fence.

  A tag counts wherever it appears in the card, front region included. A line that is
  nothing but tags sets them and is not rendered; a tag inside a sentence sets them and
  **stays visible**, because dropping it would render "The #verbs group of motion" as
  "The group of motion".

- **A `#` heading in the middle of a file now ends the card above it.** A card ends at
  the next heading of level 1 or 2. Content between a stray `#` and the next `##` belongs
  to no card, and MDAnki reports the heading rather than folding it into a card.

  This is a card-boundary change, and it is why this release would be a major even
  without the two removals: a deck with a mid-file `#` produces different cards than it
  did in 3.0.0.

- **A `###` heading is card body content**, and always was; this only writes it down.

- **The grammar is no longer configurable.** `card.separator`, `card.frontBackSeparator`,
  `card.tagPattern` and `deck.titleSeparator` are gone from settings. They were regexes a
  user could override, and an overridable grammar is how a tool ends up reading a dialect
  no other tool can. Templates, the default code language and the default deck name are
  unaffected.

- **An image that cannot be resolved no longer fails the conversion.** MDAnki reports it,
  leaves the reference in the card as written, and finishes the deck. A missing file, a
  failed download and `--no-remote-media` all behave this way now.

### Added

- **File-level tags in YAML frontmatter.** `tags` takes a YAML sequence, and a file's
  tags are unioned with each card's:

  ```yaml
  ---
  tags:
    - french
    - verbs
  ---
  ```

  A leading `#` on a frontmatter tag is accepted and stripped. A scalar value
  (`tags: a, b`) and the singular `tag:` key are **not** read as tags and are reported —
  Obsidian removed both in 1.9, and accepting them here would mean a vault and its
  flashcard tools disagreeing about the same file.

- **Every other frontmatter key is a user extension**, ignored without an error. Decks
  carrying a `type:` or a `source:` keep working untouched.

- **Anki tag nesting.** `#french/grammar` is exported as `french::grammar`. A tag that
  would not survive Anki's model is sanitized and reported rather than altered quietly.

- **Cards with a front and no body are kept**, and duplicate `##` fronts stay two cards.
  3.0.0 dropped a bodyless card without a word.

- **Diagnostics.** Everything a file gives up on the way in is now named: a stray `#`, a
  card whose `##` heading is empty, a tag above the first card, a frontmatter `tags` that
  is not a sequence, an unresolved image. None of them stops the build. Silence is the
  one failure mode the format rules out, because content that vanishes produces no bug
  report.

### Removed

- The `%` front/back separator and the `[#tag]()` tag form, per the 3.0.0 deprecation.
  MDAnki still recognizes both patterns for long enough to say they no longer mean what
  they did; that warning goes away in 5.0.0.

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
