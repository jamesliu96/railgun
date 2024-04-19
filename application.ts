import { Middleware, reduce } from './middleware.ts';
import { Context } from './context.ts';

export class Application {
  middlewares = new Set<Middleware>();

  use(middleware: Middleware) {
    this.middlewares.add(middleware);
    return this;
  }

  unuse(middleware: Middleware) {
    this.middlewares.delete(middleware);
    return this;
  }

  serve(options: Deno.ServeOptions | Deno.ServeTlsOptions) {
    return Deno.serve(options, this.#handler);
  }

  serveUnix(options: Deno.ServeUnixOptions) {
    return Deno.serve(options, this.#handlerUnix);
  }

  get #handler(): Deno.ServeHandler {
    const reduced = reduce([...this.middlewares]);
    return async (request, info) => {
      const ctx = new Context(request, info);
      await reduced(ctx);
      return ctx.response;
    };
  }

  get #handlerUnix(): Deno.ServeUnixHandler {
    const reduced = reduce([...this.middlewares]);
    return async (request, info) => {
      const ctx = new Context(request, info);
      await reduced(ctx);
      return ctx.response;
    };
  }
}
