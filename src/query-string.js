// Simple query string utilities
const queryString = {
  parse(str) {
    if (typeof str !== 'string') return {};
    
    const trimmedStr = str.trim().replace(/^(\?|#|&)/, '');
    if (!trimmedStr) return {};
    
    return trimmedStr.split('&').reduce((result, param) => {
      const [key, ...valueParts] = param.replace(/\+/g, ' ').split('=');
      const value = valueParts.length > 0 ? valueParts.join('=') : null;
      
      const decodedKey = decodeURIComponent(key);
      const decodedValue = value === null ? null : decodeURIComponent(value);
      
      if (result[decodedKey] === undefined) {
        result[decodedKey] = decodedValue;
      } else if (Array.isArray(result[decodedKey])) {
        result[decodedKey].push(decodedValue);
      } else {
        result[decodedKey] = [result[decodedKey], decodedValue];
      }
      
      return result;
    }, {});
  },
  
  stringify(obj) {
    if (!obj) return '';
    
    return Object.keys(obj)
      .sort()
      .map(key => {
        const value = obj[key];
        
        if (value === undefined) return '';
        if (value === null) return encodeURIComponent(key);
        
        if (Array.isArray(value)) {
          return value
            .slice()
            .sort()
            .map(val => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
            .join('&');
        }
        
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .filter(x => x.length > 0)
      .join('&');
  },
  
  extract(url) {
    return url.split('?')[1] || '';
  }
};

// Make it available globally
window.queryString = queryString; 