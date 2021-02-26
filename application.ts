import {
  Server,
  ServerRequest,
  HTTPOptions,
} from 'https://deno.land/std@0.88.0/http/mod.ts';

import { Context } from './context.ts';
import { reduce } from './reduce.ts';

export type Empty = Promise<void> | void;
export type Next = () => Empty;
export type Middleware = (ctx: Context, next: Next) => Empty;

export class Application {
  #middlewares: Middleware[] = [];

  use(middleware: Middleware) {
    this.#middlewares.push(middleware);
    return this;
  }

  async listen(options: HTTPOptions, handler?: (server: Server) => Empty) {
    const server = new Server(Deno.listen(options));

    try {
      await handler?.(server);
    } catch (e) {}

    for await (const req of server) {
      this.#handleRequest(req);
    }

    server.close();
  }

  #handleRequest = async (req: ServerRequest) => {
    const ctx = new Context(this, req);

    await reduce(this.#middlewares)(ctx);

    // @ts-ignore
    await ctx._flush();
  };
}
