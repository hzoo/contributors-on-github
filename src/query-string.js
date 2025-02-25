// Simplified query string utilities
const queryString = {
  // Parse a query string into an object
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
  
  // Convert an object to a query string
  stringify(obj) {
    if (!obj) return '';
    
    return Object.keys(obj)
      .filter(key => obj[key] !== undefined)
      .map(key => {
        const value = obj[key];
        
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
  
  // Extract query string from a URL
  extract(url) {
    const queryIndex = url.indexOf('?');
    return queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  }
};

// Make it available globally
window.queryString = queryString; 