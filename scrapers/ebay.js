
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const Logger = require('../utils/logger');

// Crear logger para eBay
const logger = new Logger('EBAY');

// --- Funciones específicas de eBay ---

async function extractTitle(page, $) {
  try {
    // Buscar en meta tags primero (más confiable)
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle && ogTitle.length > 0) {
      const cleanTitle = ogTitle.replace(/\s*[-|]\s*eBay\s*\d*$/, '').trim();
      if (cleanTitle) return cleanTitle;
    }
    
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    if (twitterTitle && twitterTitle.length > 0) {
      const cleanTitle = twitterTitle.replace(/\s*[-|]\s*eBay\s*\d*$/, '').trim();
      if (cleanTitle) return cleanTitle;
    }
    
    // Buscar en selectores específicos de eBay
    const platformSelectors = [
      'h1[data-testid="x-item-title"]',
      '.x-item-title__mainTitle',
      '.x-item-title',
      'h1'
    ];
    
    for (const selector of platformSelectors) {
      const title = $(selector).first().text().trim();
      if (title && title.length > 0) return title;
    }
    
    // Fallback a title tag
    const title = $('title').text().trim();
    if (title && title.length > 0) {
      const cleanTitle = title.replace(/\s*[-|]\s*eBay\s*\d*$/, '').trim();
      if (cleanTitle) return cleanTitle;
    }
    
    return 'Sin nombre';
  } catch (e) {
    return 'Sin nombre';
  }
}

async function extractImage(page, $) {
  let imagen = '';
  
  // Buscar en meta tags (más confiable)
  imagen = $('meta[property="og:image"]').attr('content') || '';
  if (imagen) return imagen;
  
  imagen = $('meta[name="twitter:image"]').attr('content') || '';
  if (imagen) return imagen;
  
  // Buscar en el DOM con selectores específicos de eBay
  const domSelectors = [
    'img[data-testid="x-item-image"]',
    '.ux-image-carousel-item img',
    '.ux-image-magnify img',
    '.ux-image-magnify__image',
    'img[alt*="item"]',
    'img[alt*="Item"]',
    'img[alt*="product"]',
    'img[alt*="Product"]'
  ];
  
  for (const selector of domSelectors) {
    try {
      imagen = $(selector).first().attr('src') || $(selector).first().attr('data-src') || '';
      if (imagen && imagen.length > 0) break;
    } catch (e) {}
  }
  
  return imagen || '';
}

function extractCompany() {
  return 'eBay';
}

function extractUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch (error) {
    return url;
  }
}

// --- Función específica de eBay para precio y moneda ---

