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

export class Context {
  static #CONTENT_TYPE = 'content-type';

  readonly URL;
  readonly cookies;

  constructor(readonly request: Request) {
    const { url, headers } = request;
    this.URL = new URL(url);
    this.cookies = new Map(Object.entries(getCookies(headers)));
  }

  response?: Response;

  body: unknown;

  #status?: Status;
  get status(): Status | undefined {
    return (
      this.#status ??
      (typeof this.body === 'undefined' ? Status.NotFound : Status.OK)
    );
  }
  set status(status) {
    this.#status = status;
  }

  #statusText?: string;
  get statusText(): string | undefined {
    return (
      this.#statusText ?? (this.status ? STATUS_TEXT[this.status] : undefined)
    );
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
    return this.headers.get(Context.#CONTENT_TYPE) as ContentType;
  }
  set contentType(type) {
    this.headers.set(Context.#CONTENT_TYPE, contentType(type) ?? type);
  }
  deleteContentType() {
    this.headers.delete(Context.#CONTENT_TYPE);
  }

  async _response() {
    if (this.response) {
      return this.response;
    }
    let type: ContentType | undefined;
    let body: BodyInit | null | undefined;
    if (this.body instanceof Promise) {
      this.body = await this.body;
    }
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
    return new Response(body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }
}
