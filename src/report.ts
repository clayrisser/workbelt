import fs from 'fs-extra';
import path from 'path';

const logger = console;

export default class Report {
  infos: string[] = [];

  addInfo(message: string | string[]) {
    this.infos = [
      ...this.infos,
      ...(Array.isArray(message) ? message : [message])
    ];
  }

  logInfo() {
    this.infos.forEach((info: string) => {
      logger.info(info);
    });
  }

  async writeInfo(filePath: string = path.resolve(process.cwd(), 'info.log')) {
    await fs.writeFile(filePath, this.infos.join('\n'));
  }
}
