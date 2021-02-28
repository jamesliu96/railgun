import {
  ServerRequest,
  Response,
} from 'https://deno.land/std@0.88.0/http/mod.ts';
import { parse } from 'https://deno.land/std@0.88.0/node/querystring.ts';

import { Application } from './application.ts';

type Request = ServerRequest;
type QueryString = ReturnType<typeof parse>;

export class Context {
  protected readonly _response: Response = {
    status: 404,
    headers: new Headers(),
  };

  #URL;

  #body: any;
  #flushed = false;

  constructor(
    public readonly app: Application,
    public readonly request: Request
  ) {
    try {
      this.#URL = new URL(`http://${this.get('host')}${this.url}`);
    } catch (e) {}
  }

  // request

  get conn() {
    return this.request.conn;
  }
  get remoteAddr() {
    return this.conn.remoteAddr;
  }
  get localAddr() {
    return this.conn.localAddr;
  }
  get(name: string) {
    return this.request.headers.get(name);
  }
  get method() {
    return this.request.method;
  }
  get proto() {
    return this.request.proto;
  }
  get url() {
    return this.request.url;
  }
  get URL() {
    return this.#URL;
  }
  get href() {
    return this.#URL?.href ?? '';
  }
  get origin() {
    return this.#URL?.origin ?? '';
  }
  get protocol() {
    return this.#URL?.protocol ?? '';
  }
  get username() {
    return this.#URL?.username ?? '';
  }
  get password() {
    return this.#URL?.password ?? '';
  }
  get host() {
    return this.#URL?.host ?? '';
  }
  get hostname() {
    return this.#URL?.hostname ?? '';
  }
  get port() {
    return this.#URL?.port ?? '';
  }
  get pathname() {
    return this.#URL?.pathname ?? '';
  }
  get search() {
    return this.#URL?.search ?? '';
  }
  get querystring() {
    return this.search.slice(1);
  }
  get query(): QueryString {
    return this.querystring ? parse(this.querystring) : {};
  }
  get hash() {
    return this.#URL?.hash ?? '';
  }
  get payload() {
    return this.request.body;
  }

  // response

  set(name: string, value: string) {
    this._response.headers!.set(name, value);
  }
  append(name: string, value: string) {
    this._response.headers!.append(name, value);
  }
  delete(name: string) {
    this._response.headers!.delete(name);
  }
  get status() {
    return this._response.status;
  }
  set status(status) {
    this._response.status = status;
  }
  get body() {
    return this.#body;
  }
  set body(body) {
    if (this.status === 404) this.status = 200;
    this.#body = body;
  }

  private async _flush() {
    if (this.#flushed) return;

    this._response.body = await this.#_body();
    await this.request.respond(this._response);

    this.#flushed = true;
  }
  #_body = async (): Promise<Response['body']> => {
    if (
      typeof this.#body === 'string' ||
      this.#body instanceof Uint8Array ||
      this.#body instanceof Deno.Buffer ||
      this.#body instanceof Deno.File ||
      typeof (this.#body as Deno.Reader).read === 'function'
    ) {
      return this.#body;
    } else if (this.#body instanceof ArrayBuffer) {
      return new Uint8Array(this.#body);
    } else if (typeof this.#body[Symbol.iterator] === 'function') {
      return new Uint8Array(
        [...this.#body].reduce((acc, val) => [...acc, ...val])
      );
    } else if (typeof this.#body[Symbol.asyncIterator] === 'function') {
      const buf = [];
      for await (const b of this.#body) buf.push(b);
      return new Uint8Array(buf.reduce((acc, val) => [...acc, ...val]));
    } else {
      try {
        return JSON.stringify(this.#body);
      } catch (e) {}
    }
  };
}
