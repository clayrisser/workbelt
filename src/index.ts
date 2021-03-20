import path from 'path';
import Install from '~/install';
import Report from '~/report';
import system from '~/system';
import {
  ConfigLoader,
  Dependencies,
  LoadedConfig,
  LoadedDependency
} from '~/config';

export default class Workbelt {
  options: WorkbeltOptions;

  config: LoadedConfig;

  dependencies: Dependencies;

  report = new Report();

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
    await Promise.all(
      Object.entries(this.dependencies).map(
        async ([dependencyName, dependency]: [string, LoadedDependency]) => {
          const install = new Install(
            this.config,
            dependency,
            dependencyName,
            this.report
          );
          await install.run();
        }
      )
    );
    this.report.log();
  }
}

export interface WorkbeltOptions {
  config?: LoadedConfig;
  configPath: string;
  cwd: string;
}
