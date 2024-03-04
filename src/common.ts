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

/** Returns a value or throws a TypeError if it's null or undefined. */
export const unwrap = <T>(value: T | undefined | null, message?: string): T => {
  if (value !== undefined && value !== null) {
    return value;
  } else {
    throw new TypeError(message ?? `attempted to unwrapping missing value`);
  }
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
