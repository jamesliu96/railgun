import {
  ServerRequest,
  Response,
  Status,
  Cookie,
  getCookies,
  setCookie,
  deleteCookie,
} from 'https://deno.land/std@0.88.0/http/mod.ts';
import { parse } from 'https://deno.land/std@0.88.0/node/querystring.ts';

import { Application } from './application.ts';

type Request = ServerRequest;

export class Context {
  protected readonly _response: Response = {
    status: Status.NotFound,
    headers: new Headers(),
  };

  #URL;

  #cookies = getCookies(this.request);

  // deno-lint-ignore no-explicit-any
  #body: any;
  #flushed = false;

  #decoder = new TextDecoder(this.charset);

  constructor(
    public readonly app: Application,
    public readonly request: Request,
    public readonly secure = false
  ) {
    this.#URL = new URL(
      `${secure ? 'https' : 'http'}://${this.get('host')}${this.url}`
    );
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
  get cookies() {
    return this.#cookies ?? {};
  }
  getCookie(name: string) {
    return this.cookies[name];
  }
  get contentType() {
    return this.get('content-type') ?? '';
  }
  get mediaType() {
    return this.contentType.split(';').map((s) => s.trim())[0] ?? '';
  }
  get charset() {
    return (
      this.contentType
        .split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith('charset'))
        ?.split('=')[1]
        ?.trim()
        ?.match(/^"?(.+)"?$/)?.[1] ?? 'utf-8'
    );
  }
  get boundary() {
    return this.contentType
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('boundary'))
      ?.split('=')[1]
      ?.trim()
      ?.match(/^"?(.+)"?$/)?.[1];
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
  get query() {
    return this.querystring ? parse(this.querystring) : {};
  }
  get hash() {
    return this.#URL?.hash ?? '';
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    return (await Deno.readAll(this.request.body)).buffer;
  }
  // deno-lint-ignore require-await
  async formData(): Promise<FormData> {
    // TODO
    return new FormData();
  }
  async blob() {
    return new Blob([await this.arrayBuffer()]);
  }
  async text() {
    return this.#decoder.decode(await this.arrayBuffer());
  }
  async json() {
    return JSON.parse(await this.text());
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
  setCookie(cookie: Cookie) {
    setCookie(this._response, cookie);
  }
  deleteCookie(name: string) {
    deleteCookie(this._response, name);
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
    if (this.status !== Status.OK) this.status = Status.OK;
    this.#body = body;
  }

  private async _respond() {
    if (this.#flushed) return;

    this._response.body = await this.#_body();
    await this.request.respond(this._response);

    this.#flushed = true;
  }
  #_body = async (): Promise<Response['body']> => {
    if (typeof this.#body === 'undefined' || this.#body === null) return;
    if (
      typeof this.#body === 'string' ||
      this.#body instanceof Uint8Array ||
      this.#body instanceof Deno.Buffer ||
      this.#body instanceof Deno.File ||
      ('read' in this.#body &&
        typeof (this.#body as Deno.Reader).read === 'function')
    ) {
      return this.#body;
    } else if (this.#body instanceof ArrayBuffer) {
      return new Uint8Array(this.#body);
    } else if (typeof this.#body === 'function') {
      return await this.#body();
    } else if (
      Symbol.iterator in this.#body &&
      typeof this.#body[Symbol.iterator] === 'function'
    ) {
      return new Uint8Array(
        [...this.#body].reduce((acc, val) => [...acc, ...val])
      );
    } else if (
      Symbol.asyncIterator in this.#body &&
      typeof this.#body[Symbol.asyncIterator] === 'function'
    ) {
      const buf = [];
      for await (const b of this.#body) buf.push(b);
      return new Uint8Array(buf.reduce((acc, val) => [...acc, ...val]));
    } else {
      return JSON.stringify(this.#body);
    }
  };
}
