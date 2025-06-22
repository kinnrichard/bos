- Remember to run `rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json` before the end of your turn when you've made a styling change
- If you added new view functionality, write the appropriate Playwright test suites
- If you make any changes to view code, javascript, and/or CSS, please at a bare minimum run the appropriate Playwright test suite(s).

## Dropdown Positioning

When creating dropdowns inside scrollable containers or popovers, use `data-dropdown-positioning-value="fixed"`:

```erb
<div data-controller="dropdown" data-dropdown-positioning-value="fixed">
  <button data-dropdown-target="button">Menu</button>
  <div data-dropdown-target="menu" class="dropdown-menu hidden">
    <!-- menu items -->
  </div>
</div>
```

The dropdown controller will auto-detect scrollable containers and switch to fixed positioning when needed.