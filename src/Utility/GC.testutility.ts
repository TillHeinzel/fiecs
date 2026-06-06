export class ObjectGCTracker {
  private objects = new Map<number, WeakRef<object>>();
  private registry = new FinalizationRegistry((key: number) => {
    this.objects.delete(key);
  });

  private key = 0;

  add(obj: object) {
    const key = this.key++;
    this.objects.set(key, new WeakRef(obj));
    this.registry.register(obj, key);
    obj = null as unknown as object;
  }

  count() {
    return this.objects.size;
  }

  clearDead() {
    this.objects.entries().forEach(([key, ref]) => {
      if (ref.deref() === undefined) {
        this.objects.delete(key);
      }
    });
  }
}

export function awaitGC(ms: number = 10) {
  return new Promise<void>((resolve) => {
    // @ts-expect-error //ts seems to not like this
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    global.gc();

    // eslint-disable-next-line
    const timer = setInterval(() => {
      // eslint-disable-next-line
      clearInterval(timer);
      resolve();
    }, ms);
  });
}
