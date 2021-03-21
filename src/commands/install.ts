import { Command, flags } from '@oclif/command';
import Workbelt, { OpenMode } from '~/index';

export default class Install extends Command {
  static description = 'installs dependencies';

  static examples = ['$ workbelt install'];

  static flags: flags.Input<any> = {
    'no-autoinstall': flags.boolean({ char: 'n', required: false }),
    'no-pdf': flags.boolean({ required: false }),
    autoinstall: flags.boolean({ char: 'a', required: false }),
    config: flags.string({ char: 'c', required: false }),
    'open-all': flags.boolean({
      char: 'O',
      description: 'opens all resources',
      required: false
    }),
    open: flags.boolean({
      char: 'o',
      description: 'opens all resources not marked open:false',
      required: false
    })
  };

  static strict = false;

  static args = [];

  async run() {
    const { flags } = this.parse(Install);
    const workbelt = new Workbelt({
      open: OpenMode.None,
      ...(flags.open ? { open: OpenMode.Marked } : {}),
      ...(flags['open-all'] ? { open: OpenMode.All } : {}),
      ...(flags['no-pdf'] ? { pdf: false } : { pdf: true }),
      ...(flags.config
        ? {
            configPath: flags.config
          }
        : {}),
      ...(typeof flags.autoinstall !== 'undefined'
        ? {
            autoinstall: true
          }
        : {}),
      ...(typeof flags['no-autoinstall'] !== 'undefined'
        ? {
            autoinstall: false
          }
        : {})
    });
    await workbelt.install();
    process.exit();
  }
}
