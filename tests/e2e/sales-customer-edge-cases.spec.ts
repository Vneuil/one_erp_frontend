import { test, expect } from '@playwright/test';

for (const scenario of ['paginated', 'empty', 'retry']) {
  test(`master customer selection: ${scenario}`, async ({ page }) => {
    let failed = false;
    let submitted: Record<string, unknown> | undefined;
    await page.addInitScript(() => localStorage.setItem('one_erp_token', 'local-test-token'));
    await page.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      let data: unknown = [];
      let meta: unknown;
      if (url.pathname.endsWith('/auth/me')) data = { user: { id: 'test', name: 'Test', email: 'test@example.com', role: 'admin' } };
      if (url.pathname.endsWith('/customers')) {
        if (scenario === 'retry' && !failed) {
          failed = true;
          await route.fulfill({ status: 500, json: { message: 'Test failure' } });
          return;
        }
        const second = url.searchParams.get('page') === '2';
        data = scenario === 'empty' ? [] : [{ id: second ? 'customer-2' : 'customer-1', code: second ? 'C002' : 'C001', name: second ? 'Second Customer' : 'First Customer' }];
        meta = { totalPages: scenario === 'paginated' ? 2 : 1 };
      }
      if (url.pathname.endsWith('/inventory/warehouses')) data = [{ id: 'w1', name: 'Warehouse 1' }];
      if (url.pathname.endsWith('/inventory/stock-levels')) data = [{ productId: 'product-1', warehouseId: 'w1', available: 10 }];
      if (url.pathname.endsWith('/products')) data = [{ id: 'product-1', name: 'Test Product', sku: 'P1', stock: 10, sellingPrice: 100 }];
      if (url.pathname.endsWith('/sales/orders') && route.request().method() === 'POST') {
        submitted = route.request().postDataJSON();
        data = { ...submitted, id: 'order-test', orderNumber: 'SO-TEST', status: 'processing' };
      }
      await route.fulfill({ json: { success: true, data, meta } });
    });
    await page.goto('http://localhost:3001/sales/sales-orders');
    await page.getByRole('button', { name: 'Create Sales Order' }).click();
    const dialog = page.getByRole('dialog');
    const customer = page.getByLabel('Customer', { exact: true });
    const submit = dialog.getByRole('button', { name: 'Create Order', exact: true });
    await expect(submit).toBeDisabled();
    if (scenario === 'empty') {
      await expect(dialog.getByText('Belum ada customer.', { exact: false })).toBeVisible();
      await expect(customer).toBeDisabled();
      return;
    }
    if (scenario === 'retry') {
      await expect(dialog.getByRole('alert')).toBeVisible();
      await dialog.getByRole('button', { name: 'Coba lagi' }).click();
    }
    await customer.selectOption(scenario === 'paginated' ? 'customer-2' : 'customer-1');
    await expect(submit).toBeEnabled();
    await dialog.getByRole('combobox').nth(2).selectOption('product-1');
    await dialog.getByRole('button', { name: 'Tambah', exact: true }).click();
    await submit.click();
    await expect(dialog).not.toBeVisible();
    expect(submitted?.customerName).toBe(scenario === 'paginated' ? 'Second Customer' : 'First Customer');
  });
}
