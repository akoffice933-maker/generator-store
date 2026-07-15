import { expect, test } from "@playwright/test";

test("customer can register, add a product and create an invoice order", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Регистрация" }).click();
  await page.getByPlaceholder("Имя").fill("E2E Customer");
  await page.getByPlaceholder("Телефон").fill("+79991112233");
  await page.getByPlaceholder("E-mail").fill(`customer-${Date.now()}@example.test`);
  await page.getByPlaceholder("Пароль").fill("CustomerE2EPassword!123");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page).toHaveURL(/\/account/);

  await page.goto("/catalog");
  await page.getByRole("button", { name: "В корзину" }).first().click();
  await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
  await page.getByRole("link", { name: "Оформить заказ" }).click();
  await expect(page.getByRole("heading", { name: "Оформление заказа" })).toBeVisible();
  await page.getByPlaceholder("Имя").fill("E2E Customer");
  await page.getByPlaceholder("Телефон").fill("+79991112233");
  await page.getByPlaceholder("E-mail").fill(`order-${Date.now()}@example.test`);
  await page.getByRole("button", { name: "Подтвердить заказ" }).click();
  await expect(page).toHaveURL(/\/account/);
});

test("admin performs catalogue and B2B actions that appear in audit trail", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("E-mail").fill("admin.e2e@example.test");
  await page.getByPlaceholder("Пароль").fill("AdminE2EPassword!123");
  await page.getByRole("button", { name: "Войти" }).click();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Панель управления" })).toBeVisible();

  await page.locator("label").filter({ hasText: "Название" }).locator("input").fill("E2E Portable Generator");
  await page.locator("label").filter({ hasText: "Slug" }).locator("input").fill(`e2e-generator-${Date.now()}`);
  await page.locator("label").filter({ hasText: "Мощность, кВт" }).locator("input").fill("2");
  await page.locator("label").filter({ hasText: "Остаток" }).locator("input").fill("3");
  await page.locator("label").filter({ hasText: "Розничная цена" }).locator("input").fill("10000");
  await page.locator("label").filter({ hasText: "Оптовая цена" }).locator("input").fill("9000");
  await page.getByRole("button", { name: "Создать товар" }).click();
  await expect(page.getByText("E2E Portable Generator")).toBeVisible();

  await page.getByRole("button", { name: "Пользователи" }).click();
  const b2bUser = page.locator("tr").filter({ hasText: "b2b@example.com" });
  await expect(b2bUser).toBeVisible();
  await b2bUser.locator("select").nth(1).selectOption("approved");

  await page.getByRole("button", { name: "Аудит" }).click();
  await expect(page.getByText("product.create")).toBeVisible();
  await expect(page.getByText("user.access_update")).toBeVisible();
});
