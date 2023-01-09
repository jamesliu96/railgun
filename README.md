# railgun

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/railgun/mod.ts)

deno web server framework

available features:

- middlewares
- context
- router

## usage

```ts
import { Application } from 'https://deno.land/x/railgun/mod.ts';

const app = new Application();

await app.listen({ port: 3000 });
```

## example

```ts
import {
  Application,
  Router,
  Status,
  MediaType,
  CONTENT_TYPE,
} from 'https://deno.land/x/railgun/mod.ts';

await new Application()
  .use(async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${ctx.request.method} ${ctx.URL} - ${Date.now() - start}ms`);
  })
  .use(
    new Router('/api/v1')
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
```
