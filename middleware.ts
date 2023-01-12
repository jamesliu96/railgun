import { Context } from './context.ts';

type Next = () => Promise<void>;
export type Middleware = (ctx: Context, next: Next) => Promise<void> | void;
export type ReducedMiddleware = (ctx: Context, next?: Next) => Promise<void>;

export const reduce =
  (middlewares: Middleware[]): ReducedMiddleware =>
  (ctx, next) => {
    let idx = -1;
    const dispatch = async (i: number) => {
      if (i <= idx) throw new Error('next() called multiple times');
      idx = i;
      await (i === middlewares.length ? next : middlewares[i])?.(
        ctx,
        dispatch.bind(null, i + 1)
      );
    };
    return dispatch(0);
  };
