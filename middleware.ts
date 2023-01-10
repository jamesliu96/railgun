import { Context } from './context.ts';

export type Empty = Promise<void> | void;
export type Middleware = (ctx: Context, next: () => Empty) => Empty;

export const reduce =
  (middlewares: Middleware[]): ((ctx: Context, next?: () => Empty) => Empty) =>
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
