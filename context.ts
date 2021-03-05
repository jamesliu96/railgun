import {
  ServerRequest,
  Response,
  Status,
  Cookie,
  getCookies,
  setCookie,
  deleteCookie,
  MultipartReader,
} from './deps.ts';

import { Application } from './application.ts';

export const CONTENT_TYPE = 'content-type';

export enum MediaType {
  Text = 'text/plain',
  HTML = 'text/html',
  JSON = 'application/json',
  FormUrlencoded = 'application/x-www-form-urlencoded',
  MultipartFormData = 'multipart/form-data',
  OctetStream = 'application/octet-stream',
}

export const CHARSET_UTF8 = 'charset=utf-8';

export enum Method {
  ALL = '*',
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export class Context {
  readonly response: Response = {
    status: Status.NotFound,
    headers: new Headers(),
  };

  #URL;

  #cookies = getCookies(this.request);

  // deno-lint-ignore no-explicit-any
  #body: any;

  #decoder = new TextDecoder(this.charset);

  #bufferRead = false;
  #cachedBuffer?: ArrayBuffer;

  constructor(
    readonly app: Application,
    readonly request: ServerRequest,
    readonly secure = false
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
    return this.get(CONTENT_TYPE) ?? '';
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
  get protoMajor() {
    return this.request.protoMajor;
  }
  get protoMinor() {
    return this.request.protoMinor;
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
  get query() {
    return new URLSearchParams(this.search);
  }
  get querystring() {
    return this.query.toString();
  }
  get hash() {
    return this.#URL?.hash ?? '';
  }
  get buffer() {
    return this.request.body;
  }
  async arrayBuffer() {
    if (this.#cachedBuffer) return this.#cachedBuffer;
    if (this.#bufferRead) throw new Error('buffer read but not cached');
    this.#cachedBuffer = (await Deno.readAll(this.buffer)).buffer;
    this.#bufferRead = true;
    return this.#cachedBuffer;
  }
  async text() {
    return this.#decoder.decode(await this.arrayBuffer());
  }
  async json() {
    return JSON.parse(await this.text());
  }
  async form() {
    return new URLSearchParams(await this.text());
  }
  async formData() {
    if (!this.boundary) throw new Error('missing boundary');
    if (this.#cachedBuffer)
      return await new MultipartReader(
        new Deno.Buffer(this.#cachedBuffer),
        this.boundary
      ).readForm();
    if (this.#bufferRead) throw new Error('buffer read but not cached');
    return await new MultipartReader(this.buffer, this.boundary).readForm();
  }

  // response

  set(name: string, value: string) {
    this.response.headers?.set(name, value);
  }
  append(name: string, value: string) {
    this.response.headers?.append(name, value);
  }
  delete(name: string) {
    this.response.headers?.delete(name);
  }
  setCookie(cookie: Cookie) {
    setCookie(this.response, cookie);
  }
  deleteCookie(name: string) {
    deleteCookie(this.response, name);
  }
  get status() {
    return this.response.status;
  }
  set status(status) {
    this.response.status = status;
  }
  get body() {
    return this.#body;
  }
  set body(body) {
    if (this.status !== Status.OK) this.status = Status.OK;
    this.#body = body;
  }

  async respond() {
    const { type, body } = await this.#respond();
    if (!this.response.headers?.get(CONTENT_TYPE) && type) {
      this.set(CONTENT_TYPE, type);
    }
    this.response.body = body;
    await this.request.respond(this.response);
  }
  #respond = async () => {
    let type: string | undefined;
    let body: Response['body'];
    const b = await this.#body;
    if (typeof b === 'string') {
      type = `${MediaType.Text}; ${CHARSET_UTF8}`;
      body = b;
    } else if (
      typeof b === 'undefined' ||
      b instanceof Uint8Array ||
      b instanceof Deno.Buffer ||
      b instanceof Deno.File ||
      ('read' in b && typeof (b as Deno.Reader).read === 'function')
    ) {
      body = b;
    } else if (b instanceof ArrayBuffer) {
      body = new Uint8Array(b);
    } else if (b instanceof URLSearchParams) {
      type = `${MediaType.FormUrlencoded}; ${CHARSET_UTF8}`;
      body = b.toString();
    } else {
      type = `${MediaType.JSON}; ${CHARSET_UTF8}`;
      body = JSON.stringify(b);
    }
    return { type, body };
  };
}
