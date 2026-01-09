export abstract class BaseParser<
  Input,
  Options extends Record<string, unknown> = Record<string, unknown>,
  Output = unknown,
> {
  protected options: Options;

  protected constructor(options: Options) {
    this.options = options;
  }

  static parse<Input, Options extends Record<string, unknown>, Output>(
    this: new (options: Options) => BaseParser<Input, Options, Output>,
    data: Input,
    options: Options,
  ): Promise<Output> | Output {
    return new this(options).parse(data);
  }

  abstract parse(data: Input): Promise<Output> | Output;
}
