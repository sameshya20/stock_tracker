const EXCHANGE_RATES = {
    USD: 1,
    INR: 83.25,
    EUR: 0.92,
    GBP: 0.79,
};

const CURRENCY_SYMBOLS = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
};

/**
 * Formats a value based on the user's preferred currency
 * @param {number} value - The value in USD
 * @param {string} targetCurrency - The target currency code (USD, INR, EUR, GBP)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, targetCurrency = 'USD') => {
    const rate = EXCHANGE_RATES[targetCurrency] || 1;
    const convertedValue = value * rate;
    const symbol = CURRENCY_SYMBOLS[targetCurrency] || '$';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(convertedValue).replace(targetCurrency, symbol).trim();
};

/**
 * Converts a value from USD to target currency numerical value
 * @param {number} value - The value in USD
 * @param {string} targetCurrency - The target currency code
 * @returns {number}
 */
export const convertCurrency = (value, targetCurrency = 'USD') => {
    const rate = EXCHANGE_RATES[targetCurrency] || 1;
    return value * rate;
};

export const getCurrencySymbol = (currencyCode) => {
    return CURRENCY_SYMBOLS[currencyCode] || '$';
};
