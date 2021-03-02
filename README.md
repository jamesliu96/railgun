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
import { Application, Router, Status, MediaType, CONTENT_TYPE } from './mod.ts';

const app = new Application();
const router = new Router();

await app
  .use(async (ctx, next) => {
    const start = Date.now();
    await next();
    console.log(`${ctx.method} ${ctx.url} - ${Date.now() - start}ms`);
  })
  .use(
    router
      .get('/', (ctx) => {
        ctx.set(CONTENT_TYPE, MediaType.HTML);
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
      .post('/teapot', (ctx) => {
        ctx.status = Status.Teapot;
      })
      .routes()
  )
  .listen({ port: 3000 }, () => {
    console.log(`starts listening :3000`);
  });
```
