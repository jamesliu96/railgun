import { Empty, Middleware } from './application.ts';
import { Context } from './context.ts';
import { reduce } from './reduce.ts';

export enum Method {
  ALL = '*',
  GET = 'GET',
  POST = 'POST',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  PUT = 'PUT',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export type RouteMatch = Record<string, string> & {
  $: string[];
};
export type RouteHandler = (ctx: Context, match: RouteMatch) => Empty;

export class Router {
  routes = new Map<string, Middleware>();

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
  delete(path: string, handler: RouteHandler) {
    return this.route(Method.DELETE, path, handler);
  }
  patch(path: string, handler: RouteHandler) {
    return this.route(Method.PATCH, path, handler);
  }
  put(path: string, handler: RouteHandler) {
    return this.route(Method.PUT, path, handler);
  }
  options(path: string, handler: RouteHandler) {
    return this.route(Method.OPTIONS, path, handler);
  }
  head(path: string, handler: RouteHandler) {
    return this.route(Method.HEAD, path, handler);
  }

  route(method: string, path: string, handler: RouteHandler) {
    this.routes.set(`${method} ${path}`, this.#route(method, path, handler));
    return this;
  }
  #route =
    (method: string, path: string, handler: RouteHandler): Middleware =>
    async (ctx, next) => {
      if (
        method === Method.ALL ||
        ctx.request.method.toUpperCase() === method.toUpperCase()
      ) {
        const match = this.#match(path, ctx.URL.pathname);
        if (match) return await handler(ctx, match);
      }
      await next();
    };
  #match = (re: string, str: string) => {
    const match = str.match(this.opts.prefix + re);
    if (!match) return;
    const { groups = {} } = match;
    return { ...groups, $: match.slice(1) } as RouteMatch;
  };

  handle(): Middleware {
    return async (ctx, next) => {
      await next();
      await reduce([...this.routes.values()])(ctx);
    };
  }
}
