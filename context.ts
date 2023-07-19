import {
  Status,
  STATUS_TEXT,
  contentType,
  getCookies,
  getSetCookies,
  setCookie,
  deleteCookie,
  Cookie,
} from './deps.ts';

type ContentType = Parameters<typeof contentType>[0];

const CONTENT_TYPE = 'content-type';

export class Context {
  readonly URL;
  readonly cookies;

  constructor(readonly request: Request) {
    const { url, headers } = request;
    this.URL = new URL(url);
    this.cookies = new Map(Object.entries(getCookies(headers)));
  }

  #status?: Status;
  get status() {
    return this.response.status as Status;
  }
  set status(status) {
    this.#status = status;
  }
  #statusText?: string;
  get statusText() {
    return this.response.statusText;
  }
  set statusText(statusText) {
    this.#statusText = statusText;
  }

  headers = new Headers();
  get setCookies() {
    return getSetCookies(this.headers);
  }
  set cookie(cookie: Cookie) {
    setCookie(this.headers, cookie);
  }
  deleteCookie(name: string) {
    deleteCookie(this.headers, name);
  }
  get contentType() {
    return this.headers.get(CONTENT_TYPE) as ContentType;
  }
  set contentType(type) {
    this.headers.set(CONTENT_TYPE, contentType(type) ?? type);
  }
  deleteContentType() {
    this.headers.delete(CONTENT_TYPE);
  }

  body: unknown;

  #response?: Response;
  get response() {
    return this.#response ?? this.#render();
  }
  set response(response) {
    this.#response = response;
  }
  #render() {
    let type: ContentType | undefined;
    let body: BodyInit | null | undefined;
    if (typeof this.body === 'undefined' || this.body === null) {
      body = this.body;
    } else if (this.body instanceof Deno.FsFile) {
      type = 'application/octet-stream';
      body = this.body.readable;
    } else if (
      this.body instanceof Blob ||
      this.body instanceof ArrayBuffer ||
      ArrayBuffer.isView(this.body) ||
      this.body instanceof ReadableStream
    ) {
      type = 'application/octet-stream';
      body = this.body;
    } else if (typeof this.body === 'string') {
      type = 'text/plain';
      body = this.body;
    } else if (this.body instanceof FormData) {
      type = 'multipart/form-data';
      body = this.body;
    } else if (this.body instanceof URLSearchParams) {
      type = 'application/x-www-form-urlencoded';
      body = this.body;
    } else {
      type = 'application/json';
      body = JSON.stringify(this.body);
    }
    if (type && !this.contentType) this.contentType = type;
    const status =
      this.#status ??
      (typeof body === 'undefined' || body === null
        ? Status.NotFound
        : Status.OK);
    const statusText = this.#statusText ?? STATUS_TEXT[status];
    return new Response(body, {
      status,
      statusText,
      headers: this.headers,
    });
  }

  upgrade() {
    const { response, socket } = Deno.upgradeWebSocket(this.request);
    this.#response = response;
    return socket;
  }
}
