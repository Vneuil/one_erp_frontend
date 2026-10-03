import { test, expect } from '@playwright/test';

test('warehouse products reload, clear lines, enforce available stock and recover from errors', async ({ page }) => {
  let calls = 0;
  await page.addInitScript(() => localStorage.setItem('one_erp_token', 'local-test'));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/auth/me')) data = { user: { id: 'test', name: 'Test', role: 'admin' } };
    if (path.endsWith('/customers')) data = [{ id: 'c1', code: 'C1', name: 'Customer' }];
    if (path.endsWith('/warehouses')) data = [{ id: 'w1', name: 'Gudang A' }, { id: 'w2', name: 'Gudang B' }, { id: 'w3', name: 'Gudang Kosong' }];
    if (path.endsWith('/products')) data = [{ id: 'p1', name: 'Produk A', sellingPrice: 100, stock: 999 }, { id: 'p2', name: 'Produk B', sellingPrice: 200, stock: 999 }];
    if (path.endsWith('/stock-levels')) {
      calls++;
      if (calls === 2) { await route.fulfill({ status: 500, json: { message: 'Test error' } }); return; }
      data = [{ productId: 'p1', warehouseId: 'w1', available: 2 }, { productId: 'p2', warehouseId: 'w2', available: 5 }];
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('http://localhost:3001/sales/sales-orders');
  await page.getByRole('button', { name: 'Create Sales Order' }).click();
  const dialog = page.getByRole('dialog');
  const products = page.getByRole('combobox', { name: 'Produk gudang' });
  await expect(products.locator('option')).toHaveText(['Pilih produk...', 'Produk A (Stok tersedia: 2)']);
  await products.selectOption('p1');
  await dialog.getByRole('button', { name: 'Tambah', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Hapus' })).toBeVisible();
  await products.selectOption('p1');
  await dialog.getByRole('spinbutton').last().fill('2');
  let warning = '';
  page.once('dialog', async alert => { warning = alert.message(); await alert.accept(); });
  await dialog.getByRole('button', { name: 'Tambah', exact: true }).click();
  await expect.poll(() => warning).toContain('melebihi stok');
  await page.getByLabel('Warehouse', { exact: false }).selectOption('w2');
  await expect(dialog.getByRole('button', { name: 'Hapus' })).toHaveCount(0);
  await expect(products).toHaveValue('');
  await expect(dialog.getByText('Gagal memuat stok gudang.', { exact: false })).toBeVisible();
  await expect(products).toBeDisabled();
  await dialog.getByRole('button', { name: 'Muat ulang stok' }).click();
  await expect(products.locator('option')).toHaveText(['Pilih produk...', 'Produk B (Stok tersedia: 5)']);
  await page.getByLabel('Warehouse', { exact: false }).selectOption('w3');
  await expect(dialog.getByText('Tidak ada produk dengan stok tersedia di gudang ini.')).toBeVisible();
  await expect(products.locator('option')).toHaveCount(1);
  expect(calls).toBe(4);
});
