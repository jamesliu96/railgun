import { Status, STATUS_TEXT } from './deps.ts';

import { Empty, Middleware, ReducedMiddleware, reduce } from './middleware.ts';
import { Context } from './context.ts';

type Handlers = {
  onListen?: (listener: Deno.Listener) => Empty;
  onListenError?: (err: Error) => Empty;
  onServe?: (conn: Deno.Conn) => Empty;
  onServeError?: (err: Error) => Empty;
  onRespond?: (requestEvent: Deno.RequestEvent) => Empty;
  onRespondError?: (err: Error) => Empty;
};

export class Application {
  middlewares = new Set<Middleware>();

  use(middleware: Middleware) {
    this.middlewares.add(middleware);
    return this;
  }

  listen(options: Deno.ListenOptions, handlers?: Handlers) {
    return this.#listen(Deno.listen(options), handlers);
  }

  listenTls(options: Deno.ListenTlsOptions, handlers?: Handlers) {
    return this.#listen(Deno.listenTls(options), handlers);
  }

  async #listen(listener: Deno.Listener, handlers?: Handlers) {
    try {
      handlers?.onListen?.(listener);
      for await (const conn of listener)
        this.#serve(conn, reduce([...this.middlewares]), handlers);
    } catch (err) {
      handlers?.onListenError?.(err);
    }
  }

  async #serve(
    conn: Deno.Conn,
    reduced: ReducedMiddleware,
    handlers?: Handlers
  ) {
    try {
      handlers?.onServe?.(conn);
      for await (const requestEvent of Deno.serveHttp(conn))
        this.#respond(requestEvent, reduced, handlers);
    } catch (err) {
      handlers?.onServeError?.(err);
    }
  }

  async #respond(
    requestEvent: Deno.RequestEvent,
    reduced: ReducedMiddleware,
    handlers?: Handlers
  ) {
    try {
      handlers?.onRespond?.(requestEvent);
      const ctx = new Context(requestEvent.request);
      await reduced(ctx);
      await requestEvent.respondWith(await ctx._response());
    } catch (err) {
      handlers?.onRespondError?.(err);
      await requestEvent.respondWith(
        new Response(null, {
          status: Status.InternalServerError,
          statusText: STATUS_TEXT[Status.InternalServerError],
        })
      );
    }
  }
}
