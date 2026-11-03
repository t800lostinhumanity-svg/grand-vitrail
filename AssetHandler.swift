import WebKit

/// Sert les fichiers du jeu depuis l'application : aucun réseau n'est nécessaire.
final class AssetHandler: NSObject, WKURLSchemeHandler {
    private static let types = [
        "html": "text/html; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "png": "image/png",
        "woff2": "font/woff2",
        "webmanifest": "application/manifest+json"
    ]

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url, let root = Bundle.main.resourceURL else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        let file = root.appendingPathComponent("www").appendingPathComponent(path)
        let data = try? Data(contentsOf: file)
        let headers = [
            "Content-Type": Self.types[file.pathExtension] ?? "application/octet-stream",
            "Content-Length": String(data?.count ?? 0),
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*"
        ]
        guard let response = HTTPURLResponse(url: url, statusCode: data == nil ? 404 : 200, httpVersion: "HTTP/1.1", headerFields: headers) else {
            urlSchemeTask.didFailWithError(URLError(.badServerResponse))
            return
        }
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data ?? Data())
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}
