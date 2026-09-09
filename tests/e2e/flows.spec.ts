import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, profile = 'Administrador') {
  await page.goto('/');
  await page.getByRole('button', { name: profile, exact: true }).click();
  await page.getByRole('button', { name: 'Entrar al sistema' }).click();
  await expect(page.getByRole('heading', { name: 'Una mirada a la movilidad.' })).toBeVisible();
}

test('captura entrada/salida, consulta el detalle y exporta solo la placa filtrada', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await page.getByLabel('Placa', { exact: true }).fill('E2E123');
  await page.getByLabel('Estacionamiento', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Registrar entrada', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Entrada de E2E123' })).toBeVisible();
  await page.getByRole('button', { name: 'Vehículos particulares', exact: true }).click();
  await page.getByLabel('Buscar placa').fill('E2E123');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: /Ver movimiento .* de E2E123/ }).click();
  await expect(page.getByText('Pendiente · vehículo dentro')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await page.getByRole('button', { name: 'Salida del campus' }).click();
  await page.getByLabel('Vehículo dentro del campus', { exact: true }).selectOption('E2E123');
  await page.getByRole('button', { name: 'Registrar salida', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Salida de E2E123' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Exportar CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('movimientos-aragon.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8');
  expect(text.match(/E2E123/g)?.length).toBe(2);
  expect(text).not.toContain('FIC100');
  expect(errors).toEqual([]);
});

test('transporte y seguridad: conteos persistentes y estado con historial', async ({ page }) => {
  await login(page, 'Seguridad');
  await page.getByRole('button', { name: 'Transporte', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await page.getByLabel('Unidad', { exact: true }).selectOption({ label: 'PUMABÚS 01 · UNAM101' });
  await page.getByLabel('Estudiantes que descienden').fill('23');
  await page.getByRole('button', { name: 'Registrar entrada', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Entrada de UNAM101' })).toBeVisible();
  await page.getByLabel('Buscar placa').fill('UNAM101');
  await expect(page.locator('tbody tr').first()).toContainText('23 descienden');
  await page.getByRole('button', { name: 'Seguridad escolar', exact: true }).click();
  const card = page
    .locator('.unit-card')
    .filter({ has: page.getByRole('heading', { name: 'ÁGUILA 01', exact: true }) });
  await card.getByRole('button', { name: 'Actualizar estado' }).click();
  await page.getByLabel('Nuevo estado').selectOption('inactivo');
  await page.getByLabel('Observación', { exact: true }).fill('Cambio de turno de prueba.');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(card).toContainText('Inactiva');
  await expect(page.locator('tbody tr').first()).toContainText('Cambio de turno de prueba.');
  await page.reload();
  await expect(card).toContainText('Inactiva');
  await page.screenshot({ path: 'artifacts/seguridad-desktop.png', fullPage: true });
});

test('administrador mantiene catálogos y usuarios; directivo carece de controles de escritura', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Administración', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar estacionamiento' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Zona exposición');
  await page.getByLabel('Capacidad total').fill('10');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('Zona exposición');
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar usuario' }).click();
  await page.getByLabel('Usuario', { exact: true }).fill('presentacion');
  await page.getByLabel('Nombre visible').fill('Consulta de exposición');
  await page.getByLabel('Rol', { exact: true }).selectOption('directivo');
  await page.getByLabel('Contraseña', { exact: true }).fill('Exposicion123!');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('presentacion');
  await page.getByRole('button', { name: 'Bitácora', exact: true }).click();
  await expect(page.locator('tbody tr').first()).toContainText('Usuario guardado');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('button', { name: 'Directivo', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar al sistema' }).click();
  await expect(page.getByRole('heading', { name: 'Una mirada a la movilidad.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar movimiento', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Administración', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Seguridad escolar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Actualizar estado', exact: true })).toHaveCount(0);
});

test('interfaz móvil, navegación, filtros vacíos y diálogo accesible por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: 'artifacts/login-mobile.png', fullPage: true });
  await login(page);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir navegación' }).click();
  await page.getByRole('button', { name: 'Vehículos particulares', exact: true }).click();
  await page.getByLabel('Buscar placa').fill('NINGUNA999');
  await expect(page.getByRole('heading', { name: 'No hay registros en este periodo' })).toBeVisible();
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});
