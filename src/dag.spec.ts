import Dag, { Node } from './dag';

describe('new Dag().ordered', () => {
  it('should order nodes based on dag', () => {
    const nodes: Node[] = [
      {
        name: '0'
      },
      {
        name: '1',
        dependencies: ['3']
      },
      {
        name: '2',
        dependencies: ['0']
      },
      {
        name: '3',
        dependencies: ['0']
      }
    ];
    expect(new Dag(nodes).ordered.map((node: Node) => node.name)).toEqual([
      '0',
      '2',
      '3',
      '1'
    ]);
  });

  it('should keep original order when no dependencies', () => {
    const nodes: Node[] = [
      {
        name: '0'
      },
      {
        name: '1'
      },
      {
        name: '2'
      },
      {
        name: '3'
      }
    ];
    expect(new Dag(nodes).ordered.map((node: Node) => node.name)).toEqual([
      '0',
      '1',
      '2',
      '3'
    ]);
  });

  it('should drop cycles', () => {
    const nodes: Node[] = [
      {
        name: '0'
      },
      {
        name: '1',
        dependencies: ['3']
      },
      {
        name: '2',
        dependencies: ['1']
      },
      {
        name: '3',
        dependencies: ['2']
      }
    ];
    expect(new Dag(nodes).ordered.map((node: Node) => node.name)).toEqual([
      '0'
    ]);
  });
});
