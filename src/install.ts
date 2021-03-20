import execa, { ExecaError } from 'execa';
import openUrl from 'open';
import ora from 'ora';
import Report from '~/report';
import { LoadedDependency, LoadedConfig } from '~/config';

export default class Install {
  constructor(
    private config: LoadedConfig,
    public dependency: LoadedDependency,
    public dependencyName: string,
    private spinner = ora()
  ) {
    this.report.addInfo(`### ➜ ${this.dependencyName}

_${this.dependencyName} was not auto installed_ \\
_**please install ${this.dependencyName} manually**_

#### Instructions
`);
  }

  report = new Report('####');

  status = InstallStatus.NotInstalled;

  async run() {
    await this.runScript();
    await this.renderInstructions();
    await this.openUrl();
  }

  async openUrl() {
    const { open, install } = this.dependency;
    if (!open) return;
    await openUrl(open);
    this.report.addInfo(`#### Resources

you can find ${install ? 'additional ' : ''}installation instructions for ${
      this.dependencyName
    } at the link below

${open.trim()}
`);
  }

  async runScript() {
    const { install, sudo } = this.dependency;
    if (!install) return;
    const autoinstall = this.config.autoinstall && !sudo;
    if (autoinstall) {
      this.spinner.info(`auto installing ${this.dependencyName}`);
      let exitCode = 0;
      const errChunks: string[] = [];
      try {
        const p = execa(install, {
          cwd: this.dependency._cwd,
          shell: true,
          stdio: 'inherit'
        });
        p?.stderr?.on('data', (chunk: Buffer) =>
          errChunks.push(chunk.toString())
        );
        await p;
        this.report.infos[0] = `### ✔ ${this.dependencyName}`;
      } catch (err: any) {
        exitCode = (err as ExecaError).exitCode;
        const message = `failed to auto install ${this.dependencyName}`;
        this.report.infos[0] = `### ✘ ${this.dependencyName}`;
        this.report.infos.splice(
          1,
          0,
          `
_${message}_ \\
_**please install ${this.dependencyName} manually**_

#### Instructions
`
        );
        this.report.addErrors(
          (err as ExecaError).stderr || errChunks.join('').trim() || err
        );
        if (!exitCode) throw err;
        this.spinner.fail(message);
        this.report.addInfo(
          `run the following script to install ${this.dependencyName}`
        );
        this.status = InstallStatus.Failed;
      }
      if (!exitCode) {
        this.spinner.succeed(`auto installed ${this.dependencyName}`);
        this.report.infos.splice(
          1,
          0,
          `
_successfully auto installed ${this.dependencyName}_ \\
_**you do not need to do anything for ${this.dependencyName}**_

#### Report
`
        );
        this.report.addInfo(
          `${this.dependencyName} was auto installed by running the following script`
        );
        this.status = InstallStatus.Installed;
      }
    } else {
      const warning = `${this.dependencyName} was not auto installed${
        this.config.autoinstall ? ' because it requires sudo privileges' : ''
      }`;
      if (this.config.autoinstall) this.spinner.warn(warning);
      this.report.infos[0] = `### ➜ ${this.dependencyName}`;
      this.report.infos.splice(
        1,
        0,
        `
_${warning}_ \\
_**please install ${this.dependencyName} manually**_

#### Instructions
`
      );
      this.report.addInfo(
        `please run the following script to install ${this.dependencyName}
`
      );
      this.status = InstallStatus.NotInstalled;
    }
    this.report.addInfo(
      `
\`\`\`sh
${sudo ? 'sudo su\n' : ''}${install.trim()}
\`\`\`
`
    );
  }

  async renderInstructions() {
    const { instructions } = this.dependency;
    if (!instructions) return;
    this.report.addInfo(`${instructions.trim()}
`);
  }
}

export enum InstallStatus {
  Failed = 'failed',
  Installed = 'installed',
  NotInstalled = 'notInstalled'
}
