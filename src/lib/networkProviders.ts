// Network provider detection and utilities
export const NETWORK_PROVIDERS = {
  MTN: {
    name: 'MTN',
    prefixes: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
    color: '#FFCC00',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/MTN_Logo.svg/200px-MTN_Logo.svg.png',
  },
  GLO: {
    name: 'GLO',
    prefixes: ['0805', '0705', '0815', '0811', '0905', '0915'],
    color: '#00B140',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Glo_logo.svg/200px-Glo_logo.svg.png',
  },
  AIRTEL: {
    name: 'AIRTEL',
    prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
    color: '#FF0000',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Airtel_logo.svg/200px-Airtel_logo.svg.png',
  },
  '9MOBILE': {
    name: '9MOBILE',
    prefixes: ['0809', '0817', '0818', '0909', '0908'],
    color: '#006F3F',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/9mobile_logo.svg/200px-9mobile_logo.svg.png',
  },
};

export type NetworkProvider = 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';

/**
 * Detects network provider from phone number
 * @param phoneNumber - Nigerian phone number (with or without country code)
 * @returns Network provider name or null if not detected
 */
export function detectNetworkProvider(phoneNumber: string): NetworkProvider | null {
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats: 0803..., 234803..., +234803...
  let normalized = cleaned;
  if (cleaned.startsWith('234')) {
    normalized = '0' + cleaned.slice(3);
  } else if (cleaned.length === 10) {
    normalized = '0' + cleaned;
  }
  
  // Check if the number is 11 digits starting with 0
  if (normalized.length !== 11 || !normalized.startsWith('0')) {
    return null;
  }
  
  // Extract the first 4 digits for comparison
  const prefix = normalized.slice(0, 4);
  
  // Check each provider's prefixes
  for (const [provider, details] of Object.entries(NETWORK_PROVIDERS)) {
    if (details.prefixes.includes(prefix)) {
      return provider as NetworkProvider;
    }
  }
  
  return null;
}

/**
 * Get network provider details
 * @param provider - Network provider name
 * @returns Provider details including name, color, and logo
 */
export function getNetworkDetails(provider: NetworkProvider) {
  return NETWORK_PROVIDERS[provider];
}

/**
 * Format phone number to standard Nigerian format
 * @param phoneNumber - Phone number to format
 * @returns Formatted phone number (0803 XXX XXXX)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  let normalized = cleaned;
  
  if (cleaned.startsWith('234')) {
    normalized = '0' + cleaned.slice(3);
  } else if (cleaned.length === 10) {
    normalized = '0' + cleaned;
  }
  
  if (normalized.length === 11) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  }
  
  return phoneNumber;
}

/**
 * Validate Nigerian phone number
 * @param phoneNumber - Phone number to validate
 * @returns True if valid Nigerian phone number
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  const cleaned = phoneNumber.replace(/\D/g, '');
  let normalized = cleaned;
  
  if (cleaned.startsWith('234')) {
    normalized = '0' + cleaned.slice(3);
  } else if (cleaned.length === 10) {
    normalized = '0' + cleaned;
  }
  
  // Must be 11 digits and start with 0
  if (normalized.length !== 11 || !normalized.startsWith('0')) {
    return false;
  }
  
  // Must match a known prefix
  return detectNetworkProvider(normalized) !== null;
}
