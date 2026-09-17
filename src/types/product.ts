export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
}

export interface ProductSpecification {
  id: string;
  name: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  shortDescription?: string;
  description?: string;
  images: ProductImage[];
  specifications: ProductSpecification[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}