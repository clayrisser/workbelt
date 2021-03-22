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
import Dag, { Node } from '~/dag';
import Install from '~/install';
import Report from '~/report';
import system from '~/system';
import { HashMap } from '~/types';
import {
  ConfigLoader,
  Dependencies,
  LoadedConfig,
  LoadedDependency,
  LoadedSystem
} from '~/config';

const logger = console;
const pkg: Pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json')).toString()
);

export default class Workbelt {
  options: WorkbeltOptions;

  config: LoadedConfig;

  report = new Report('##');

  spinner = ora();

  started = new Date();

  private _dependencies?: LoadedDependency[];

  constructor(options: Partial<WorkbeltOptions> = {}) {
    this.options = {
      configPath: path.resolve('./workbelt.yaml'),
      cwd: process.cwd(),
      open: OpenMode.None,
      report: true,
      ...options
    };
    const configLoader = new ConfigLoader();
    this.config =
      this.options.config || configLoader.load(this.options.configPath);
    if (typeof this.options.autoinstall !== 'undefined') {
      this.config.autoinstall = this.options.autoinstall;
    }
  }

  get dependencies(): LoadedDependency[] {
    if (this._dependencies) return this._dependencies;
    const systemNames = new Set(['all', ...system.systems]);
    const dependencies = Object.entries(this.config.systems || {}).reduce(
      (
        dependencies: Dependencies,
        [systemName, loadSystem]: [string, LoadedSystem]
      ) => {
        if (systemNames.has(systemName)) {
          dependencies = {
            ...dependencies,
            ...loadSystem
          };
        }
        return dependencies;
      },
      {}
    );
    const dependenciesDag = new Dag(
      Object.entries(dependencies).map<Node<LoadedDependency>>(
        ([dependencyName, loadedDependency]: [string, LoadedDependency]) => {
          const node: Node<LoadedDependency> = {
            name: dependencyName,
            data: loadedDependency,
            ...(loadedDependency.depends_on?.length
              ? { dependencies: loadedDependency.depends_on }
              : {})
          };
          return node;
        }
      )
    );
    this._dependencies = dependenciesDag.ordered.reduce(
      (dependencies: LoadedDependency[], node: Node<LoadedDependency>) => {
        if (node.data) dependencies.push(node.data);
        return dependencies;
      },
      []
    );
    return this._dependencies;
  }

  async install() {
    const results: Install[] = [];
    await mapSeriesAsync(
      this.dependencies,
      async (dependency: LoadedDependency) => {
        const install = new Install(
          this.config,
          this.options,
          dependency,
          dependency._name,
          results,
          this.spinner
        );
        results.push(install);
        await install.run();
        return install;
      }
    );
    await this.createReport(results, ReportFormat.Pdf);
  }

  async createReport(results: Install[], openFormat?: ReportFormat) {
    const resultsMap: ResultsMap = {
      alreadyInstalled: [],
      failed: [],
      installed: [],
      notInstalled: []
    };
    results.forEach((install: Install) => {
      resultsMap[install.status].push(install);
    });
    if (this.options.report) {
      this.spinner.start('generating report');
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
      )}${
        resultsMap.alreadyInstalled.length
          ? `

#### Already Installed`
          : ''
      }${resultsMap.alreadyInstalled.map(
        (install: Install) => `
  - [**✔ ${install.dependencyName}**](#✔-${snakeCase(install.dependencyName)})`
      )}


`);
      if (resultsMap.failed.length) {
        this.report.addInfo(`## Failed to Auto Install
`);
        resultsMap.failed.forEach((install: Install) => {
          this.report.addInfo([install.report.md, '\n']);
        });
        this.report.addInfo('');
      }
      if (resultsMap.notInstalled.length) {
        this.report.addInfo(`## Please Install Manually
`);
        resultsMap.notInstalled.forEach((install: Install) => {
          this.report.addInfo([install.report.md, '\n']);
        });
        this.report.addInfo('');
      }
      if (resultsMap.installed.length) {
        this.report.addInfo(`## Successfully Auto Installed
`);
        resultsMap.installed.forEach((install: Install) => {
          this.report.addInfo([install.report.md, '\n']);
        });
        this.report.addInfo('');
      }
      if (resultsMap.alreadyInstalled.length) {
        this.report.addInfo(`## Already Installed
`);
        resultsMap.alreadyInstalled.forEach((install: Install) => {
          this.report.addInfo([install.report.md, '\n']);
        });
        this.report.addInfo('');
      }
      const tmpNamespace = path.resolve(os.tmpdir(), pkg.name);
      await fs.mkdirs(tmpNamespace);
      const reportName = `${snakeCase(this.config.name).replace(
        /_/g,
        '-'
      )}-install-report`;
      const tmpPath = await fs.mkdtemp(`${tmpNamespace}/`);
      const mdPath = path.resolve(tmpPath, `${reportName}.md`);
      const pdfPath = path.resolve(tmpPath, `${reportName}.pdf`);
      await this.report.writeMd(mdPath, { trim: true });
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
      this.report.logMd({ trim: true });
      logger.info();
      this.spinner.info(`access markdown report at ${mdPath}`);
      this.spinner.info(`access pdf report at ${pdfPath}`);
    }
  }
}

export interface WorkbeltOptions {
  autoinstall?: boolean;
  config?: LoadedConfig;
  configPath: string;
  cwd: string;
  open?: OpenMode;
  report?: boolean;
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
  alreadyInstalled: Install[];
  failed: Install[];
  installed: Install[];
  notInstalled: Install[];
}

export enum OpenMode {
  All = 'all',
  Marked = 'marked',
  None = 'none'
}
