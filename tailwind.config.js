/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: 'var(--color-primary)',
            },
            textColor: {
                main: 'var(--text-main)',
                muted: 'var(--text-muted)',
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
