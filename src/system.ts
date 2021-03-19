import fs from 'fs-extra';
import glob from 'glob';
import memoize from 'lodash.memoize';

export class SystemDetector {
  private getSystem = memoize(() => {
    if (
      process.platform === System.Win32 &&
      (/64/.test(process.arch) || process.env.PROCESSOR_ARCHITEW6432)
    ) {
      return System.Win64;
    }
    const { release } = this;
    if (process.platform === System.Linux && release) {
      if (/centos/i.test(release)) return System.Centos;
      if (/debian/i.test(release)) return System.Debian;
      if (/fedora/i.test(release)) return System.Fedora;
      if (/red\shat/i.test(release)) return System.RedHat;
      if (/ubuntu/i.test(release)) return System.Ubuntu;
    }
    return process.platform;
  });

  private get system() {
    return this.getSystem();
  }

  private get release(): string | null {
    const releasePath = glob.sync('/etc/*-release')?.[0] || '/os-release';
    if (!fs.pathExistsSync(releasePath)) return null;
    return fs.readFileSync(releasePath).toString();
  }

  get centos() {
    return this.system === System.Centos;
  }

  get darwin() {
    return this.system === System.Darwin;
  }

  get debian() {
    return this.ubuntu || this.system === System.Debian;
  }

  get fedora() {
    return this.system === System.Fedora;
  }

  get info() {
    return {
      centos: this.centos,
      darwin: this.darwin,
      debian: this.debian,
      fedora: this.fedora,
      linux: this.linux,
      mac: this.mac,
      osx: this.osx,
      redhat: this.redhat,
      rhel: this.rhel,
      ubuntu: this.ubuntu,
      unix: this.unix,
      win32: this.win32,
      win64: this.win64,
      win: this.win,
      windows: this.windows
    };
  }

  get systems(): Set<System> {
    return new Set(
      Object.entries(this.info).reduce(
        (systems: System[], [system, isSystem]) => {
          if (isSystem === true) systems.push(system as System);
          return systems;
        },
        []
      )
    );
  }

  get linux() {
    if (this.rhel) return true;
    if (this.debian) return true;
    return this.system === System.Linux;
  }

  get mac() {
    return this.darwin;
  }

  get osx() {
    return this.darwin;
  }

  get redhat() {
    return this.system === System.RedHat;
  }

  get rhel() {
    return this.redhat || this.centos || this.fedora;
  }

  get ubuntu() {
    return this.system === System.Ubuntu;
  }

  get unix() {
    return this.linux || this.darwin;
  }

  get win32() {
    return this.system === System.Win32;
  }

  get win64() {
    return this.system === System.Win64;
  }

  get win() {
    return this.win32 || this.win64;
  }

  get windows() {
    return this.win;
  }
}

export default new SystemDetector();

export enum System {
  Centos = 'centos',
  Darwin = 'darwin',
  Debian = 'debian',
  Fedora = 'fedora',
  Linux = 'linux',
  Mac = 'mac',
  OSX = 'osx',
  RedHat = 'redhat',
  Rhel = 'rhel',
  Ubuntu = 'ubuntu',
  Unix = 'unix',
  Win = 'win',
  Win32 = 'win32',
  Win64 = 'win64',
  Windows = 'windows'
}
