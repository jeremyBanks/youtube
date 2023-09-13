// deno-lint-ignore-file no-unused-vars
import { App } from "../app.ts";
const app = new App();

const src = Deno.args
  .map((src) => {
    if (/^[A-Za-z_$][A-Za-z_$0-9]*$/.test(src)) {
      return `app.${src}();`;
    } else if (/^\.[A-Za-z_$]/.test(src)) {
      return `app${src}`;
    } else {
      return src;
    }
  })
  .join(" ");

console.log(`%c> %c${src}`, "color: grey", "color: default");

try {
  const result = await eval(src);

  if (result !== undefined) {
    console.log("%c=", "color: green", result);
  }
  Deno.exit(0);
} catch (error) {
  console.log("%c!", "color: red", error);
  Deno.exit(1);
}
