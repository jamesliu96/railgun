import { STATUS_CODE, STATUS_TEXT } from './deps.ts';

import { Middleware, ReducedMiddleware, reduce } from './middleware.ts';
import { Context } from './context.ts';

type Handlers = {
  onListen?: (listener: Deno.Listener) => void;
  onListenError?: (err: Error) => void;
  onServe?: (conn: Deno.Conn) => void;
  onServeError?: (err: Error) => void;
  onRespond?: (requestEvent: Deno.RequestEvent) => void;
  onRespondError?: (err: Error) => void;
};

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

  listen(options: Deno.ListenOptions, handlers?: Handlers) {
    return this.#listen(Deno.listen(options), handlers);
  }

  listenTls(
    options: Deno.ListenTlsOptions & Deno.TlsCertifiedKeyOptions,
    handlers?: Handlers
  ) {
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
      // deno-lint-ignore no-deprecated-deno-api
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
      await requestEvent.respondWith(ctx.response);
    } catch (err) {
      handlers?.onRespondError?.(err);
      requestEvent.respondWith(
        new Response(null, {
          status: STATUS_CODE.InternalServerError,
          statusText: STATUS_TEXT[STATUS_CODE.InternalServerError],
        })
      );
    }
  }
}
