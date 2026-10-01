export class OriginSequenceClock {
  constructor(lastCommitted = 0) {
    if (!Number.isInteger(lastCommitted) || lastCommitted < 0) {
      throw new Error('invalid-sequence-checkpoint');
    }
    this.current = lastCommitted;
  }

  next() {
    this.current += 1;
    return this.current;
  }

  checkpoint() {
    return this.current;
  }

  static restore(lastCommitted) {
    return new OriginSequenceClock(lastCommitted);
  }
}
