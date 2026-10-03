import { test, expect } from '@playwright/test';
for (const width of [390, 1024, 1440]) {
  test(`pipeline columns stay separate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('one_erp_token', 'test'));
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/auth/me') ? { user: { id: 'test', name: 'Test', role: 'admin' } } : path.endsWith('/deals') ? ['discovery','quotation','negotiation','won','lost'].map((stage, i) => ({ id: `8f4df048-2e48-4102-9b5f-299b7e4e522${i}`, title: 'Example deal', customer: 'Example customer', value: 85000000, probability: 60, stage, pic: 'Example owner', expectedClosing: '2026-10-05' })) : [];
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto('http://localhost:3001/crm/pipeline');
    const cards = page.locator('[draggable="true"]');
    await expect(cards).toHaveCount(5);
    const dimensions = await cards.evaluateAll(elements => elements.map(el => {
      const column = el.parentElement!.parentElement!;
      const c = column.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: c.x, y: c.y, right: c.right, bottom: c.bottom, cardX: r.x, cardRight: r.right, overflow: el.scrollWidth > el.clientWidth };
    }));
    for (let i = 0; i < dimensions.length; i++) {
      const current = dimensions[i];
      expect(current.cardX).toBeGreaterThan(current.x);
      expect(current.cardRight).toBeLessThan(current.right);
      expect(current.overflow).toBe(false);
      if (i > 0) {
        const previous = dimensions[i - 1];
        expect(width >= 768 ? current.x - previous.right : current.y - previous.bottom).toBeGreaterThanOrEqual(12);
      }
    }
  });
}
