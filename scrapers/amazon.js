const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { extractTitle, extractImage, extractCompany, extractUrl } = require('./common');

// --- Función específica de Amazon para precio y moneda ---

async function extractPriceAndCurrencyAmazon(page, $) {
  let precio = null, moneda = null;
  
  console.log('=== INICIANDO EXTRACCIÓN DE PRECIO AMAZON ===');
  
  // 0. Buscar precio principal en .a-offscreen (más confiable)
  console.log('0. Buscando precio principal en .a-offscreen...');
  try {
    const offscreenElements = await page.$$('.a-offscreen');
    for (let i = 0; i < offscreenElements.length; i++) {
      const offscreenText = await page.evaluate(el => el.textContent, offscreenElements[i]);
      console.log(`Offscreen ${i + 1}: "${offscreenText}"`);
      
      if (offscreenText && offscreenText.includes('$')) {
        const match = offscreenText.match(/([\$€£¥₹])([0-9.,]+)/);
        if (match) {
          const symbol = match[1];
          precio = match[2].replace(',', '');
          const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };
          moneda = currencyMap[symbol];
          console.log(`✓ Precio principal encontrado en offscreen: ${moneda} ${precio}`);
          return { precio, moneda };
        }
      }
    }
  } catch (e) {
    console.log('Error en offscreen:', e.message);
  }
  
  // 1. Selectores principales de Amazon (más específicos)
  const mainPriceSelectors = [
    '.a-price .a-offscreen', // Precio principal con símbolo
    '.a-price-whole', // Solo la parte entera
    '.a-price-current .a-offscreen', // Precio actual
    '.a-price-range .a-offscreen', // Rango de precios
    '.a-price .a-price-whole', // Parte entera del precio
    '.a-price .a-price-fraction', // Parte decimal
    '.a-price-current .a-price-whole', // Precio actual entero
    '.a-price-current .a-price-fraction', // Precio actual decimal
    '.a-price .a-price-symbol', // Símbolo de moneda
    '.a-price-current .a-price-symbol', // Símbolo de moneda actual
    '.a-price .a-price-whole + .a-price-fraction', // Combinación whole + fraction
    '.a-price-current .a-price-whole + .a-price-fraction', // Combinación actual
    '.a-price .a-offscreen + .a-price-whole', // Combinación offscreen + whole
    '.a-price .a-offscreen + .a-price-fraction' // Combinación offscreen + fraction
  ];
  
  console.log('1. Buscando en selectores principales...');
  for (const selector of mainPriceSelectors) {
    try {
      const priceEl = await page.$(selector);
      if (priceEl) {
        const priceText = await page.evaluate(el => el.textContent, priceEl);
        console.log(`Selector ${selector}: "${priceText}"`);
        
        if (priceText && priceText.trim()) {
          // Patrón mejorado para precios de Amazon
          const match = priceText.match(/([A-Z]{1,3})?\s?([\$€£¥₹])?([0-9.,]+)/);
          if (match) {
            moneda = match[1] || '';
            const symbol = match[2] || '';
            precio = match[3].replace(',', '');
            
            // Mapear símbolos a códigos de moneda
            if (symbol && !moneda) {
              const currencyMap = {
                '$': 'USD',
                '€': 'EUR',
                '£': 'GBP',
                '¥': 'JPY',
                '₹': 'INR'
              };
              moneda = currencyMap[symbol];
            }
            
            console.log(`✓ Precio encontrado: ${moneda} ${precio}`);
            break;
          }
        }
      }
    } catch (e) {
      console.log(`Error en selector ${selector}:`, e.message);
    }
  }
  
  // 2. Buscar precio completo combinando whole + fraction (MEJORADO)
  if (!precio) {
    console.log('2. Buscando precio completo (whole + fraction)...');
    try {
      // Buscar el precio principal del producto (no productos relacionados)
      const mainPriceContainer = await page.$('.a-price[data-a-size="medium_plus"][data-a-color="base"]') || 
                                 await page.$('.a-price[data-a-size="large"][data-a-color="base"]') ||
                                 await page.$('.a-price.a-text-price.a-size-medium.apexPriceToPay') ||
                                 await page.$('.a-price');
      
      if (mainPriceContainer) {
        // Extraer whole, fraction y symbol del contenedor principal
        const wholeEl = await mainPriceContainer.$('.a-price-whole');
        const fractionEl = await mainPriceContainer.$('.a-price-fraction');
        const symbolEl = await mainPriceContainer.$('.a-price-symbol');
        const offscreenEl = await mainPriceContainer.$('.a-offscreen');
        
        let whole = '', fraction = '', symbol = '';
        
        if (wholeEl) {
          whole = await page.evaluate(el => el.textContent, wholeEl);
        }
        if (fractionEl) {
          fraction = await page.evaluate(el => el.textContent, fractionEl);
        }
        if (symbolEl) {
          symbol = await page.evaluate(el => el.textContent, symbolEl);
        }
        if (offscreenEl) {
          const offscreenText = await page.evaluate(el => el.textContent, offscreenEl);
          console.log(`Offscreen text: "${offscreenText}"`);
          // Extraer precio completo del offscreen
          const offscreenMatch = offscreenText.match(/([\$€£¥₹])([0-9.,]+)/);
          if (offscreenMatch) {
            symbol = offscreenMatch[1];
            precio = offscreenMatch[2].replace(',', '');
            const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };
            moneda = currencyMap[symbol];
            console.log(`✓ Precio desde offscreen: ${moneda} ${precio}`);
            return { precio, moneda };
          }
        }
        
        console.log(`Whole: "${whole}", Fraction: "${fraction}", Symbol: "${symbol}"`);
        
        if (whole) {
          precio = fraction ? `${whole}.${fraction}` : `${whole}.00`;
          
          // Mapear símbolo a moneda
          if (symbol) {
            const currencyMap = {
              '$': 'USD',
              '€': 'EUR',
              '£': 'GBP',
              '¥': 'JPY',
              '₹': 'INR'
            };
            moneda = currencyMap[symbol] || symbol;
          }
          
          console.log(`✓ Precio completo encontrado: ${moneda} ${precio}`);
        }
      }
    } catch (e) {
      console.log('Error en precio completo:', e.message);
    }
  }
  
  // 3. Buscar en JSON-LD structured data
  if (!precio) {
    console.log('3. Buscando en JSON-LD...');
    const jsonLdScripts = await page.$$('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      const content = await page.evaluate(el => el.textContent, script);
      try {
        const data = JSON.parse(content);
        if (data && data.offers) {
          if (data.offers.price) {
            precio = data.offers.price;
            moneda = data.offers.priceCurrency || '';
            console.log(`✓ Precio JSON-LD encontrado: ${moneda} ${precio}`);
            break;
          }
        }
      } catch (e) {}
    }
  }
  
  // 4. Buscar en scripts embebidos de Amazon (más específicos)
  if (!precio) {
    console.log('4. Buscando en scripts embebidos...');
    const allScripts = await page.$$eval('script', scripts => 
      scripts.map(s => s.textContent || s.innerHTML).filter(Boolean)
    );
    
    for (let i = 0; i < allScripts.length; i++) {
      const script = allScripts[i];
      
      // Patrones específicos de Amazon
      const amazonPatterns = [
        /"price"\s*:\s*"?([0-9.,]+)"?/,
        /"amount"\s*:\s*"?([0-9.,]+)"?/,
        /"value"\s*:\s*"?([0-9.,]+)"?/,
        /"currentPrice"\s*:\s*"?([0-9.,]+)"?/,
        /"displayPrice"\s*:\s*"?([0-9.,]+)"?/,
        /"priceAmount"\s*:\s*"?([0-9.,]+)"?/,
        /"priceValue"\s*:\s*"?([0-9.,]+)"?/,
        /"priceAmount"\s*:\s*\{[^}]*"value"\s*:\s*"?([0-9.,]+)"?/,
        /"price"\s*:\s*\{[^}]*"amount"\s*:\s*"?([0-9.,]+)"?/
      ];
      
      for (const pattern of amazonPatterns) {
        const match = script.match(pattern);
        if (match && match[1]) {
          precio = match[1];
          console.log(`✓ Precio en script ${i + 1}: ${precio}`);
          break;
        }
      }
      if (precio) break;
    }
  }
  
  // 5. Buscar en variables JavaScript específicas de Amazon
  if (!precio) {
    console.log('5. Buscando en variables JavaScript...');
    try {
      const jsPrice = await page.evaluate(() => {
        // Buscar en variables globales de Amazon
        if (window.P && window.P.when && window.P.when('price')) {
          return window.P.when('price');
        }
        if (window.priceData) {
          return window.priceData.price || window.priceData.amount;
        }
        if (window.productData) {
          return window.productData.price || window.productData.amount;
        }
        return null;
      });
      
      if (jsPrice) {
        precio = jsPrice.toString();
        console.log(`✓ Precio en JavaScript: ${precio}`);
      }
    } catch (e) {
      console.log('Error en JavaScript:', e.message);
    }
  }
  
  // 6. Fallback: buscar en todo el texto con patrones mejorados
  if (!precio) {
    console.log('6. Búsqueda por texto plano...');
    const allText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .map(el => el.textContent)
        .filter(text => text && text.length > 0)
        .join(' ');
    });
    
    const pricePatterns = [
      /([A-Z]{1,3})?\s?\$([0-9.,]+)/g,
      /([A-Z]{1,3})?\s?€([0-9.,]+)/g,
      /([A-Z]{1,3})?\s?£([0-9.,]+)/g,
      /([A-Z]{1,3})?\s?¥([0-9.,]+)/g,
      /([A-Z]{1,3})?\s?₹([0-9.,]+)/g,
      /\$([0-9.,]+)/g,
      /€([0-9.,]+)/g,
      /£([0-9.,]+)/g,
      /¥([0-9.,]+)/g,
      /₹([0-9.,]+)/g
    ];
    
    for (const pattern of pricePatterns) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 0) {
        const bestMatch = matches[0];
        console.log(`Patrón encontrado: "${bestMatch}"`);
        
        // Extraer precio y moneda del patrón
        if (pattern.toString().includes('([A-Z]{1,3})')) {
          const match = bestMatch.match(/([A-Z]{1,3})?\s?([\$€£¥₹])([0-9.,]+)/);
          if (match) {
            moneda = match[1] || '';
            const symbol = match[2];
            precio = match[3].replace(',', '');
            
            if (symbol && !moneda) {
              const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };
              moneda = currencyMap[symbol];
            }
          }
        } else {
          const match = bestMatch.match(/([\$€£¥₹])([0-9.,]+)/);
          if (match) {
            const symbol = match[1];
            precio = match[2].replace(',', '');
            const currencyMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };
            moneda = currencyMap[symbol];
          }
        }
        
        if (precio) {
          console.log(`✓ Precio por texto plano: ${moneda} ${precio}`);
          break;
        }
      }
    }
  }
  
  console.log(`=== RESULTADO FINAL AMAZON ===`);
  console.log(`Precio: ${precio || 'NO ENCONTRADO'}`);
  console.log(`Moneda: ${moneda || 'NO ENCONTRADA'}`);
  
  return { precio: precio || 'No encontrado', moneda: moneda || '' };
}

// --- Scraper principal de Amazon ---

async function scrapeAmazon(url) {
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
  const { precio, moneda } = await extractPriceAndCurrencyAmazon(page, $);
  const imagen = await extractImage(page, $);
  const empresa = extractCompany('amazon');
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

module.exports = scrapeAmazon; 