import {
  Server,
  HTTPOptions,
  HTTPSOptions,
  ServerRequest,
  Status,
} from './deps.ts';

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
    for await (const req of server) this.#handleRequest(req, true);
    server.close();
  }

  #handleRequest = async (req: ServerRequest, secure?: boolean) => {
    try {
      const ctx = new Context(this, req, secure);
      await reduce(this.#middlewares)(ctx);
      await ctx.respond();
    } catch (e) {
      console.error(e);
      try {
        await req.respond({
          status: Status.InternalServerError,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };
}
