import { Marked, Renderer } from "marked";
import { markedHighlight } from "marked-highlight";
import Prism from "prismjs";

import { BaseParser } from "./base_parser.js";
import type { Config } from "../configs/index.js";

import "prismjs/components/prism-actionscript.js";
import "prismjs/components/prism-applescript.js";
import "prismjs/components/prism-aspnet.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-basic.js";
import "prismjs/components/prism-batch.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-coffeescript.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-d.js";
import "prismjs/components/prism-dart.js";
import "prismjs/components/prism-erlang.js";
import "prismjs/components/prism-fsharp.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-graphql.js";
import "prismjs/components/prism-groovy.js";
import "prismjs/components/prism-handlebars.js";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-latex.js";
import "prismjs/components/prism-less.js";
import "prismjs/components/prism-livescript.js";
import "prismjs/components/prism-lua.js";
import "prismjs/components/prism-makefile.js";
import "prismjs/components/prism-markdown.js";
import "prismjs/components/prism-markup-templating.js";
import "prismjs/components/prism-nginx.js";
import "prismjs/components/prism-objectivec.js";
import "prismjs/components/prism-pascal.js";
import "prismjs/components/prism-perl.js";
import "prismjs/components/prism-php.js";
import "prismjs/components/prism-powershell.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-r.js";
import "prismjs/components/prism-ruby.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-sass.js";
import "prismjs/components/prism-scheme.js";
import "prismjs/components/prism-smalltalk.js";
import "prismjs/components/prism-smarty.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-stylus.js";
import "prismjs/components/prism-swift.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-vim.js";
import "prismjs/components/prism-yaml.js";

Prism.languages["c#"] = Prism.languages.csharp;
Prism.languages["f#"] = Prism.languages.fsharp;
Prism.languages.sh = Prism.languages.bash;
Prism.languages.md = Prism.languages.markdown;
Prism.languages.py = Prism.languages.python;
Prism.languages.yml = Prism.languages.yaml;
Prism.languages.rb = Prism.languages.ruby;

interface MdParserOptions extends Record<string, unknown> {
  convertToHtml?: boolean;
}

export class MdParser extends BaseParser<string, MdParserOptions, string> {
  private renderer: Renderer<string, string>;

  private marked: Marked<string, string>;

  private config: Config;

  constructor(
    config: Config,
    options: MdParserOptions = { convertToHtml: true },
  ) {
    super(options);
    this.config = config;
    this.renderer = new Renderer<string, string>();
    this.marked = new Marked<string, string>();
    this.initMarked();
  }

  private highlight = (code: string, lang?: string, _info?: string): string => {
    const parsedLang = lang ?? this.config.code.defaultLanguage;
    if (Prism.languages[parsedLang]) {
      return Prism.highlight(code, Prism.languages[parsedLang], parsedLang);
    }
    return code;
  };

  private initMarked(): void {
    this.marked.use(
      markedHighlight({
        highlight: this.highlight,
      }),
    );

    this.marked.setOptions({
      renderer: this.renderer,
      gfm: true,
      breaks: true,
      pedantic: false,
    });
  }

  async parse(mdString: string): Promise<string> {
    const rendered = await this.marked.parse(mdString);
    return rendered;
  }
}
