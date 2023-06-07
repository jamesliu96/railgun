import { Application, Router, Status } from './mod.ts';

await new Application()
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
        ctx.status = Status.Teapot;
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
