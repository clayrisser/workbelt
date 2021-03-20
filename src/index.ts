import fs from 'fs-extra';
import mapSeriesAsync from 'map-series-async';
import open from 'open';
import ora from 'ora';
import os from 'os';
import path from 'path';
import snakeCase from 'lodash.snakecase';
import username from 'username';
import { format } from 'date-fns';
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

  report = new Report('##');

  spinner = ora();

  started = new Date();

  constructor(options: Partial<WorkbeltOptions> = {}) {
    this.options = {
      configPath: path.resolve('./workbelt.yaml'),
      cwd: process.cwd(),
      ...options
    };
    const configLoader = new ConfigLoader();
    this.config =
      this.options.config || configLoader.load(this.options.configPath);
    if (typeof this.options.autoinstall !== 'undefined') {
      this.config.autoinstall = this.options.autoinstall;
    }
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
    const results = await mapSeriesAsync(
      Object.entries(this.dependencies),
      async ([dependencyName, dependency]: [string, LoadedDependency]) => {
        const install = new Install(
          this.config,
          dependency,
          dependencyName,
          this.spinner
        );
        await install.run();
        return install;
      }
    );
    await this.createReport(results, ReportFormat.Pdf);
  }

  async createReport(results: Install[], openFormat?: ReportFormat) {
    this.spinner.start('generating report');
    const resultsMap: ResultsMap = {
      failed: [],
      notInstalled: [],
      installed: []
    };
    results.forEach((install: Install) => {
      resultsMap[install.status].push(install);
    });
    this.report.addInfo(`# ${
      this.config.name ? `${this.config.name} ` : ''
    }Install Report

os: ${system.system} \\
username: ${await username()} \\
started: ${format(this.started, 'yyyy-MM-dd HH:mm:ss')} \\
finished: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}

## Dependencies

_${this.config.name} depends on the following software_${
      resultsMap.failed.length
        ? `

#### Failed to Auto Install`
        : ''
    }${resultsMap.failed.map(
      (install: Install) => `
  - [**✘ ${install.dependencyName}**](#✘-${snakeCase(install.dependencyName)})`
    )}${
      resultsMap.notInstalled.length
        ? `

#### Please Install Manually`
        : ''
    }${resultsMap.notInstalled.map(
      (install: Install) => `
  - [**➜ ${install.dependencyName}**](#➜-${snakeCase(install.dependencyName)})`
    )}${
      resultsMap.installed.length
        ? `

#### Successfully Auto Installed`
        : ''
    }${resultsMap.installed.map(
      (install: Install) => `
  - [**✔ ${install.dependencyName}**](#✔-${snakeCase(install.dependencyName)})`
    )}


`);
    if (resultsMap.failed.length) {
      this.report.addInfo(`## Failed to Auto Install
`);
      resultsMap.failed.forEach((install: Install) => {
        this.report.addInfo([install.report.md, '']);
      });
      this.report.addInfo('');
    }
    if (resultsMap.notInstalled.length) {
      this.report.addInfo(`## Please Install Manually
`);
      resultsMap.notInstalled.forEach((install: Install) => {
        this.report.addInfo([install.report.md, '']);
      });
      this.report.addInfo('');
    }
    if (resultsMap.installed.length) {
      this.report.addInfo(`## Successfully Auto Installed
`);
      resultsMap.installed.forEach((install: Install) => {
        this.report.addInfo([install.report.md, '']);
      });
      this.report.addInfo('');
    }
    const tmpNamespace = path.resolve(os.tmpdir(), pkg.name);
    await fs.mkdirs(tmpNamespace);
    const tmpPath = await fs.mkdtemp(`${tmpNamespace}/`);
    const mdPath = path.resolve(tmpPath, 'info.md');
    const pdfPath = path.resolve(tmpPath, 'info.pdf');
    await this.report.writeMd(mdPath);
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
    this.report.logMd();
  }
}

export interface WorkbeltOptions {
  autoinstall?: boolean;
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

export interface ResultsMap {
  failed: Install[];
  installed: Install[];
  notInstalled: Install[];
}
