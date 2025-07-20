// --- Funciones genéricas reutilizables ---

async function extractTitle(page, $) {
  try {
    // Detectar plataforma basada en la URL
    const url = page.url();
    
    // 1. Buscar en meta tags primero (más confiable)
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle && ogTitle.length > 0) {
      // Limpiar el título según la plataforma
      let cleanTitle = ogTitle;
      if (url.includes('aliexpress')) {
        cleanTitle = ogTitle.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      } else if (url.includes('amazon')) {
        cleanTitle = ogTitle.replace(/\s*[-|]\s*Amazon\s*\d*$/, '').trim();
      } else if (url.includes('ebay')) {
        cleanTitle = ogTitle.replace(/\s*[-|]\s*eBay\s*\d*$/, '').trim();
      }
      if (cleanTitle) return cleanTitle;
    }
    
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    if (twitterTitle && twitterTitle.length > 0) {
      let cleanTitle = twitterTitle;
      if (url.includes('aliexpress')) {
        cleanTitle = twitterTitle.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      } else if (url.includes('amazon')) {
        cleanTitle = twitterTitle.replace(/\s*[-|]\s*Amazon\s*\d*$/, '').trim();
      } else if (url.includes('ebay')) {
        cleanTitle = twitterTitle.replace(/\s*[-|]\s*eBay\s*\d*$/, '').trim();
      }
      if (cleanTitle) return cleanTitle;
    }
    
    // 2. Buscar en selectores específicos por plataforma
    let platformSelectors = [];
    
    if (url.includes('amazon')) {
      // Selectores específicos de Amazon
      platformSelectors = [
        '#productTitle',
        '.product-title',
        'h1[data-automation-id="product-title"]',
        '.a-size-large.product-title-word-break',
        '.a-size-large.a-spacing-none.a-color-base'
      ];
    } else if (url.includes('ebay')) {
      // Selectores específicos de eBay
      platformSelectors = [
        'h1[data-testid="x-item-title"]',
        '.x-item-title__mainTitle',
        '.x-item-title',
        'h1'
      ];
    } else {
      // Selectores genéricos
      platformSelectors = [
        'h1',
        '.product-title',
        '.product-name',
        '.item-title',
        '.title',
        '[data-testid="product-title"]',
        '.product-info-title',
        '.product-detail-title'
      ];
    }
    
    for (const selector of platformSelectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 0) return title;
    }
    
    // 3. Fallback a title tag
    const title = $('title').text().trim();
    if (title && title.length > 0) {
      // Limpiar el título según la plataforma
      let cleanTitle = title;
      if (url.includes('aliexpress')) {
        cleanTitle = title.replace(/\s*-\s*AliExpress\s*\d*$/, '').trim();
      } else if (url.includes('amazon')) {
        cleanTitle = title.replace(/\s*[-|]\s*Amazon\s*\d*$/, '').trim();
      } else if (url.includes('ebay')) {
        cleanTitle = title.replace(/\s*[-|]\s*eBay\s*\d*$/, '').trim();
      }
      if (cleanTitle) return cleanTitle;
    }
    
    return 'Sin nombre';
  } catch (e) {
    return 'Sin nombre';
  }
}

async function extractImage(page, $) {
  let imagen = '';
  
  // 1. Buscar en meta tags (más confiable)
  imagen = $('meta[property="og:image"]').attr('content') || '';
  if (imagen) return imagen;
  
  imagen = $('meta[name="twitter:image"]').attr('content') || '';
  if (imagen) return imagen;
  
  // 2. Buscar en scripts embebidos (patrones comunes)
  if (!imagen) {
    const allScripts = await page.$$eval('script', scripts => 
      scripts.map(s => s.textContent || s.innerHTML).filter(Boolean)
    );
    
    for (const script of allScripts) {
      // Patrón genérico para imágenes en JSON
      const imagePatterns = [
        /"image"\s*:\s*"(https?:\/\/[^"]+)"/,
        /"imageUrl"\s*:\s*"(https?:\/\/[^"]+)"/,
        /"image_url"\s*:\s*"(https?:\/\/[^"]+)"/,
        /"img"\s*:\s*"(https?:\/\/[^"]+)"/,
        /"photo"\s*:\s*"(https?:\/\/[^"]+)"/,
        /"picture"\s*:\s*"(https?:\/\/[^"]+)"/
      ];
      
      for (const pattern of imagePatterns) {
        const match = script.match(pattern);
        if (match && match[1]) {
          imagen = match[1];
          break;
        }
      }
      if (imagen) break;
    }
  }
  
  // 3. Buscar en el DOM con selectores específicos por plataforma
  if (!imagen) {
    // Detectar plataforma basada en la URL
    const url = page.url();
    let domSelectors = [];
    
    if (url.includes('amazon')) {
      // Selectores específicos de Amazon
      domSelectors = [
        '#landingImage',
        '#imgBlkFront',
        '#main-image',
        '.a-dynamic-image',
        'img[data-old-hires]',
        'img[data-a-dynamic-image]',
        'img[alt*="product"]',
        'img[alt*="Product"]',
        'img[alt*="main"]',
        'img[alt*="Main"]',
        '.a-image-container img',
        '.a-image-stretch-vertical img',
        '.a-image-stretch-horizontal img',
        '.a-image-stretch img'
      ];
    } else if (url.includes('ebay')) {
      // Selectores específicos de eBay
      domSelectors = [
        'img[data-testid="x-item-image"]',
        '.ux-image-carousel-item img',
        '.ux-image-magnify img',
        '.ux-image-magnify__image',
        'img[alt*="item"]',
        'img[alt*="Item"]',
        'img[alt*="product"]',
        'img[alt*="Product"]'
      ];
    } else {
      // Selectores genéricos para otras plataformas
      domSelectors = [
        'img[role="presentation"]',
        'img[alt*="product"]',
        'img[alt*="Product"]',
        'img[alt*="main"]',
        'img[alt*="Main"]',
        'img[data-testid*="image"]',
        'img[class*="image"]',
        'img[class*="photo"]',
        'img[class*="picture"]',
        'img'
      ];
    }
    
    for (const selector of domSelectors) {
      try {
        imagen = $(selector).first().attr('src') || $(selector).first().attr('data-src') || '';
        if (imagen && imagen.length > 0) break;
      } catch (e) {}
    }
  }
  
  return imagen || '';
}

function extractCompany(platformName) {
  const companies = {
    'ebay': 'eBay',
    'amazon': 'Amazon',
    'aliexpress': 'AliExpress'
  };
  return companies[platformName] || platformName;
}

function extractUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Para todas las plataformas, mantener la ruta completa pero sin parámetros
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    
  } catch (error) {
    // Si hay error al parsear la URL, devolver la original
    return url;
  }
}

module.exports = {
  extractTitle,
  extractImage,
  extractCompany,
  extractUrl
}; 