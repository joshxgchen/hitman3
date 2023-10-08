/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./<custom-folder>/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
    fontFamily:{
        'Inter' :['Inter-Regular',],
        'InterBold' :['Inter-Bold',],
        'InterMedium' :['Inter-Medium',],
        'InterBold2' :['Inter-ExtraBold'],
    },
  },
  plugins: [],
}

