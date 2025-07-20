// --- Sistema de logging mejorado ---

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class Logger {
  constructor(platform = 'GENERAL') {
    this.platform = platform.toUpperCase();
  }

  info(message) {
    console.log(`${colors.blue}[${this.platform}]${colors.reset} ℹ️  ${message}`);
  }

  success(message) {
    console.log(`${colors.green}[${this.platform}]${colors.reset} ✅ ${message}`);
  }

  warning(message) {
    console.log(`${colors.yellow}[${this.platform}]${colors.reset} ⚠️  ${message}`);
  }

  error(message) {
    console.log(`${colors.red}[${this.platform}]${colors.reset} ❌ ${message}`);
  }

  debug(message) {
    console.log(`${colors.cyan}[${this.platform}]${colors.reset} 🔍 ${message}`);
  }

  step(stepNumber, message) {
    console.log(`${colors.magenta}[${this.platform}]${colors.reset} 📋 Paso ${stepNumber}: ${message}`);
  }

  result(data) {
    console.log(`${colors.bright}[${this.platform}]${colors.reset} 📊 Resultado:`, data);
  }
}

module.exports = Logger; 