import { Middleware, Empty } from './application.ts';
import { Context, Method } from './context.ts';
import { reduce } from './reduce.ts';

export type RouteMatch = Record<string, string> & {
  $: string[];
};
export type RouteHandler = (ctx: Context, match: RouteMatch) => Empty;

export class Router {
  #middlewares: Middleware[] = [];

  constructor(readonly opts = { prefix: '' }) {}

  all(path: string, handler: RouteHandler) {
    return this.route(Method.ALL, path, handler);
  }
  get(path: string, handler: RouteHandler) {
    return this.route(Method.GET, path, handler);
  }
  post(path: string, handler: RouteHandler) {
    return this.route(Method.POST, path, handler);
  }
  head(path: string, handler: RouteHandler) {
    return this.route(Method.HEAD, path, handler);
  }
  options(path: string, handler: RouteHandler) {
    return this.route(Method.OPTIONS, path, handler);
  }
  put(path: string, handler: RouteHandler) {
    return this.route(Method.PUT, path, handler);
  }
  patch(path: string, handler: RouteHandler) {
    return this.route(Method.PATCH, path, handler);
  }
  delete(path: string, handler: RouteHandler) {
    return this.route(Method.DELETE, path, handler);
  }

  route(method: string, path: string, handler: RouteHandler) {
    this.#middlewares.push(this.#generate(method, path, handler));
    return this;
  }
  #generate = (
    method: string,
    path: string,
    matchHander: RouteHandler
  ): Middleware => async (ctx, next) => {
    if (
      method === Method.ALL ||
      ctx.method.toUpperCase() === method.toUpperCase()
    ) {
      const match = this.#match(path, ctx.pathname);
      if (match) {
        await matchHander(ctx, match);
        return;
      }
    }
    await next();
  };
  #match = (re: string, str: string) => {
    const match = str.match(this.opts.prefix + re);
    if (!match) return;
    const { groups = {} } = match;
    return { ...groups, $: match.slice(1) } as RouteMatch;
  };

  routes(): Middleware {
    return async (ctx, next) => {
      await next();
      await reduce(this.#middlewares)(ctx);
    };
  }
}
