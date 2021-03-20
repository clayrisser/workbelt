const logger = console;

export default class Report {
  logs: string[] = [];

  info(message: string) {
    this.logs.push(message);
  }

  log() {
    this.logs.forEach((log: string) => {
      logger.info(log);
    });
  }
}
