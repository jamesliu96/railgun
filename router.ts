import { Middleware, reduce } from './middleware.ts';
import { Context } from './context.ts';

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

export type RouteMatch = Record<string, string | undefined> & {
  $: string[];
};
export type RouteHandler = (
  ctx: Context,
  match: RouteMatch
) => Promise<void> | void;

export class Router {
  routes = new Map<string, Middleware>();

  constructor(readonly prefix = '') {}

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
    method = method.toUpperCase();
    const pathname = `${this.prefix}${path}`;
    this.routes.set(`${method} ${pathname}`, async (ctx, next) => {
      if (
        method === Method.ALL ||
        method === ctx.request.method.toUpperCase()
      ) {
        const match = ctx.URL.pathname.match(`^${pathname}$`);
        if (match)
          return await handler(ctx, {
            ...match.groups,
            $: match.slice(1),
          } as RouteMatch);
      }
      await next();
    });
    return this;
  }

  unroute(method: string, path: string) {
    method = method.toUpperCase();
    const pathname = `${this.prefix}${path}`;
    this.routes.delete(`${method} ${pathname}`);
    return this;
  }

  handle(): Middleware {
    const reduced = reduce([...this.routes.values()]);
    return async (ctx, next) => {
      await next();
      await reduced(ctx);
    };
  }
}
