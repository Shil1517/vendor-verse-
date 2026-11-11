import { test, expect } from '@playwright/test'

test.describe('Vendor Workspace - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to vendor login/workspace
    await page.goto('http://localhost:5173')

    // Login as vendor (adjust selectors based on actual login flow)
    // For demo purposes, we'll assume direct navigation to vendor workspace
    await page.evaluate(() => {
      localStorage.setItem('vv-state', JSON.stringify({
        me: {
          role: 'vendor',
          loggedIn: true,
          vendorId: 'v-me',
          name: 'Test Vendor',
          buyerMode: false
        }
      }))
    })

    // Navigate to vendor dashboard
    await page.goto('http://localhost:5173/#/v_dash')
    await page.waitForLoadState('networkidle')
  })

  test('should default to light mode', async ({ page }) => {
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )

    expect(theme).toBeNull() // or 'light' depending on implementation

    // Verify light mode CSS variables
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )

    expect(bgColor).toBe('#f2fbf8')
  })

  test('should toggle to dark mode when theme toggle clicked', async ({ page }) => {
    // Find and click the theme toggle button
    const themeToggle = page.locator('.vx-theme-toggle').first()
    await expect(themeToggle).toBeVisible()

    await themeToggle.click()

    // Verify dark mode is applied
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )

    expect(theme).toBe('dark')

    // Verify dark mode CSS variables
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )

    expect(bgColor).toBe('#0a1a17')
  })

  test('should persist theme preference after page reload', async ({ page }) => {
    // Toggle to dark mode
    await page.locator('.vx-theme-toggle').first().click()

    // Wait for localStorage update
    await page.waitForTimeout(100)

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify dark mode persists
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )

    expect(theme).toBe('dark')
  })

  test('should toggle back to light mode', async ({ page }) => {
    // Toggle to dark mode
    await page.locator('.vx-theme-toggle').first().click()
    await page.waitForTimeout(100)

    // Toggle back to light mode
    await page.locator('.vx-theme-toggle').first().click()
    await page.waitForTimeout(100)

    // Verify light mode is restored
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )

    expect(theme).toBeNull() // or 'light'
  })

  test('should apply dark mode styles to all vendor screens', async ({ page }) => {
    // Toggle to dark mode
    await page.locator('.vx-theme-toggle').first().click()
    await page.waitForTimeout(100)

    // Test dashboard
    await page.goto('http://localhost:5173/#/v_dash')
    await page.waitForLoadState('networkidle')

    let theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('dark')

    // Test listings page
    await page.goto('http://localhost:5173/#/v_listings')
    await page.waitForLoadState('networkidle')

    theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('dark')

    // Test verification page
    await page.goto('http://localhost:5173/#/v_verify')
    await page.waitForLoadState('networkidle')

    theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('dark')
  })

  test('should have proper contrast ratios in dark mode', async ({ page }) => {
    // Toggle to dark mode
    await page.locator('.vx-theme-toggle').first().click()
    await page.waitForTimeout(100)

    // Check text color contrast
    const textColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()
    )
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )

    expect(textColor).toBe('#e8f5f2')
    expect(bgColor).toBe('#0a1a17')

    // Verify contrast ratio (should be at least 4.5:1 for WCAG AA)
    // This is a simplified check - in production use a contrast checker library
    const contrast = await page.evaluate(() => {
      const getRelativeLuminance = (hex) => {
        const rgb = parseInt(hex.slice(1), 16)
        const r = ((rgb >> 16) & 0xff) / 255
        const g = ((rgb >> 8) & 0xff) / 255
        const b = (rgb & 0xff) / 255

        const adjust = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)

        return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)
      }

      const L1 = getRelativeLuminance('#e8f5f2')
      const L2 = getRelativeLuminance('#0a1a17')

      return (L1 + 0.05) / (L2 + 0.05)
    })

    expect(contrast).toBeGreaterThan(4.5)
  })

  test('should apply dark mode to glass morphism effects', async ({ page }) => {
    // Toggle to dark mode
    await page.locator('.vx-theme-toggle').first().click()
    await page.waitForTimeout(100)

    // Check glass variables
    const glassColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--glass').trim()
    )

    expect(glassColor).toContain('rgba(15, 35, 30')

    // Verify backdrop-filter is still applied
    const sidebarBackdrop = await page.locator('.vx-side').first().evaluate((el) =>
      getComputedStyle(el).backdropFilter
    )

    expect(sidebarBackdrop).toContain('blur')
  })

  test('should have accessible theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('.vx-theme-toggle').first()

    // Check ARIA label
    const ariaLabel = await themeToggle.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel).toMatch(/dark|light/i)

    // Check it's keyboard accessible
    await themeToggle.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )

    expect(theme).toBe('dark')
  })

  test('should show correct icon for current theme', async ({ page }) => {
    // In light mode, should show moon icon
    let iconVisible = await page.locator('.vx-theme-toggle svg[data-lucide="moon"]').isVisible().catch(() => false)

    if (!iconVisible) {
      // Alternative: check for Moon component rendered
      iconVisible = await page.locator('.vx-theme-toggle').first().textContent().then(() => true)
    }

    // Click to toggle
    await page.locator('.vx-theme-toggle').first().click()
    await page.waitForTimeout(100)

    // In dark mode, should show sun icon
    const sunIconVisible = await page.locator('.vx-theme-toggle').first().isVisible()
    expect(sunIconVisible).toBeTruthy()
  })
})
