import { expect, test } from '@playwright/test';

test("la page d'accueil se charge et affiche le nom de la plateforme", async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'FlowMarket' })).toBeVisible();
});

test('une route inexistante affiche la page 404', async ({ page }) => {
  const response = await page.goto('/cette-page-nexiste-pas');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('Page introuvable')).toBeVisible();
});
