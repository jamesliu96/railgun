import { Application, Router, STATUS_CODE, STATUS_TEXT } from './mod.ts';

new Application()
  .use(async (ctx, next) => {
    const start = performance.now();
    await next();
    console.log(
      `[${ctx.status}] ${ctx.request.method} ${ctx.URL.pathname} - ${
        performance.now() - start
      }ms`
    );
  })
  .use(
    new Router('/api/v1')
      .post('/echo', async (ctx) => {
        ctx.body = await ctx.request.text();
      })
      .post('/echo.json', async (ctx) => {
        ctx.body = await ctx.request.json();
      })
      .handle()
  )
  .use(
    new Router()
      .get('/meow/(?<catName>.+)', (ctx, { catName = '' }) => {
        ctx.body = `my name is ${decodeURIComponent(catName)}, meow! 🐱`;
      })
      .post('/teapot', (ctx) => {
        ctx.status = STATUS_CODE.Teapot;
      })
      .post('/search', async (ctx) => {
        ctx.body = new URLSearchParams({ search: await ctx.request.text() });
      })
      .post('/form', async (ctx) => {
        const form = new FormData();
        form.set('blob', await ctx.request.blob());
        ctx.body = form;
      })
      .get('/README.md', async (ctx) => {
        ctx.contentType = 'text/markdown';
        ctx.body = await Deno.open(await Deno.realPath('./README.md'));
      })
      .all('/ws', (ctx) => {
        const socket = ctx.upgrade();
        socket.onopen = () => {
          socket.send('Hello World!');
        };
        socket.onmessage = ({ data }) => {
          socket.send(data);
        };
      })
      .all('/', (ctx) => {
        ctx.contentType = 'text/html';
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
  .serve({
    port: 3000,
    onListen: ({ port }) => {
      console.log(`server starts listening at :${port}`);
    },
    onError(error) {
      return new Response(`${error}`, {
        status: STATUS_CODE.InternalServerError,
        statusText: STATUS_TEXT[STATUS_CODE.InternalServerError],
      });
    },
  });
