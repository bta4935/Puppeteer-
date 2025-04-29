# Selector Extraction API

# Selector Extraction & Custom Web Crawler API

A Node.js + Express API for extracting content from web pages using Puppeteer. Supports CSS selector extraction, full JavaScript-rendered content extraction, and custom extraction functions.

## Folder Structure

```
/project-root
│
├── /controllers
│     └── crawlerController.js
├── /routes
│     └── crawlerRoutes.js
├── /services
│     └── puppeteerService.js
├── index.js
├── package.json
└── README.md
```

## Usage

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the server:**
   ```bash
   node index.js
   ```

---

## Endpoints

### 1. Selector Extraction
Extract specific elements using CSS selectors.
- **GET /crawler/selector**
- **Query Params:**
  - `url` (required): The page to crawl
  - `selectors` (required): Comma-separated CSS selectors (e.g., `h1,p,a`)

**Example:**
```bash
curl -X GET "http://localhost:8787/crawler/selector?url=https://example.com&selectors=h1,p,a"
```
**Response:**
```json
{
  "url": "https://example.com",
  "status": 200,
  "timestamp": 1650465789123,
  "elements": [
    {
      "selector": "h1",
      "results": [
        { "text": "Example Domain", "html": "<h1>Example Domain</h1>", "attributes": [], "top": 0, "left": 0, "width": 100, "height": 50 }
      ]
    },
    ...
  ]
}
```

---

### 2. JavaScript Extraction
Extract content after running JavaScript on the page (after client-side rendering).
- **GET /crawler/js**
- **Query Params:**
  - `url` (required): The page to crawl

**Example:**
```bash
curl -X GET "http://localhost:8787/crawler/js?url=https://example.com"
```
**Response:**
```json
{
  "url": "https://example.com",
  "status": 200,
  "timestamp": 1650465789123,
  "html": "<!DOCTYPE html><html>...</html>",
  "text": "Example Domain\n\nThis domain is for use in illustrative examples in documents."
}
```

---

### 3. Custom JavaScript Execution
Execute a predefined extraction function on a web page and return the result.
- **POST /crawler/execute**
- **Query Params:**
  - `url` (required): The page to crawl
- **Body:**
  - JSON with `fnName` ("extractTitle" or "extractMeta") and optional `args` (array)

**Allowed Functions:**
- `extractTitle`: Returns the page's `<title>` as a string
- `extractMeta`: Returns an array of all `<meta>` tag content attributes on the page

**Example (extract title):**
```bash
curl -X POST "http://localhost:8787/crawler/execute?url=https://example.com" \
  -H "Content-Type: application/json" \
  -d '{"fnName": "extractTitle", "args": []}'
```
**Response:**
```json
{
  "url": "https://example.com",
  "status": 200,
  "timestamp": 1650465789123,
  "result": "Example Domain"
}
```

**Example (extract meta):**
```bash
curl -X POST "http://localhost:8787/crawler/execute?url=https://example.com" \
  -H "Content-Type: application/json" \
  -d '{"fnName": "extractMeta", "args": []}'
```
**Response:**
```json
{
  "url": "https://example.com",
  "status": 200,
  "timestamp": 1650465789123,
  "result": [
    "Example Domain",
    "Another meta content"
  ]
}
```

---

---

### 4. JS-Rendered Text to Markdown (Groq)
Convert JS-rendered page text to Markdown using Groq LLM API.
- **GET /crawler/markdown**
- **Query Params:**
  - `url` (required): The page to crawl

**Example:**
```bash
curl -X GET "http://localhost:8787/crawler/markdown?url=https://example.com"
```
**Response:**
```json
{
  "url": "https://example.com",
  "status": 200,
  "timestamp": 1650465789123,
  "markdown": "# Example Domain\n\nThis domain is for use in illustrative examples in documents."
}
```

**Notes:**
- This endpoint uses the Groq API to convert the extracted page text to Markdown format, following best practices for headings and spacing.
- You must set the `GROQ_API_KEY` environment variable (e.g., in Render dashboard) for this endpoint to function.
- If the Groq API fails, you will receive an error message in the response.

## Notes
- Only `extractTitle` and `extractMeta` are supported for the custom execute endpoint.
- All endpoints require the correct HTTP method and must not have a trailing slash.
- Replace `https://example.com` with any URL you want to crawl.
