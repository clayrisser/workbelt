import execa, { ExecaError } from 'execa';
import open from 'open';
import Report from '~/report';
import { LoadedDependency, LoadedConfig } from '~/config';

const logger = console;

export default class Install {
  constructor(
    private config: LoadedConfig,
    private dependency: LoadedDependency,
    _dependencyName: string,
    private report = new Report()
  ) {}

  async run() {
    const { install, open } = this.dependency;
    if (/^https?:\/\//g.test(install)) {
      await this.openUrl(install);
    } else if (this.config.autoinstall) {
      await this.runScript(install);
    }
    if (open) await this.openUrl(open);
  }

  async openUrl(url: string) {
    await open(url);
    this.report.info(`opened ${url}`);
  }

  async runScript(script: string) {
    try {
      await execa(script, {
        cwd: this.dependency._cwd,
        shell: true,
        stdio: 'inherit'
      });
    } catch (err: any) {
      const { exitCode } = err as ExecaError;
      if (!exitCode) throw err;
    }
    this.report.info(`ran script '${script}'`);
  }

  async renderInstructions(instructions: string) {
    logger.info(instructions);
  }
}
