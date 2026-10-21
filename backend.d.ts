// backend/ is copied into node_modules/orgtik-wm-backend by tools/link-backend.cjs.
declare module "orgtik-wm-backend" {
  /** The loopback origin of the in-process mock API, e.g. http://127.0.0.1:53121/. */
  export function backendOrigin(): Promise<string>;
}
