import { Status, STATUS_TEXT } from './deps.ts';

import { Empty, Middleware, reduce } from './middleware.ts';
import { Context } from './context.ts';

type Handlers = {
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
    await handlers?.onListen?.(listener);
    await this.#serve(listener, handlers);
  }

  async listenTls(options: Deno.ListenTlsOptions, handlers?: Handlers) {
    const listener = Deno.listenTls(options);
    await handlers?.onListen?.(listener);
    await this.#serve(listener, handlers);
  }

  async #serve(listener: Deno.Listener, handlers?: Handlers) {
    try {
      for await (const conn of listener)
        try {
          for await (const requestEvent of Deno.serveHttp(conn))
            this.#handle(requestEvent)
              .then(handlers?.onFulfilled)
              .catch(handlers?.onRejected ?? console.error)
              .finally(handlers?.onFinally);
        } catch (err) {
          console.error(err);
        }
    } catch (err) {
      console.error(err);
    }
  }
  async #handle(requestEvent: Deno.RequestEvent) {
    try {
      const ctx = new Context(requestEvent.request);
      await reduce([...this.middlewares])(ctx);
      await requestEvent.respondWith(await ctx._respond());
    } catch (err) {
      await requestEvent.respondWith(
        new Response(null, {
          status: Status.InternalServerError,
          statusText: STATUS_TEXT[Status.InternalServerError],
        })
      );
      throw err;
    }
  }
}
