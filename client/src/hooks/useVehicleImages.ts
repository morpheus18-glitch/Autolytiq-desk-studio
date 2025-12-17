/**
 * Vehicle Images Hook
 *
 * Fetches vehicle images from Unsplash API based on make/model.
 * Falls back to placeholder images when not available.
 */

import { useQuery } from '@tanstack/react-query';

// Unsplash API configuration
// Note: For production, move this to environment variables
const UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // Replace with actual key or env var

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  user: {
    name: string;
    username: string;
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

/**
 * Generate a placeholder image URL based on vehicle info
 * Uses a gradient background with vehicle info text
 */
export function getPlaceholderImage(make: string, model: string, color?: string): string {
  // Use placeholder.com or generate SVG data URL
  const baseColor = getColorHex(color) || '4F46E5'; // Default to indigo
  const text = encodeURIComponent(`${make} ${model}`);
  return `https://via.placeholder.com/800x600/${baseColor}/FFFFFF?text=${text}`;
}

/**
 * Convert color names to hex codes for placeholder
 */
function getColorHex(color?: string): string | null {
  if (!color) return null;

  const colorMap: Record<string, string> = {
    // Common car colors
    black: '1a1a1a',
    white: 'f5f5f5',
    silver: 'c0c0c0',
    gray: '808080',
    grey: '808080',
    red: 'dc2626',
    blue: '2563eb',
    green: '16a34a',
    yellow: 'eab308',
    orange: 'ea580c',
    brown: '78350f',
    gold: 'd4af37',
    beige: 'f5f5dc',
    // Premium colors
    'midnight black': '0a0a0a',
    'polar white': 'fafafa',
    'alpine white': 'f8f8ff',
    'obsidian black': '0d0d0d',
    'brilliant blue': '1e40af',
    'portimao blue': '1d4ed8',
    'selenite grey': '6b7280',
  };

  const normalizedColor = color.toLowerCase().trim();
  return colorMap[normalizedColor] || null;
}

/**
 * Fetch vehicle image from Unsplash API
 */
async function fetchVehicleImage(make: string, model: string): Promise<string | null> {
  // Skip API call if no access key configured
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
    return null;
  }

  try {
    const query = `${make} ${model} car`;
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`[VehicleImages] Unsplash API error: ${response.status}`);
      return null;
    }

    const data: UnsplashSearchResponse = await response.json();

    if (data.results.length > 0) {
      return data.results[0].urls.regular;
    }

    return null;
  } catch (error) {
    console.error('[VehicleImages] Failed to fetch from Unsplash:', error);
    return null;
  }
}

/**
 * Get a curated stock image URL based on make
 * These are generic car images that work without API keys
 */
function getCuratedImageUrl(make: string, model: string): string {
  // Curated Unsplash source URLs (no API key needed, but limited)
  const makeImages: Record<string, string> = {
    mercedes: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=600&fit=crop',
    bmw: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop',
    toyota: 'https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=800&h=600&fit=crop',
    honda: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&h=600&fit=crop',
    ford: 'https://images.unsplash.com/photo-1551830820-330a71b99659?w=800&h=600&fit=crop',
    chevrolet: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop',
    audi: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
    lexus: 'https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?w=800&h=600&fit=crop',
    porsche: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
    tesla: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=600&fit=crop',
  };

  const normalizedMake = make.toLowerCase().trim();

  // Return make-specific image if available
  if (makeImages[normalizedMake]) {
    return makeImages[normalizedMake];
  }

  // Default car image for unknown makes
  return 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop';
}

/**
 * Hook to get vehicle image URL
 * Tries Unsplash API first, falls back to curated images
 */
export function useVehicleImage(make: string, model: string, color?: string) {
  return useQuery({
    queryKey: ['vehicleImage', make, model],
    queryFn: async () => {
      // Try Unsplash API first
      const unsplashImage = await fetchVehicleImage(make, model);
      if (unsplashImage) {
        return unsplashImage;
      }

      // Fall back to curated images
      return getCuratedImageUrl(make, model);
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
    enabled: Boolean(make && model),
  });
}

/**
 * Get vehicle image URL synchronously (for immediate display)
 * Uses curated images without API call
 */
export function getVehicleImageUrl(make: string, model: string, existingImages?: string[]): string {
  // Use existing image if available
  if (existingImages && existingImages.length > 0 && existingImages[0]) {
    return existingImages[0];
  }

  // Return curated image based on make
  return getCuratedImageUrl(make, model);
}

export default useVehicleImage;
