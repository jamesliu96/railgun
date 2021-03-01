import {
  ServerRequest,
  Response,
  Status,
  Cookie,
  getCookies,
  setCookie,
  deleteCookie,
} from 'https://deno.land/std@0.88.0/http/mod.ts';
import { MultipartReader } from 'https://deno.land/std@0.88.0/mime/mod.ts';

import { Application } from './application.ts';

export const ContentType = 'content-type';

export enum MediaType {
  Text = 'text/plain',
  JSON = 'application/json',
  FormUrlencoded = 'application/x-www-form-urlencoded',
  MultipartFormData = 'multipart/form-data',
  OctetStream = 'application/octet-stream',
}

export const CharsetUtf8 = 'charset=utf-8';

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
    return this.get(ContentType) ?? '';
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
    return (await Deno.readAll(this.buffer)).buffer;
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
    if (!this.response.headers?.get(ContentType)) {
      this.set(ContentType, type);
    }
    this.response.body = body;
    await this.request.respond(this.response);
  }
  #respond = async () => {
    let type = MediaType.OctetStream as string;
    let body: Response['body'];
    const b = await this.#body;
    if (typeof b === 'string') {
      type = `${MediaType.Text}`;
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
      type = `${MediaType.FormUrlencoded}; ${CharsetUtf8}`;
      body = b.toString();
    } else {
      type = `${MediaType.JSON}`;
      body = JSON.stringify(b);
    }
    return { type, body };
  };
}
