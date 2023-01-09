import { Status, STATUS_TEXT } from './deps.ts';

import { Context } from './context.ts';
import { reduce } from './reduce.ts';

export type Empty = Promise<void> | void;
export type Next = () => Empty;
export type Middleware = (ctx: Context, next: Next) => Empty;

export type Handlers = {
  onListen?: (listener: Deno.Listener) => Empty;

  onFulfilled?: () => Empty;
  onRejected?: (err: Error) => Empty;
  onFinally?: () => Empty;
};

export class Application {
  middlewares = new Set<Middleware>();

  use(middleware: Middleware) {
    this.middlewares.add(middleware);
    return this;
  }

  async listen(options: Deno.ListenOptions, handlers?: Handlers) {
    const listener = Deno.listen(options);
    handlers?.onListen?.(listener);
    for await (const conn of listener) await this.#serve(conn, handlers);
  }

  async listenTls(options: Deno.ListenTlsOptions, handlers?: Handlers) {
    const listener = Deno.listenTls(options);
    handlers?.onListen?.(listener);
    for await (const conn of listener) await this.#serve(conn, handlers);
  }

  #serve = async (conn: Deno.Conn, handlers?: Handlers) => {
    for await (const requestEvent of Deno.serveHttp(conn))
      this.#handle(requestEvent)
        .then(handlers?.onFulfilled)
        .catch(handlers?.onRejected ?? console.error)
        .finally(handlers?.onFinally);
  };
  #handle = async (requestEvent: Deno.RequestEvent) => {
    try {
      const ctx = new Context(requestEvent.request);
      await reduce([...this.middlewares])(ctx);
      await requestEvent.respondWith(ctx.response);
    } catch (err) {
      await requestEvent.respondWith(
        new Response(null, {
          status: Status.InternalServerError,
          statusText: STATUS_TEXT[Status.InternalServerError],
        })
      );
      throw err;
    }
  };
}
