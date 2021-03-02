import { Status } from 'https://deno.land/std@0.88.0/http/mod.ts';

import { Middleware, Empty } from './application.ts';
import { Context } from './context.ts';
import { reduce } from './reduce.ts';

type Match = Record<string, string> & {
  $: string[];
};
type Handler = (ctx: Context, match: Match) => Empty;

export enum Method {
  ALL = '*',
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export class Router {
  #middlewares: Middleware[] = [];
  #allowedMiddlewares: Middleware[] = [];

  constructor(readonly opts = { prefix: '' }) {}

  all(path: string, handler: Handler) {
    return this.route(Method.ALL, path, handler);
  }
  get(path: string, handler: Handler) {
    return this.route(Method.GET, path, handler);
  }
  post(path: string, handler: Handler) {
    return this.route(Method.POST, path, handler);
  }
  head(path: string, handler: Handler) {
    return this.route(Method.HEAD, path, handler);
  }
  options(path: string, handler: Handler) {
    return this.route(Method.OPTIONS, path, handler);
  }
  put(path: string, handler: Handler) {
    return this.route(Method.PUT, path, handler);
  }
  patch(path: string, handler: Handler) {
    return this.route(Method.PATCH, path, handler);
  }
  delete(path: string, handler: Handler) {
    return this.route(Method.DELETE, path, handler);
  }

  route(method: string, path: string, handler: Handler) {
    this.#middlewares.push(this.#generate(method, path, handler));
    this.#allowedMiddlewares.push(
      this.#generate(Method.OPTIONS, path, this.#allowedHandler(method))
    );
    return this;
  }
  #generate = (
    method: string,
    path: string,
    handler: Handler
  ): Middleware => async (ctx, next) => {
    if (
      method === Method.ALL ||
      ctx.method.toUpperCase() === method.toUpperCase()
    ) {
      const match = this.#match(path, ctx.pathname);
      if (match) {
        await handler(ctx, match);
        return;
      }
    }
    await next();
  };
  #match = (re: string, str: string) => {
    const match = str.match(this.opts.prefix + re);
    if (!match) return;
    const { groups = {} } = match;
    return { ...groups, $: match.slice(1) } as Match;
  };
  #allowedHandler = (method: string): Handler => (ctx) => {
    ctx.status = Status.OK;
    ctx.set(
      'allowed',
      method === Method.ALL
        ? '*'
        : [
            ...new Set(
              ctx.response.headers
                ?.get('allowed')
                ?.split(',')
                .map((s) => s.trim())
            ).add(method),
          ].join(', ')
    );
  };

  routes(): Middleware {
    return async (ctx, next) => {
      await next();
      await reduce(this.#middlewares)(ctx);
    };
  }

  allowedMethods(): Middleware {
    return async (ctx, next) => {
      await next();
      await reduce(this.#allowedMiddlewares)(ctx);
    };
  }
}
