import { Middleware, Empty, Next } from './application.ts';
import { Context } from './context.ts';

export type ReducedMiddleware = (ctx: Context, next?: Next) => Empty;

export const reduce = (middlewares: Middleware[]): ReducedMiddleware => (
  context,
  next
) => {
  let idx = -1;
  const dispatch = async (i: number): Promise<void> => {
    if (i <= idx) throw new Error('next() called multiple times');
    idx = i;
    const fn = i === middlewares.length ? next : middlewares[i];
    if (!fn) return;
    try {
      await fn(context, dispatch.bind(null, i + 1));
    } catch (e) {
      throw e;
    }
  };
  return dispatch(0);
};
