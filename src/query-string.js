/**
 * Contributors on GitHub - Query String Utilities
 * Provides utilities for parsing and building URL query strings
 */

const queryString = {
  /**
   * Parse a query string into an object
   * @param {string} str - The query string to parse
   * @returns {Object} - The parsed query parameters
   */
  parse(str) {
    if (typeof str !== 'string' || !str.trim()) return {};
    
    const trimmedStr = str.trim().replace(/^(\?|#|&)/, '');
    
    return trimmedStr.split('&').reduce((result, param) => {
      if (!param) return result;
      
      const [key, value] = param.split('=').map(part => 
        decodeURIComponent(part.replace(/\+/g, ' '))
      );
      
      // Handle array values
      if (result[key] !== undefined) {
        result[key] = Array.isArray(result[key]) 
          ? [...result[key], value] 
          : [result[key], value];
      } else {
        result[key] = value;
      }
      
      return result;
    }, {});
  },
  
  /**
   * Convert an object to a query string
   * @param {Object} obj - The object to stringify
   * @returns {string} - The resulting query string
   */
  stringify(obj) {
    if (!obj) return '';
    
    return Object.entries(obj)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (value === null) return encodeURIComponent(key);
        
        if (Array.isArray(value)) {
          return value
            .map(val => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
            .join('&');
        }
        
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .join('&');
  },
  
  /**
   * Extract query string from a URL
   * @param {string} url - The URL to extract from
   * @returns {string} - The extracted query string
   */
  extract(url) {
    const queryIndex = url.indexOf('?');
    return queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  }
};

// Make it available globally
window.queryString = queryString; 