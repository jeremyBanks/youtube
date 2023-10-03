function unwrap<T>(value: T | undefined, message?: string): T {
  if (value === undefined) {
    throw new TypeError(message ?? "unwrapped undefined value");
  }
  return value;
}

class List {
  #values: Array<string> = [];
  constructor(input: Iterable<string>) {
    this.#values = [...input];
  }

  get modifications() {
    return this.moves + this.pushes + this.removals;
  }

  #pushes = 0;

  get pushes() {
    return this.#pushes;
  }

  push(value: string) {
    this.#pushes += 1;
    this.#values.push(value);
  }

  #removals = 0;

  get removals() {
    return this.#removals;
  }

  remove(index: number) {
    this.#removals += 1;
    this.#values.splice(index, 1);
  }

  #moves = 0;

  get moves() {
    return this.#moves;
  }

  move(sourceIndex: number, destinationIndex: number): void {
    this.#moves += 1;
    const [value] = this.#values.splice(sourceIndex, 1);
    if (sourceIndex < destinationIndex) {
      destinationIndex -= 1;
    }
    this.#values.splice(destinationIndex, 0, value);
  }

  equals(other: List): boolean {
    if (this.length !== other.length) {
      return false;
    }

    for (let i = 0; i < this.length; i++) {
      if (this.at(i) !== other.at(i)) {
        return false;
      }
    }

    return true;
  }

  get length(): number {
    return this.#values.length;
  }

  at(index: number): string | undefined {
    return this.#values.at(index);
  }

  [Symbol.iterator](): Iterator<string> {
    return this.#values[Symbol.iterator]();
  }

  toString(): string {
    return this.toArray().join(",");
  }

  [Symbol.for("Deno.customInspect")]() {
    return this.toString();
  }

  toArray(): Array<string> {
    return [...this];
  }

  clone(): List {
    return new List(this);
  }
}

for (
  const [input, output, name] of [
    // only re-orderings
    ["abcdefghij", "abcdefghij", "0 unchanged"],
    ["abcdefghij", "jabcdefghi", "1 tail to head"],
    ["abcdefghij", "bcdefghija", "1 head to tail"],
    ["abcdefghij", "edcbafghij", "4 head half reversal"],
    ["abcdefghij", "abcdejihgf", "4 tail half reversal"],
    ["abcdefghij", "jihgfedcba", "9 reversal"],
    // with insertions
    ["abcdefghij", "abcdefghijk", "1 append"],
    ["abcdefghij", "zabcdefghij", "1 unshift"],
    // with removals
    ["abcdefghij", "abcdefghi", "1 pop"],
    ["abcdefghij", "bcdefghij", "1 shift"],
  ].map(
    ([input, output, name]) =>
      [new List(input), new List(output), name] as const,
  )
) {
  console.log(name.padEnd(20), `(from ${input} to ${output})`);
  console.log();
  for (
    const sorter of [
      function clear_and_rebuild(state: List, target: List): void {
        while (state.length > 0) {
          state.remove(0);
        }
        for (const value of target) {
          state.push(value);
        }
      },

      function skip_then_clear_and_rebuild(state: List, target: List) {
        let matched = 0;
        while (matched < state.length) {
          if (state.at(matched) === target.at(matched)) {
            matched += 1;
          } else {
            break;
          }
        }

        while (state.length > matched) {
          state.remove(matched);
        }

        for (let i = matched; i < target.length; i++) {
          state.push(unwrap(target.at(i)));
        }
      },
    ]
  ) {
    const state = input.clone();
    sorter(state, output);
    console.log(
      `  %c${state.modifications.toString().padStart(3).padEnd(4)}`,
      state.modifications == 0
        ? "color: cyan;"
        : state.modifications <= 5
        ? "color: green;"
        : state.modifications <= 10
        ? "color: yellow;"
        : state.modifications <= 15
        ? "color: orange;"
        : "color: red;",
      sorter.name,
    );
    if (!state.equals) {
      console.error(" ", " ", "but the result is wrong!", state);
    }
  }
  console.log();
}
