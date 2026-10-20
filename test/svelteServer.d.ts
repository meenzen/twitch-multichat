// `<path>.svelte?server`: the component compiled for svelte/server, see
// sveltePlugin.ts
declare module "*.svelte?server" {
  import type { Component } from "svelte";
  const component: Component<Record<string, unknown>>;
  export default component;
}
