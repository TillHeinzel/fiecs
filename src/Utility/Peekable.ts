export class Peekable<T> extends Iterator<T, void> {
  public peek: IteratorResult<T, void>;
  constructor(private iterator: Iterator<T>) {
    super();
    this.peek = iterator.next();
  }
  next() {
    const curr = this.peek;
    this.peek = this.iterator.next();
    return curr;
  }
  [Symbol.iterator]() {
    return this;
  }
}
