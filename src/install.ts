import execa, { ExecaError } from 'execa';
import openUrl from 'open';
import ora from 'ora';
import which from 'which';
import Report from '~/report';
import { LoadedDependency, LoadedConfig } from '~/config';

export default class Install {
  constructor(
    private config: LoadedConfig,
    public dependency: LoadedDependency,
    public dependencyName: string,
    private results: Install[],
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
    await this._detect();
    await this._runScript();
    await this._renderInstructions();
    await this._openResources();
  }

  private async _detect() {
    try {
      const result = await which(this.dependencyName);
      if (result) this.status = InstallStatus.AlreadyInstalled;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  private async _openResources() {
    const { open, install, resources } = this.dependency;
    if (!resources?.length) return;
    this.report.addInfo(`#### Resources

you can find ${install ? 'additional ' : ''}installation instructions for ${
      this.dependencyName
    } at the link${resources.length > 1 ? 's' : ''} below

${resources.map((resource: string) => resource).join('\n\n')}`);
    if (!open) return;
    await Promise.all(resources.map((resource: string) => openUrl(resource)));
  }

  private async _runScript() {
    const { install, sudo } = this.dependency;
    let { autoinstall } = this.dependency;
    const dependsOnNotInstalled = this._getDependsOnNotInstalled();
    autoinstall =
      !!install &&
      autoinstall &&
      this.config.autoinstall &&
      this.status !== InstallStatus.AlreadyInstalled;
    if (!dependsOnNotInstalled.length && !sudo && autoinstall && install) {
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
        if (this.status !== InstallStatus.AlreadyInstalled) {
          this.status = InstallStatus.Failed;
        }
      }
      if (!exitCode) {
        const message = `auto installed ${this.dependencyName}`;
        this.spinner.succeed(message);
        this.report.infos.splice(
          1,
          0,
          `
_successfully ${message}_ \\
_**you do not need to do anything for ${this.dependencyName}**_

#### Report
`
        );
        this.report.addInfo(
          `${this.dependencyName} was auto installed by running the following script`
        );
        if (this.status !== InstallStatus.AlreadyInstalled) {
          this.status = InstallStatus.Installed;
        }
      }
    } else {
      let warning = `${this.dependencyName} was not auto installed`;
      if (autoinstall) {
        if (dependsOnNotInstalled.length) {
          warning = `${warning}${
            autoinstall
              ? ` because it depends on ${this._listToString(
                  dependsOnNotInstalled
                )} which ${
                  dependsOnNotInstalled.length > 1 ? 'are' : 'is'
                } not installed`
              : ''
          }`;
        } else if (sudo) {
          warning = `${warning}${
            autoinstall ? ' because it requires sudo privileges' : ''
          }`;
        }
      }
      if (autoinstall) this.spinner.warn(warning);
      if (this.status === InstallStatus.AlreadyInstalled) {
        this.report.infos[0] = `### ✔ ${this.dependencyName}`;
        const message = `${this.dependencyName} already installed`;
        this.spinner.info(message);
        this.report.infos.splice(
          1,
          0,
          `
_${message}_ \\
_**you do not need to do anything for ${this.dependencyName}**_

#### Report
`
        );
        this.report.addInfo(
          `${this.dependencyName} was possibly installed by running the following script`
        );
      } else {
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
        if (install) {
          this.report.addInfo(
            `please run the following script to install ${this.dependencyName}
`
          );
        }
        this.status = InstallStatus.NotInstalled;
      }
    }
    if (install) {
      this.report.addInfo(
        `\`\`\`sh
${install.trim()}
\`\`\`
`
      );
    }
  }

  private async _renderInstructions() {
    const { instructions } = this.dependency;
    if (!instructions) return;
    this.report.addInfo(`${instructions.trim()}
`);
  }

  private _listToString(arr: string[]) {
    const start = arr.slice(0, -1).join(', ');
    const end = arr.slice(-1);
    let comma = arr.length > 2 ? ', and ' : ' and ';
    if (arr.length <= 1) comma = '';
    return [start, end].join(comma);
  }

  private _getDependsOnNotInstalled(): string[] {
    const dependsOn = new Set(this.dependency.depends_on);
    return this.results
      .filter((install: Install) => {
        return (
          dependsOn.has(install.dependencyName) &&
          install.status !== InstallStatus.Installed &&
          install.status !== InstallStatus.AlreadyInstalled
        );
      })
      .map((install: Install) => install.dependencyName);
  }
}

export enum InstallStatus {
  AlreadyInstalled = 'alreadyInstalled',
  Failed = 'failed',
  Installed = 'installed',
  NotInstalled = 'notInstalled'
}
