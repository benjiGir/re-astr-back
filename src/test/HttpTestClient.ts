import { HttpClient, HttpClientRequest } from 'effect/unstable/http'

const withCookie = (
  request: HttpClientRequest.HttpClientRequest,
  cookieHeader?: string,
): HttpClientRequest.HttpClientRequest =>
  cookieHeader === undefined
    ? request
    : request.pipe(HttpClientRequest.setHeader('Cookie', cookieHeader))

export const getJson = (url: string, cookieHeader?: string) =>
  HttpClient.execute(withCookie(HttpClientRequest.get(url), cookieHeader))

export const postJson = (url: string, payload: unknown, cookieHeader?: string) =>
  HttpClient.execute(
    withCookie(
      HttpClientRequest.post(url).pipe(HttpClientRequest.bodyJsonUnsafe(payload)),
      cookieHeader,
    ),
  )

export const patchJson = (url: string, payload: unknown, cookieHeader?: string) =>
  HttpClient.execute(
    withCookie(
      HttpClientRequest.patch(url).pipe(HttpClientRequest.bodyJsonUnsafe(payload)),
      cookieHeader,
    ),
  )

export const deleteJson = (url: string, cookieHeader?: string) =>
  HttpClient.execute(withCookie(HttpClientRequest.delete(url), cookieHeader))
