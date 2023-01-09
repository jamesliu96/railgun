import { Empty, Next, Middleware } from './application.ts';
import { Context } from './context.ts';

export type ReducedMiddleware = (ctx: Context, next?: Next) => Empty;

export const reduce =
  (middlewares: Middleware[]): ReducedMiddleware =>
  (ctx, next) => {
    let idx = -1;
    const dispatch = async (i: number) => {
      if (i <= idx) throw new Error('next() called multiple times');
      idx = i;
      const fn = i === middlewares.length ? next : middlewares[i];
      await fn?.(ctx, dispatch.bind(null, i + 1));
    };
    return dispatch(0);
  };
