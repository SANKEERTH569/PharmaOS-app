import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.pharma.retailer',
    appName: 'Pharma Retailer',
    webDir: 'dist',
    server: {
        // For development, allow cleartext traffic to local backend
        cleartext: true,
        androidScheme: 'https',
    },
};

export default config;
