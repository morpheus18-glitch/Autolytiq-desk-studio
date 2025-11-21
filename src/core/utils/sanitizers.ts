/**
 * Security sanitization utilities
 *
 * Provides HTML, text, query sanitization and request middleware for XSS and SQL injection prevention.
 */

import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Sanitize HTML for email display (XSS prevention with DOMPurify)
 * @param html Raw HTML content
 * @returns Sanitized HTML safe for display
 */
export function sanitizeEmailHtml(html: string): string {
  // DOMPurify configuration for email content
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'width', 'height', 'align', 'target'
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text by escaping HTML entities
 * @param text Plain text content
 * @returns HTML-escaped text
 */
export function sanitizeEmailText(text: string): string {
  return validator.escape(text);
}

/**
 * Sanitize search query to prevent SQL injection
 * @param query User search input
 * @returns Sanitized query string (max 100 chars)
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove SQL keywords and special characters
  return query
    .replace(/[;'"\\]/g, '') // Remove SQL special chars
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Express middleware to sanitize request inputs (removes null bytes)
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // Remove null bytes from all string inputs
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for typosquatting detection in email domain validation
 * @param a First string
 * @param b Second string
 * @returns Edit distance integer
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
