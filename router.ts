import { Middleware } from './application.ts';
import { Context } from './context.ts';
import { reduce } from './reduce.ts';

type Match = {
  $: string[];
} & {
  [key: string]: string;
};
type Handler = (ctx: Context, match: Match) => Promise<void> | void;

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

  route(method: string, path: string | RegExp, handler: Handler) {
    this.#middlewares.push(this.#generate(method, path, handler));
    return this;
  }
  #generate = (
    method: string,
    path: string | RegExp,
    handler: Handler
  ): Middleware => async (ctx, next) => {
    await next();

    if (method.toUpperCase() === ctx.method.toUpperCase()) {
      const match = this.#match(path, ctx.pathname);
      if (match) await handler(ctx, match);
    }
  };

  routes = (): Middleware => async (ctx) => {
    await reduce(this.#middlewares)(ctx);
  };

  #match = (re: string | RegExp, str: string) => {
    const match = str.match(re);
    if (!match) return;

    const { groups = {} } = match;
    return { $: match.slice(1), ...groups } as Match;
  };
}
