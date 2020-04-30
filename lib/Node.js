module.exports = class Node {
  constructor () {
    this.children = new Set();
    this.parent = null;
    this.terrain = null;

    // Whether this has previously disconnected from the tree
    this.hasDisconnected = false;
  }

  get moving () {
    // ant is moving if no parent exists (i.e. not in tree)
    return !this.parent;
  }

  place (node) {
    if (this.parent) throw new Error('You can only place a node when it has no paernt');
    this.terrain = node;
  }

  lift () {
    if (this.parent) throw new Error('You can only lift a node after it has been disconnected');
    // lif this node from its current terrain
    if (this.terrain) {
      this.terrain = null;
    }
  }

  add (child) {
    if (child.parent) throw new Error('Child already added to graph');
    this.children.add(child);
    child.parent = this;
  }

  remove (child) {
    if (this.children.has(child)) {
      if (child.parent !== this) throw new Error('Expected child parent to match this');
      child.parent = null;
      child.hasDisconnected = true;
      this.children.delete(child);
    }
  }

  disconnect () {
    // detaches this node from the parent
    if (this.parent) {
      this.parent.remove(this);
    }
  }

  get childCount () {
    return this.children.size;
  }
}