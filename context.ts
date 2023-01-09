import {
  Status,
  Cookie,
  getCookies,
  setCookie,
  deleteCookie,
  STATUS_TEXT,
} from './deps.ts';

export const CONTENT_TYPE = 'content-type';
export const CHARSET_UTF8 = 'charset=utf-8';

export enum MediaType {
  Text = 'text/plain',
  HTML = 'text/html',
  JavaScript = 'text/javascript',
  CSS = 'text/css',
  JSON = 'application/json',
  FormUrlencoded = 'application/x-www-form-urlencoded',
  MultipartFormData = 'multipart/form-data',
  OctetStream = 'application/octet-stream',
}

export class Context {
  readonly URL;
  readonly cookies;

  constructor(readonly request: Request) {
    const { url, headers } = request;
    this.URL = new URL(url);
    this.cookies = new Map(Object.entries(getCookies(headers)));
  }

  #status?: Status;
  get status(): Status | undefined {
    return this.#status ?? (this.#bodySet ? Status.OK : Status.NotFound);
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
  setCookie(cookie: Cookie) {
    setCookie(this.headers, cookie);
  }
  deleteCookie(name: string) {
    deleteCookie(this.headers, name);
  }

  #body: unknown;
  #bodySet = false;
  get body() {
    return this.#body;
  }
  set body(body) {
    this.#body = body;
    this.#bodySet = true;
  }

  get response() {
    let type: string | undefined;
    let body: BodyInit | null | undefined;
    if (
      typeof this.body === 'undefined' ||
      this.body === null ||
      this.body instanceof Blob ||
      this.body instanceof ArrayBuffer ||
      ArrayBuffer.isView(this.body) ||
      this.body instanceof ReadableStream
    )
      body = this.body;
    else if (typeof this.body === 'string') {
      type = `${MediaType.Text}; ${CHARSET_UTF8}`;
      body = this.body;
    } else if (this.body instanceof FormData) {
      type = `${MediaType.MultipartFormData}; ${CHARSET_UTF8}`;
      body = this.body;
    } else if (this.body instanceof URLSearchParams) {
      type = `${MediaType.FormUrlencoded}; ${CHARSET_UTF8}`;
      body = this.body;
    } else {
      type = `${MediaType.JSON}; ${CHARSET_UTF8}`;
      body = JSON.stringify(this.body);
    }
    if (!this.headers.get(CONTENT_TYPE) && type)
      this.headers.set(CONTENT_TYPE, type);
    return new Response(body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers,
    });
  }
}
