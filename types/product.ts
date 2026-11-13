export interface ProductSize {
  id: string;
  label: string;
  priceCents: number;
}

export interface ProductImage {
  src: string;
  alt: string;
}

export interface Product {
  slug: string;
  name: string;
  origin: string;
  process: string;
  notes: string[];
  roast: string;
  priceCents: number;
  unitLabel?: string;
  altitude: string;
  recipe: string;
  brand?: string;
  description?: string;
  image?: ProductImage;
  sizes?: ProductSize[];
  recipeLabel?: string;
}
