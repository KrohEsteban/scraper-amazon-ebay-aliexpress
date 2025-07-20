// --- Funciones de validación ---

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getPlatformFromUrl(url) {
  if (!isValidUrl(url)) return null;
  
  const domain = new URL(url).hostname.toLowerCase();
  
  if (domain.includes('ebay.')) return 'ebay';
  if (domain.includes('amazon.')) return 'amazon';
  if (domain.includes('aliexpress.')) return 'aliexpress';
  
  return null;
}

function validateScrapedData(data) {
  const required = ['Producto', 'Empresa', 'Precio', 'Moneda', 'Imagen', 'Url'];
  const missing = required.filter(field => !data[field] || data[field] === '');
  
  return {
    isValid: missing.length === 0,
    missing,
    data
  };
}

function cleanPrice(price) {
  if (typeof price === 'string') {
    return price.replace(/[^\d.,]/g, '').replace(',', '.');
  }
  return price;
}

function cleanTitle(title) {
  if (typeof title === 'string') {
    return title
      .replace(/\s*[-|]\s*(AliExpress|Amazon|eBay)\s*\d*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return title;
}

module.exports = {
  isValidUrl,
  getPlatformFromUrl,
  validateScrapedData,
  cleanPrice,
  cleanTitle
}; 