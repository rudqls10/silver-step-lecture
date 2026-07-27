/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        // 시니어 친화: 기본 글자 크기 상향
        base: ["1.125rem", { lineHeight: "1.75rem" }],
        lg: ["1.25rem", { lineHeight: "1.875rem" }],
        xl: ["1.5rem", { lineHeight: "2rem" }],
        "2xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "3xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      colors: {
        // 강조 색상은 한 가지만 사용 (UI_REFERENCE)
        brand: {
          DEFAULT: "#1E6FB8",
          dark: "#15538A",
          light: "#E8F2FB",
        },
      },
    },
  },
  plugins: [],
};
