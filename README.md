# MDAnki

[![weekly downloads](https://img.shields.io/npm/dw/%40shbernal%2Fmdanki.svg?label=npm%20downloads&logo=npm)](https://www.npmjs.com/package/@shbernal/mdanki)
[![total downloads](https://img.shields.io/npm/dt/%40shbernal%2Fmdanki.svg?label=npm%20total%20downloads&logo=npm)](https://www.npmjs.com/package/@shbernal/mdanki)

Converts Markdown file(s) to the Anki cards.

The markdown it reads is [Flashcard Markdown](https://github.com/shbernal/flashcard-md-spec),
a specification with a conformance corpus that MDAnki runs in its own test suite. MDAnki
conforms as a **consumer**: it parses everything the format calls valid, and never
refuses a file because one card in it is malformed.

- [MDAnki](#mdanki)
  - [Requirements](#requirements)
  - [Install](#install)
  - [Usage](#usage)
  - [Custom template](#custom-template)
  - [The format](#the-format)
  - [Supported files](#supported-files)
  - [Cards](#cards)
  - [Tags](#tags)
  - [Code and syntax highlighting](#code-and-syntax-highlighting)
  - [Supported languages](#supported-languages)
  - [Images](#images)
  - [LaTeX](#latex)
  - [Memory limit](#memory-limit)

## Requirements

- Node.js v24+ (ESM-only)
- pnpm (preferred package manager)

## Install

```bash
pnpm install -g @shbernal/mdanki
```

## Usage

Convert a single markdown file:

```bash
mdanki library.md anki.apkg
```

Convert a single markdown file and let MDAnki pick the output path (current directory with `.apkg` extension):

```bash
mdanki library.md
```

Convert files from directory recursively:

```bash
mdanki ./documents/library ./documents/anki.apkg
```

Using all available options:

```bash
mdanki library.md anki.apkg --deck Library --template ~/.config/mdanki/template
```

Run without downloading remote assets (offline-friendly) or adjust the remote fetch timeout:

```bash
mdanki library.md --no-remote-media
mdanki library.md --remote-timeout 15000
```

Import just generated `.apkg` file to Anki ("File" - "Import").

## Programmatic API

Install as a dependency and use the transformer directly:

```bash
pnpm add @shbernal/mdanki
```

### One-call helper

```ts
import { convertMarkdownToAnkiDeck } from "@shbernal/mdanki";

const target = await convertMarkdownToAnkiDeck("./notes.md", {
  // target: './notes.apkg', // optional; inferred when source is a file
  deckName: "My Deck",
  allowRemoteMedia: true,
});
```

### Quickstart

```ts
// ESM only (Node 24+)
import { Transformer, resolveTargetPath } from "@shbernal/mdanki";

const source = "./notes.md";
const target = await resolveTargetPath(source);

const transformer = new Transformer(source, target, {
  deckName: "My Deck",
  templatePath: undefined, // set this to override the default cards
  allowRemoteMedia: true,
  remoteFetchTimeoutMs: 15_000,
});

await transformer.transform();
```

### What to pass

- `source`: a file (`.md` or `.markdown`) or a directory to recurse through
- `target`: absolute path to the `.apkg` to write; use `resolveTargetPath` to pick `./<source>.apkg` automatically for single files (directories must supply one)
- `deckName`: overrides the top-level `#` heading and default name from settings
- `templatePath`: directory containing `front.html`, `back.html`, `style.css` if you want a custom template
- `allowRemoteMedia`: fetch and embed remote images/assets found in markdown
- `remoteFetchTimeoutMs`: timeout (ms) for remote fetches
- `now`: epoch milliseconds to build the deck at, defaulting to the current time. Every timestamp in the archive derives from this one reading, so a fixed value makes the output byte-identical across runs

### Common patterns

Convert an entire folder of markdown files into one deck:

```ts
const transformer = new Transformer("./notes", "/abs/path/to/notes.apkg");
await transformer.transform();
```

Use a custom template:

```ts
const transformer = new Transformer("notes.md", "notes.apkg", {
  templatePath: "/home/user/.config/mdanki/template",
});
await transformer.transform();
```

Helpers such as `resolveTargetPath` and configuration utilities are exported from the package root. The CLI remains available via the `mdanki` binary for global installs.

## Custom template

To override the default card template ([defaults live here](./src/configs/settings.ts)) use the `--template` option and point to a directory containing these files (names are fixed):

```
your-template/
  front.html
  back.html
  style.css
```

For example:

```bash
mdanki library.md anki.apkg --template ~/.config/mdanki/template
```

The contents of `front.html`, `back.html`, and `style.css` are used as the question, answer, and CSS respectively. If the directory or any file is missing, MDAnki falls back to the built-in defaults.

## The format

MDAnki implements [Flashcard Markdown](https://github.com/shbernal/flashcard-md-spec)
version 1.0, and nothing beyond it. The grammar is not configurable: the card separator,
the front/back separator and the tag pattern used to be regexes you could override, which
is how a tool ends up with a dialect only it can read. They were removed in 4.0.0.

The sections below cover what you write day to day; the specification is the authority on
everything else, including the cases the two disagree about — those are bugs reported
against the spec repository.

## Supported files

MDAnki supports `.md` and `.markdown` files.

## Cards

A card is a `## ` heading and everything below it, up to the next heading of level 1 or 2.
The heading is the front, the body is the back. The markdown below makes two cards.

```
## What's the Markdown?

Markdown is a lightweight markup language with plain-text-formatting syntax.
Its design allows it to be converted to many output formats,
but the original tool by the same name only supports HTML.

## Who created Markdown?

John Gruber created the Markdown language in 2004 in collaboration with
Aaron Swartz on the syntax.

```

Nothing else ends a card. A blank line does not, a `###` heading does not — it is body
content — and neither does the end of a list.

To put more than the heading on the front, separate the two sides with a line of exactly
`***`:

```
## YAGNI

Describe this acronym and why it's so important.

***

"You aren't gonna need it" (YAGNI) is a principle of extreme programming
(XP) that states a programmer should not add functionality until deemed
necessary.

```

Only that exact spelling separates. `---`, `___`, `* * *` and `****` are ordinary
thematic breaks and stay in the card, as does a `***` inside a fenced code block.

> **Changed in 4.0.0.** `%` used to be the separator and is not recognized any more: a
> `%` line is body text now. MDAnki warns when it sees one. See the
> [changelog](./CHANGELOG.md).

When parsing a single markdown file, the deck name comes from the top-level `# ` heading.
Text between that heading and the first card belongs to no card and is not converted.

## Tags

Tags are bare `#tag` tokens, written the way Obsidian writes them: letters and digits,
`_`, `-`, and `/` to nest, with at least one non-numeric character. A tag is not
recognized inside a code span or a fenced code block.

A tag counts wherever it appears in the card. Whether it is _rendered_ depends on the
line it is on:

- a line that is nothing but tags is metadata — it sets the tags and does not appear on
  the card
- a tag inside a sentence sets the tag **and** stays visible, because removing it would
  turn "The #verbs group of motion" into "The group of motion"

The card below gets three tags: _algorithms_, _OOP_ and _data-structures_.

```
## Binary tree

In computer science, a binary tree is a tree data structure in which each node has at most two children, which are referred to as the left child and the right child.

#algorithms #OOP #data-structures
```

Tags can also be set for a whole file, in YAML frontmatter, and the two are unioned:

```
---
tags:
  - computer-science
  - data-structures
---
```

The value has to be a YAML sequence. A scalar (`tags: a, b`) and the singular `tag:` key
are not read as tags — Obsidian dropped both in 1.9, and reading them here would mean
your vault and your flashcards disagree about the same file. MDAnki says so rather than
ignoring them quietly. Any other frontmatter key is yours, and is ignored without
complaint.

Anki nests tags with `::` where the file nests with `/`; MDAnki translates on export, so
`#french/grammar` arrives in Anki as `french::grammar`.

> **Changed in 4.0.0.** The `[#tag]()` link form is not recognized any more and renders
> as visible text in the answer. MDAnki warns when it sees one.

## Code and syntax highlighting

Code blocks can be written with and without specifying a language name:

<pre>
```java
public static void main(String[] args) {
  System.out.println("Hello, World!");
}
```
</pre>
<pre>
```
echo "Hello, World!"
```
</pre>

The last code block will be treated by MDAnki as Bash code. The default language is `bash` (see `src/configs/settings.ts`).

**Note!** Creating a block without language name is not fully supported and should be eliminated in usage. Take a look at this:

```bash
echo "Code block with language name"
```

```
echo "Code block without language name"
```

## Supported languages

MDAnki supports code highlighting for these languages:

> actionscript, applescript, aspnet, bash, basic, batch, c, coffeescript, cpp, csharp, d, dart, erlang, fsharp, go, graphql, groovy, handlebars, java, json, latex, less, livescript, lua, makefile, markdown, markup-templating, nginx, objectivec, pascal, perl, php, powershell, python, r, ruby, rust, sass, scheme, smalltalk, smarty, sql, stylus, swift, typescript, vim, yaml.

## Images

You can use links to image files inside markdown, MDAnki will parse them and add those images to the import collection. It's allowed to use two styles for writing images:

1. Inline:
   ![alt text](samples/resources/nodejs.png "Node.js")

1. Reference:
   ![alt text][ROR]

[ROR]: samples/resources/ruby_on_rails.png "Logo Title Text 2"

## LaTeX

MDAnki and Anki can support LaTeX. Install LaTeX for your OS and use the `[latex]` attribute within Markdown files.

```
[latex]\\[e^x -1 = 3\\][/latex]
```

## Memory limit

Converting a big Markdown file you can get a memory limit error like this:

> Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value 16777216...

For overcoming this error, replace `sql.js`:

```bash
cp node_modules/sql.js/js/sql-memory-growth.js node_modules/sql.js/js/sql.js
```

More info [here](https://github.com/sql-js/sql.js#versions-of-sqljs-included-in-the-distributed-artifacts).
