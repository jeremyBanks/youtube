import { JsonValue } from "https://deno.land/std@0.198.0/json/mod.ts";

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

export { raise as throw };

/** Wait the specified number of miliseconds. */
export const miliseconds = (miliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, miliseconds));

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
