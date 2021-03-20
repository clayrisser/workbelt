import fs from 'fs-extra';
import open from 'open';
import ora from 'ora';
import os from 'os';
import path from 'path';
import { mdToPdf } from 'md-to-pdf';
import Install from '~/install';
import Report from '~/report';
import system from '~/system';
import { HashMap } from '~/types';
import {
  ConfigLoader,
  Dependencies,
  LoadedConfig,
  LoadedDependency
} from '~/config';

const pkg: Pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json')).toString()
);

export default class Workbelt {
  options: WorkbeltOptions;

  config: LoadedConfig;

  dependencies: Dependencies;

  report = new Report();

  spinner = ora();

  constructor(options: Partial<WorkbeltOptions> = {}) {
    this.options = {
      configPath: path.resolve('./workbelt.yaml'),
      cwd: process.cwd(),
      ...options
    };
    const configLoader = new ConfigLoader();
    this.config =
      this.options.config || configLoader.load(this.options.configPath);
    this.dependencies = Object.values(['all', ...system.systems]).reduce(
      (dependencies: Dependencies, systemName: string) => {
        return Object.entries(this.config.systems[systemName] || {}).reduce(
          (
            dependencies: Dependencies,
            [dependencyName, dependency]: [string, LoadedDependency]
          ) => {
            dependencies[dependencyName] = dependency;
            return dependencies;
          },
          dependencies
        );
      },
      {}
    );
  }

  async install() {
    const results = await Promise.all(
      Object.entries(this.dependencies).map(
        async ([dependencyName, dependency]: [string, LoadedDependency]) => {
          const install = new Install(this.config, dependency, dependencyName);
          await install.run();
          return install;
        }
      )
    );
    this.report.addInfo(`# ${
      this.config.name ? `${this.config.name} ` : ''
    }Install Report

`);
    results.forEach((install: Install) => {
      this.report.addInfo(install.report.infos);
    });
    await this.createReport(ReportFormat.Pdf);
  }

  async createReport(openFormat?: ReportFormat) {
    this.spinner.start('generating report');
    const tmpNamespace = path.resolve(os.tmpdir(), pkg.name);
    await fs.mkdirs(tmpNamespace);
    const tmpPath = await fs.mkdtemp(`${tmpNamespace}/`);
    const mdPath = path.resolve(tmpPath, 'info.md');
    const pdfPath = path.resolve(tmpPath, 'info.pdf');
    await this.report.writeInfo(mdPath);
    await mdToPdf({ path: mdPath }, { dest: pdfPath });
    switch (openFormat) {
      case ReportFormat.Pdf: {
        await open(`file://${pdfPath}`);
        break;
      }
      case ReportFormat.Md: {
        await open(`file://${mdPath}`);
        break;
      }
    }
    this.spinner.succeed('generated report\n');
    this.report.logInfo();
  }
}

export interface WorkbeltOptions {
  config?: LoadedConfig;
  configPath: string;
  cwd: string;
}

export interface Pkg extends HashMap<any> {
  description: string;
  name: string;
  version: string;
}

export enum ReportFormat {
  Md = 'md',
  Pdf = 'pdf'
}
