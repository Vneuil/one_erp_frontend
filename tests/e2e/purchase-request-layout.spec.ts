import { test, expect } from '@playwright/test';
for (const width of [390, 1024, 1440]) {
  test(`purchase request form stays inside modal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.addInitScript(() => localStorage.setItem('one_erp_token', 'test'));
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/auth/me') ? { user: { id: 'test', name: 'Test', role: 'admin' } } : path.endsWith('/products') ? [{ id: 'p1', name: 'Long product name '.repeat(10), sku: 'SKU-TEST' }] : [];
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto('http://localhost:3001/procurement/purchase-requests');
    await page.getByRole('button', { name: 'Submit Purchase Request' }).click();
    const dialog = page.getByRole('dialog');
    async function checkBounds() {
      const result = await dialog.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, overflow: el.scrollWidth > el.clientWidth, fieldsFit: Array.from(el.querySelectorAll('input,select,button')).every(field => { const f = field.getBoundingClientRect(); return f.left >= r.left && f.right <= r.right; }) };
      });
      expect(result).toEqual({ fits: true, overflow: false, fieldsFit: true });
    }
    await checkBounds();
    await dialog.getByRole('combobox').selectOption('p1');
    await dialog.getByRole('button', { name: 'Tambah', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Hapus' })).toBeVisible();
    await checkBounds();
    await dialog.getByRole('button', { name: 'Submit Request', exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('button', { name: 'Submit Request', exact: true })).toBeInViewport();
  });
}
