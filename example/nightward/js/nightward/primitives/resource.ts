// RMMZ loads local resources through XHR; Chromium rejects fetch() for file:// URLs.
export function loadResource<T>(url: string, responseType: 'json' | 'arraybuffer' = 'json'): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', url)
    request.responseType = responseType
    request.onload = () => request.status < 400 && request.response ? resolve(request.response as T) : reject(new Error(`Nightward resource: ${url} (${request.status})`))
    request.onerror = () => reject(new Error(`Nightward resource: ${url}`))
    request.send()
  })
}
