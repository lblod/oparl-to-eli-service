import flatten from 'lodash/flatten.js';

export class Delta {
  delta;
  constructor(delta) {
    this.delta = delta;
  }

  get inserts() {
    return flatten(this.delta.map((changeSet) => changeSet.inserts));
  }

  getInsertsFor(predicate, object) {
    return this.inserts
      .filter(
        (t) => t.predicate.value === predicate && t.object.value === object,
      )
      .map((t) => t.subject.value);
  }
}