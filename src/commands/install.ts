import { Command, flags } from '@oclif/command';
import Workbelt from '~/index';

export default class Install extends Command {
  static description = 'installs dependencies';

  static examples = ['$ workbelt install'];

  static flags: flags.Input<any> = {
    config: flags.string({ char: 'c', required: false })
  };

  static strict = false;

  static args = [];

  async run() {
    const { flags } = this.parse(Install);
    const workbelt = new Workbelt({
      ...(flags.config
        ? {
            configPath: flags.config
          }
        : {})
    });
    await workbelt.install();
    process.exit();
  }
}
