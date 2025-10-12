from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:5173")
        page.click("button:has-text('Create Room')")
        page.wait_for_selector("text=Share your ID:")
        page.screenshot(path="jules-scratch/verification/verification.png")
        browser.close()

run()
