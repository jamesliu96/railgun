import { Empty, Middleware, reduce } from './middleware.ts';
import { Context } from './context.ts';

enum Method {
  ALL = '*',
  GET = 'GET',
  POST = 'POST',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  PUT = 'PUT',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

type RouteMatch = Record<string, string> & {
  $: string[];
};
type RouteHandler = (ctx: Context, match: RouteMatch) => Empty;

export class Router {
  static Method = Method;

  routes = new Map<string, Middleware>();

  constructor(readonly prefix = '') {}

  all(path: string, handler: RouteHandler) {
    return this.route(Router.Method.ALL, path, handler);
  }
  get(path: string, handler: RouteHandler) {
    return this.route(Router.Method.GET, path, handler);
  }
  post(path: string, handler: RouteHandler) {
    return this.route(Router.Method.POST, path, handler);
  }
  delete(path: string, handler: RouteHandler) {
    return this.route(Router.Method.DELETE, path, handler);
  }
  patch(path: string, handler: RouteHandler) {
    return this.route(Router.Method.PATCH, path, handler);
  }
  put(path: string, handler: RouteHandler) {
    return this.route(Router.Method.PUT, path, handler);
  }
  options(path: string, handler: RouteHandler) {
    return this.route(Router.Method.OPTIONS, path, handler);
  }
  head(path: string, handler: RouteHandler) {
    return this.route(Router.Method.HEAD, path, handler);
  }

  route(method: string, path: string, handler: RouteHandler) {
    const pathname = `${this.prefix}${path}`;
    this.routes.set(
      `${method} ${pathname}`,
      this.#route(method, pathname, handler)
    );
    return this;
  }
  #route(method: string, pathname: string, handler: RouteHandler): Middleware {
    return async (ctx, next) => {
      if (
        method === Method.ALL ||
        ctx.request.method.toUpperCase() === method.toUpperCase()
      ) {
        const match = ctx.URL.pathname.match(`^${pathname}$`);
        if (match)
          return await handler(ctx, {
            ...match.groups,
            $: match.slice(1),
          } as RouteMatch);
      }
      await next();
    };
  }

  handle(): Middleware {
    return async (ctx, next) => {
      await next();
      await reduce([...this.routes.values()])(ctx);
    };
  }
}
