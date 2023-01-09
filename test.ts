import { Application, Router, Status, MediaType, CONTENT_TYPE } from './mod.ts';

await new Application()
  .use(async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${ctx.request.method} ${ctx.URL} - ${Date.now() - start}ms`);
  })
  .use(
    new Router({ prefix: '/api/v1' })
      .post('/echo_text', async (ctx) => {
        const form = new FormData();
        const text = await ctx.request.text();
        form.set('text', text);
        ctx.body = form;
      })
      .handle()
  )
  .use(
    new Router()
      .get('/meow/(?<catName>.+)', (ctx, { catName }) => {
        ctx.body = `my name is ${decodeURIComponent(catName)}, meow! 🐱`;
      })
      .post('/teapot', (ctx) => {
        ctx.status = Status.Teapot;
      })
      .get('/yeah', async (ctx) => {
        const text = await ctx.request.text();
        ctx.body = new URLSearchParams({ yeah: text });
      })
      .all('/', (ctx) => {
        ctx.headers.set(CONTENT_TYPE, MediaType.HTML);
        ctx.body = `<html>
<head>
  <title>hello</title>
</head>
<body>
  <div>hello!</div>
</body>
</html>
`;
      })
      .handle()
  )
  .listen(
    { port: 3000 },
    {
      onListen: (listener) => {
        console.log(
          `server starts listening at :${(listener.addr as Deno.NetAddr).port}`
        );
      },
    }
  );
