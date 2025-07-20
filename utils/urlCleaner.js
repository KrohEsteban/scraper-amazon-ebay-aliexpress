// Función para obtener el nombre corto de la plataforma
function getPlatformShortName(url) {
    if (url.includes('amazon')) return 'Amazon';
    if (url.includes('ebay')) return 'eBay';
    if (url.includes('aliexpress')) return 'AliExpress';
    return 'Otro';
}

module.exports = {
    getPlatformShortName
}; 