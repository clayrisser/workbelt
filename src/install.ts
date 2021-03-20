import execa, { ExecaError } from 'execa';
import openUrl from 'open';
import Report from '~/report';
import { LoadedDependency, LoadedConfig } from '~/config';

export default class Install {
  constructor(
    private config: LoadedConfig,
    public dependency: LoadedDependency,
    public dependencyName: string
  ) {
    this.report.addInfo(`## install ${this.dependencyName}
`);
  }

  report = new Report();

  async run() {
    await this.runScript();
    await this.openUrl();
    await this.renderInstructions();
    this.report.addInfo('\n');
  }

  async openUrl() {
    const { open, install } = this.dependency;
    if (!open) return;
    await openUrl(open);
    this.report.addInfo(`you can find ${
      install ? 'additional ' : ''
    }installation instructions at the link below

${open.trim()}`);
  }

  async runScript() {
    const { install, sudo } = this.dependency;
    if (!install) return;
    if (this.config.autoinstall) {
      try {
        await execa(install, {
          cwd: this.dependency._cwd,
          shell: true,
          stdio: 'inherit'
        });
      } catch (err: any) {
        const { exitCode } = err as ExecaError;
        if (!exitCode) throw err;
      }
      this.report.addInfo(
        `installed ${this.dependencyName} by running the following script

\`\`\`sh
${sudo ? 'sudo su\n' : ''}${install.trim()}
\`\`\`
`
      );
    } else {
      this.report.addInfo(
        `please run the following script to install ${this.dependencyName}

\`\`\`sh
${sudo ? 'sudo su\n' : ''}${install.trim()}
\`\`\`
`
      );
    }
  }

  async renderInstructions() {
    const { instructions } = this.dependency;
    if (!instructions) return;
    this.report.addInfo(instructions);
  }
}
