import {
  Server,
  ServerRequest,
  HTTPOptions,
  HTTPSOptions,
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
    await handler?.(server);
    for await (const req of server) this.#handleRequest(req);
    server.close();
  }

  async listenTLS(options: HTTPSOptions, handler?: (server: Server) => Empty) {
    const server = new Server(Deno.listenTls(options));
    await handler?.(server);
    for await (const req of server) this.#handleRequest(req);
    server.close();
  }

  #handleRequest = async (req: ServerRequest, secure?: boolean) => {
    try {
      const ctx = new Context(this, req, secure);
      await reduce(this.#middlewares)(ctx);
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      await ctx._respond();
    } catch (e) {
      console.error(e);
      await req.respond({
        status: 500,
      });
    }
  };
}
