// Required for TypeScript 6+ — allows side-effect CSS imports (e.g. import './globals.css')
declare module "*.css" {}

declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
