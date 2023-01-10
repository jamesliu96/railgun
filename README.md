# railgun

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/railgun/mod.ts)

deno web server framework

available features:

- middlewares
- context
- router

## usage

```ts
import { Application, Router } from 'https://deno.land/x/railgun/mod.ts';

const app = new Application();

app
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
        ctx.body = await ctx.request.blob();
      })
      .handle()
  );

await app.listen({ port: 3000 });
```

## example

`server.ts`

```ts
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
      .get('/meow/(?<catName>.+)', (ctx, { catName }) => {
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
        const { socket, response } = Deno.upgradeWebSocket(ctx.request);
        socket.onopen = () => {
          socket.send('Hello World!');
        };
        socket.onmessage = (e) => {
          console.log(e.data);
          socket.close();
        };
        socket.onclose = () => console.log('WebSocket has been closed.');
        socket.onerror = (e) => console.error('WebSocket error:', e);
        ctx.response = response;
      })
      .all('/', (ctx) => {
        console.warn('in');
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
```

```sh
$ deno run --allow-net --allow-read --allow-hrtime server.ts
server starts listening at :3000
```
