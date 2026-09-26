export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
  seoText?: string;
  order: number;
}