'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ProductVariationImageContextValue {
  selectedImage: string | null;
  setSelectedImage: (image: string | null) => void;
}

const ProductVariationImageContext = createContext<ProductVariationImageContextValue | null>(null);

export function ProductVariationImageProvider({ children }: { children: ReactNode }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <ProductVariationImageContext.Provider value={{ selectedImage, setSelectedImage }}>
      {children}
    </ProductVariationImageContext.Provider>
  );
}

export function useProductVariationImage() {
  const context = useContext(ProductVariationImageContext);
  if (!context) throw new Error('Product variation image context is missing.');
  return context;
}
