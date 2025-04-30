# Implementation Plan:

## Create URL Normalizer Utility
Handle inputs like n8n.io/path → https://n8n.io
Validate URLs and add missing protocols

## Sitemap Finder Service
Check /robots.txt for sitemap references
Try common paths (/sitemap.xml, /sitemap_index.xml)
Parse both XML and TXT sitemap formats

## New Controller Method
Add getSitemapUrls to crawlerController.js
Return JSON with normalized URLs

## Route Integration
Add GET /crawler/sitemap endpoint