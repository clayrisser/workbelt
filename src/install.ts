import execa, { ExecaError } from 'execa';
import open from 'open';
import { LoadedDependency, LoadedConfig } from '~/config';

const logger = console;

export default class Install {
  constructor(
    private config: LoadedConfig,
    private dependency: LoadedDependency,
    _dependencyName: string
  ) {}

  async run() {
    const { install } = this.dependency;
    if (/^https?:\/\//g.test(install)) {
      await this.openUrl(install);
    } else {
      if (this.config.autoinstall) {
        await this.runScript(install);
      }
    }
  }

  async openUrl(url: string) {
    return open(url);
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
  }

  async renderInstructions(instructions: string) {
    logger.info(instructions);
  }
}
