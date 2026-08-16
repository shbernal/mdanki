/*
 * What is configurable here is presentation. The grammar is not: mdanki implements
 * Flashcard Markdown, and the card separator, the front/back separator and the tag
 * pattern used to be regexes a user could override — which is precisely how one
 * package ends up with a dialect of its own. They were removed in version 4, and
 * `src/spec/` owns those rules now.
 */
export interface Settings {
  code: {
    defaultLanguage: string;
    template: "default" | "dark";
  };
  deck: {
    defaultName: string;
  };
  template: {
    formats: {
      question: string;
      answer: string;
      css: string;
    };
  };
}

export const settings: Settings = {
  code: {
    defaultLanguage: "bash",
    template: "dark",
  },
  deck: {
    defaultName: "mdanki",
  },
  template: {
    formats: {
      question:
        '{{Front}}<link rel="stylesheet" href="_highlight_default.css"><link rel="stylesheet" href="_highlight_dark.css"></link><script>var script;"undefined"==typeof hljs&&((script=document.createElement("script")).src="_prism.js",script.async=!1,document.head.appendChild(script));(script=document.createElement("script")).src="_highlight.js",script.async=!1,document.head.appendChild(script),document.head.removeChild(script);</script>',
      answer: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}',
      css: '.card {\n font-family: Arial,"Helvetica Neue",Helvetica,sans-serif;\n font-size: 16px;\n color: black;\nbackground-color: white;\n}\ncode[class*="language-"],pre[class*="language-"] {\n font-size: 0.9em !important;\n}',
    },
  },
};
