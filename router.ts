import { Middleware, Empty } from './application.ts';
import { Context } from './context.ts';
import { reduce } from './reduce.ts';

type Match = Record<string, string> & {
  $: string[];
};
type Handler = (ctx: Context, match: Match) => Empty;

export class Router {
  #middlewares: Middleware[] = [];

  get(path: string | RegExp, handler: Handler) {
    return this.route('GET', path, handler);
  }
  post(path: string | RegExp, handler: Handler) {
    return this.route('POST', path, handler);
  }
  head(path: string | RegExp, handler: Handler) {
    return this.route('HEAD', path, handler);
  }
  options(path: string | RegExp, handler: Handler) {
    return this.route('OPTIONS', path, handler);
  }
  put(path: string | RegExp, handler: Handler) {
    return this.route('PUT', path, handler);
  }
  patch(path: string | RegExp, handler: Handler) {
    return this.route('PATCH', path, handler);
  }
  delete(path: string | RegExp, handler: Handler) {
    return this.route('DELETE', path, handler);
  }
  all(path: string | RegExp, handler: Handler) {
    return this.route('*', path, handler);
  }

  route(method: string, path: string | RegExp, handler: Handler) {
    this.#middlewares.push(this.#generate(method, path, handler));
    return this;
  }
  #generate = (
    method: string,
    path: string | RegExp,
    handler: Handler
  ): Middleware => async (ctx, next) => {
    if (method.toUpperCase() === ctx.method.toUpperCase() || method === '*') {
      const match = this.#match(path, ctx.pathname);
      if (match) {
        await handler(ctx, match);
        return;
      }
    }
    await next();
  };
  #match = (re: string | RegExp, str: string) => {
    const match = str.match(re);
    if (!match) return;
    const { groups = {} } = match;
    return { $: match.slice(1), ...groups } as Match;
  };

  routes(): Middleware {
    return async (ctx, next) => {
      await next();
      await reduce(this.#middlewares)(ctx);
    };
  }
}
