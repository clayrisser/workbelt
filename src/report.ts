import fs from 'fs-extra';
import path from 'path';

const logger = console;

export default class Report {
  constructor(public level = '###') {}

  infos: string[] = [];

  errors: (Error | string)[] = [];

  addInfo(message: string | string[]) {
    this.infos = [
      ...this.infos,
      ...(Array.isArray(message) ? message : [message])
    ];
  }

  addErrors(errors: (Error | string) | (Error | string)[]) {
    this.errors = [
      ...this.errors,
      ...(Array.isArray(errors) ? errors : [errors])
    ];
  }

  getMd(options: Partial<GetMdOptions> = {}) {
    const { trim }: GetMdOptions = {
      trim: false,
      ...options
    };
    let md = [
      ...this.infos,
      ...(this.errors.length
        ? [
            `${this.level ? `${this.level} ` : ''}Errors`,
            ...[
              '```',
              this.errors
                .map((error: any) => {
                  return (error.shortMessage || error.message || error)
                    .toString()
                    .trim();
                })
                .join('\n'),
              '```',
              ''
            ]
          ]
        : [])
    ].join('\n');
    if (trim) md = md.trim();
    return md;
  }

  get md() {
    return this.getMd();
  }

  logInfo() {
    this.infos.forEach((info: string) => {
      logger.info(info);
    });
  }

  logMd(options: Partial<LogMdOptions> = {}) {
    const { trim }: LogMdOptions = {
      trim: false,
      ...options
    };
    logger.info(this.getMd({ trim }));
  }

  async writeMd(
    filePath: string = path.resolve(process.cwd(), 'info.md'),
    options: Partial<WriteMdOptions> = {}
  ) {
    const { trim }: WriteMdOptions = {
      trim: false,
      ...options
    };
    await fs.writeFile(filePath, this.getMd({ trim }));
  }

  async writeInfo(filePath: string = path.resolve(process.cwd(), 'info.log')) {
    await fs.writeFile(filePath, this.infos.join('\n'));
  }

  async writeErrors(
    filePath: string = path.resolve(process.cwd(), 'error.log')
  ) {
    await fs.writeFile(
      filePath,
      this.errors
        .map((error: any) => {
          return (error.message || error).toString();
        })
        .join('\n')
    );
  }
}

export interface WriteMdOptions {
  trim: boolean;
}

export interface GetMdOptions {
  trim: boolean;
}

export interface LogMdOptions {
  trim: boolean;
}