async function extractPriceAndCurrencyEbay(page, $) {
  let precio = null, moneda = null;
  
  // 1. DOM selectores principales de eBay
  const mainPriceSelectors = [
    '.x-price-primary .ux-textspans',
    '.x-bin-price__content .ux-textspans',
    '.x-price-approx__value',
    '.x-price-approx__price',
    '.x-price-approx__amount',
    '.display-price',
    '.x-price',
    '.price',
    '[data-testid="x-price-primary"]',
    '[data-testid="x-bin-price__content"]',
    '.x-price-primary span',
    '.x-bin-price__content span'
  ];
  
  for (const selector of mainPriceSelectors) {
    const priceEl = await page.$(selector);
    if (priceEl) {
      const priceText = await page.evaluate(el => el.textContent, priceEl);
      const match = priceText.match(/([A-Z]{1,3})?\s?\$([0-9.,]+)/);
      if (match) {
        moneda = match[1] || '';
        precio = match[2].replace(',', '');
        break;
      }
    }
  }
  
  // 2. JSON-LD
  if (!precio) {
    const jsonLdScripts = await page.$$('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      const content = await page.evaluate(el => el.textContent, script);
      try {
        const data = JSON.parse(content);
        if (data && data.offers) {
          if (data.offers.price) {
            precio = data.offers.price;
            moneda = data.offers.priceCurrency || '';
            break;
          }
        }
      } catch (e) {}
    }
  }
  
  // 3. Scripts embebidos (displayPrice específico de eBay)
  if (!precio) {
    const allScripts = await page.$$eval('script', scripts => scripts.map(s => s.textContent || s.innerHTML).filter(Boolean));
    for (let i = 0; i < allScripts.length; i++) {
      const script = allScripts[i];
      
      // Patrón específico displayPrice de eBay
      const displayPricePattern = /"displayPrice"\s*:\s*\{[^}]*"value"\s*:\s*\{[^}]*"value"\s*:\s*([0-9.,]+)[^}]*"currency"\s*:\s*"([A-Z]{3})"[^}]*\}/g;
      const displayPriceMatches = script.match(displayPricePattern);
      if (displayPriceMatches && displayPriceMatches.length > 0) {
        for (const match of displayPriceMatches) {
          const valueMatch = match.match(/"value"\s*:\s*([0-9.,]+)/);
          const currencyMatch = match.match(/"currency"\s*:\s*"([A-Z]{3})"/);
          if (valueMatch && currencyMatch) {
            precio = valueMatch[1];
            moneda = currencyMatch[1];
            break;
          }
        }
        if (precio) break;
      }
      
      // Patrón simple displayPrice
      const simpleDisplayPricePattern = /"displayPrice".*?"value"\s*:\s*\{([^}]+)\}/s;
      const simpleMatch = script.match(simpleDisplayPricePattern);
      if (simpleMatch && !precio) {
        try {
          const valueMatch = simpleMatch[1].match(/"value"\s*:\s*"?([0-9.,]+)"?/);
          const currencyMatch = simpleMatch[1].match(/"currency"\s*:\s*"?([A-Z]{3})"?/);
          if (valueMatch) {
            precio = valueMatch[1];
            if (currencyMatch) moneda = currencyMatch[1];
            break;
          }
        } catch (e) {}
      }
    }
  }
  
  // 4. Fallback: texto plano
  if (!precio) {
    const allText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .map(el => el.textContent)
        .filter(text => text && text.length > 0)
        .join(' ');
    });
    
    const pricePatterns = [
      /([A-Z]{1,3})?\s?\$([0-9.,]+)/g,
      /([A-Z]{1,3})?\s?([0-9.,]+)\s?USD/g,
      /([A-Z]{1,3})?\s?([0-9.,]+)\s?EUR/g,
      /([A-Z]{1,3})?\s?([0-9.,]+)\s?CAD/g
    ];
    
    for (const pattern of pricePatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        const bestMatch = matches[0];
        const match = bestMatch.match(/([A-Z]{1,3})?\s?[\$]?([0-9.,]+)/);
        if (match) {
          moneda = match[1] || '';
          precio = match[2].replace(',', '');
          break;
        }
      }
    }
  }
  
  return { precio: precio || 'No encontrado', moneda: moneda || '' };
}

// --- Scraper principal de eBay ---

async function scrapeEbay(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Configuración anti-bot
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({
    'accept-language': 'en-US,en;q=0.9',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  });
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
  
  // Simular interacción humana
  await page.waitForTimeout(2000);
  await page.mouse.move(100, 100);
  await page.waitForTimeout(1000);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1000);
  await page.waitForTimeout(3000);
  
  const html = await page.content();
  const $ = cheerio.load(html);

  // Extraer datos usando funciones genéricas y específicas
  const producto = await extractTitle(page, $);
  const { precio, moneda } = await extractPriceAndCurrencyEbay(page, $);
  const imagen = await extractImage(page, $);
  const empresa = extractCompany();
  const urlFinal = extractUrl(url);

  await browser.close();

  return {
    Producto: producto,
    Empresa: empresa,
    Precio: precio,
    Moneda: moneda,
    Imagen: imagen,
    Url: urlFinal
  };
}

module.exports = scrapeEbay;

