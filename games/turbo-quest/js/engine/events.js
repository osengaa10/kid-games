// A tiny event bus. The game rules emit what happened ('jump', 'land', 'star', ...) and the
// renderer, sounds and effects listen, so the rules never touch the screen or the speakers.

export class Events {
  constructor() {
    this.handlers = new Map();
  }

  on(type, fn) {
    let list = this.handlers.get(type);
    if (!list) this.handlers.set(type, (list = []));
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit(type, data) {
    const list = this.handlers.get(type);
    if (!list) return;
    for (let i = 0; i < list.length; i++) list[i](data);
  }

  clear() {
    this.handlers.clear();
  }
}
