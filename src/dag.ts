export default class Dag<D> {
  dags: IDag<D>[] = [];

  private _dagMap: HashMap<IDag<D>>;

  constructor(nodes: Node<D>[]) {
    this._dagMap = nodes.reduce((dagMap: HashMap<IDag<D>>, node: Node<D>) => {
      dagMap[node.name] = {
        ...(node.data ? { data: node.data } : {}),
        edges: [],
        node,
        vertex: node.name
      };
      return dagMap;
    }, {});
    this.dags = nodes.reduce((dags: IDag<D>[], node: Node<D>) => {
      if (this._dagMap[node.name]) {
        if (node.dependencies) {
          node.dependencies.forEach((dependency: string) => {
            const dag = this._dagMap[node.name];
            this._dagMap[dependency]?.edges?.push(dag);
          });
        } else {
          dags.push(this._dagMap[node.name]);
        }
      }
      return dags;
    }, []);
  }

  get ordered(): Node<D>[] {
    const nodes: Node<D>[] = [];
    this.dags.map((dag: IDag<D>) =>
      this._walk(dag, (dag: IDag<D>) => {
        nodes.push(dag.node);
      })
    );
    return nodes;
  }

  getVertex(vertex: string) {
    return this._dagMap[vertex];
  }

  private _walk<T = any>(dag: IDag<D>, cb?: (dag: IDag<D>) => T) {
    if (cb) cb(dag);
    dag.edges.map((dag: IDag<D>) => this._walk(dag, cb));
  }
}

export interface HashMap<T = any> {
  [key: string]: T;
}

export interface IDag<D = any> {
  data?: D;
  edges: IDag<D>[];
  node: Node<D>;
  vertex: string;
}

export interface Node<D = any> {
  data?: D;
  dependencies?: string[];
  name: string;
}
