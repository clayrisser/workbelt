import path from 'path';
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

  constructor(options: Partial<WorkbeltOptions> = {}) {
    this.options = {
      configPath: path.resolve('./workbelt.yaml'),
      cwd: process.cwd(),
      ...options
    };
    const configLoader = new ConfigLoader();
    this.config =
      this.options.config || configLoader.load(this.options.configPath);
    this.dependencies = Object.values([...system.systems]).reduce(
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
    console.log(this.dependencies);
  }
}

export interface WorkbeltOptions {
  config?: LoadedConfig;
  configPath: string;
  cwd: string;
}
