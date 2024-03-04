import { JsonValue } from "@std/json";
import { Spinner } from "@std/cli";

/** Wrapper around the `throw` statement for use in an expression context. */
export const raise = (
  error: Error | JsonValue,
  ...rest: Array<JsonValue>
): never => {
  if (error instanceof Error) {
    throw error;
  }
  let message;
  if (typeof error === "string") {
    message = error;
  } else {
    message = JSON.stringify(error, null, 2);
  }
  if (rest.length > 0) {
    message = [
      message,
      ...rest.map((o) =>
        typeof o == "string" ? o : JSON.stringify(o, null, 2)
      ),
    ].join(" ");
  }
  throw new Error(message);
};

/** Wraps an async function to display a spinner until it completes. */
export const spinning = async <T>(
  message: string,
  f: () => Promise<T>
): Promise<T> => {
  const spinner = new Spinner({ message });
  spinner.start();
  const x = await f();
  spinner.stop();
  return x;
};

/** Returns a value or throws a TypeError if it's null or undefined. */
export const unwrap = <T>(value: T | undefined | null, message?: string): T => {
  if (value !== undefined && value !== null) {
    return value;
  } else {
    throw new TypeError(
      message ?? `attempted to unwrap missing value ({$value})`
    );
  }
};

/** Returns a value or throws a TypeError if it's falsey. */
export const truthy = <T>(value: T | undefined | null, message?: string): T => {
  if (value) {
    return value;
  } else {
    throw new TypeError(
      message ?? `attempted to unwrap falsey value (${value})`
    );
  }
};

/** Returns the first value of an iterable or throws a TypeError if it's empty. */
export const first = <T>(value: Iterable<T>, message?: string): T => {
  for (const first of value) {
    return first;
  }
  throw new TypeError(
    message ?? `attempted to get first value from an empty iterator`
  );
};

/**
 * Dynamic async function constructor.
 *
 * This defined in the standard, but not directly available in any standard scope.
 *
 * @see https://tc39.es/ecma262/#sec-async-function-constructor
 */
export const AsyncFunction = async function () {}
  .constructor as FunctionConstructor;

/**
 * Dynamic generator function constructor.
 *
 * This defined in the standard, but not directly available in any standard scope.
 *
 * @see https://tc39.es/ecma262/#sec-generatorfunction-constructor
 */
export const GeneratorFunction = function* () {}
  .constructor as GeneratorFunctionConstructor;

/**
 * Dynamic async generator function constructor.
 *
 * This defined in the standard, but not directly available in any standard scope.
 *
 * @see https://tc39.es/ecma262/#sec-asyncgeneratorfunction-constructor
 */
export const AsyncGeneratorFunction = async function* () {}
  .constructor as AsyncGeneratorFunctionConstructor;
