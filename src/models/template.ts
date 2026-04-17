import type { Config } from "../configs/index.js";

export type TemplateFormats = Config["template"]["formats"];

class Template {
  questionFormat: string;

  answerFormat: string;

  css: string;

  constructor(config: Config, formats?: Partial<TemplateFormats>) {
    const defaults = config.template.formats;
    this.questionFormat = formats?.question ?? defaults.question;
    this.answerFormat = formats?.answer ?? defaults.answer;
    this.css = formats?.css ?? defaults.css;
  }
}

export default Template;
