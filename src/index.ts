import path from 'path';
import { Config, ConfigLoader } from '~/config';

export default class Workbelt {
  options: WorkbeltOptions;

  config?: Config;

  constructor(options: Partial<WorkbeltOptions> = {}) {
    this.options = {
      configPath: path.resolve('./workbelt.yaml'),
      cwd: process.cwd(),
      ...options
    };
    const configLoader = new ConfigLoader();
    this.config =
      this.options.config || configLoader.load(this.options.configPath);
  }

  async install() {
    console.log(JSON.stringify(this.config, null, 2));
  }
}

export interface WorkbeltOptions {
  config?: Config;
  configPath: string;
  cwd: string;
}
