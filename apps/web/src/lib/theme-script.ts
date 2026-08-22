// Runs before paint (see layout.tsx) so there's no flash of the wrong theme.
// No stored choice = leave data-theme unset and let the OS preference decide.
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;
