import { Command, flags } from '@oclif/command';
import Workbelt, { OpenMode } from '~/index';

export default class Install extends Command {
  static description = 'installs dependencies';

  static examples = ['$ workbelt install'];

  static flags: flags.Input<any> = {
    'no-autoinstall': flags.boolean({
      char: 'n',
      description: 'never auto install systems',
      required: false
    }),
    'no-report': flags.boolean({
      required: false,
      description: 'do not generate report'
    }),
    autoinstall: flags.boolean({
      char: 'a',
      required: false,
      description: 'always auto install systems'
    }),
    config: flags.string({
      char: 'c',
      required: false,
      description: 'custom workbelt config path'
    }),
    'open-all': flags.boolean({
      char: 'O',
      description: 'opens all resources',
      required: false
    }),
    open: flags.boolean({
      char: 'o',
      description: 'opens resources not already installed',
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
      ...(flags['no-report'] ? { report: false } : { report: true }),
      ...(flags['open-all'] ? { open: OpenMode.All } : {}),
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
