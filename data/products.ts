import type { Product } from '@/types/grocery';

/**
 * Mock product database.
 * In production, replace this with an API call or local database query.
 */
export const products: Product[] = [
  { id: '1', barcode: '4901234567890', name: 'Jasmine Rice (5kg)', price: 12.99, category: 'Grains' },
  { id: '2', barcode: '4902345678901', name: 'Whole Milk (1L)', price: 3.49, category: 'Dairy' },
  { id: '3', barcode: '4903456789012', name: 'Free-Range Eggs (12pc)', price: 5.99, category: 'Dairy' },
  { id: '4', barcode: '4904567890123', name: 'Sliced White Bread', price: 2.49, category: 'Bakery' },
  { id: '5', barcode: '4905678901234', name: 'Chicken Breast (1kg)', price: 8.99, category: 'Meat' },
  { id: '6', barcode: '4906789012345', name: 'Olive Oil (500ml)', price: 7.49, category: 'Cooking' },
  { id: '7', barcode: '4907890123456', name: 'Canned Tuna (185g)', price: 2.29, category: 'Canned Goods' },
  { id: '8', barcode: '4908901234567', name: 'Pasta Spaghetti (500g)', price: 1.99, category: 'Grains' },
  { id: '9', barcode: '4909012345678', name: 'Tomato Sauce (680g)', price: 3.29, category: 'Canned Goods' },
  { id: '10', barcode: '4910123456789', name: 'Cheddar Cheese (200g)', price: 4.99, category: 'Dairy' },
  { id: '11', barcode: '4911234567890', name: 'Banana (per kg)', price: 1.49, category: 'Fruits' },
  { id: '12', barcode: '4912345678901', name: 'Apple Red (per kg)', price: 3.99, category: 'Fruits' },
  { id: '13', barcode: '4913456789012', name: 'Orange Juice (1L)', price: 4.49, category: 'Beverages' },
  { id: '14', barcode: '4914567890123', name: 'Mineral Water (1.5L)', price: 0.99, category: 'Beverages' },
  { id: '15', barcode: '4915678901234', name: 'Instant Coffee (200g)', price: 6.99, category: 'Beverages' },
  { id: '16', barcode: '4916789012345', name: 'Sugar (1kg)', price: 1.79, category: 'Baking' },
  { id: '17', barcode: '4917890123456', name: 'All-Purpose Flour (1kg)', price: 1.49, category: 'Baking' },
  { id: '18', barcode: '4918901234567', name: 'Butter (250g)', price: 3.99, category: 'Dairy' },
  { id: '19', barcode: '4919012345678', name: 'Soy Sauce (500ml)', price: 2.99, category: 'Condiments' },
  { id: '20', barcode: '4920123456789', name: 'Dishwashing Liquid (500ml)', price: 2.49, category: 'Household' },
];

/**
 * Look up a product by its barcode.
 * Returns the product if found, or undefined if the barcode is not in the database.
 */
export function findProductByBarcode(barcode: string): Product | undefined {
  return products.find((p) => p.barcode === barcode);
}
