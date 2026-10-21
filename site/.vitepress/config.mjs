import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'NHPAOWA Platform',
  description:
    'Association management platform for NHPAOWA (TATA New Haven, Bengaluru) — flats, NOC, moves, attendance, school bus gate, and inventory.',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: 'localhostLinks',
  markdown: {
    languageAlias: { env: 'ini' },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#8e2490' }],
  ],
  themeConfig: {
    logo: '/logo-mark.png',
    siteTitle: 'NHPAOWA',
    nav: [
      { text: 'Installation', link: '/installation/', activeMatch: '/installation/' },
      { text: 'Configuration', link: '/administration/configuration', activeMatch: '/administration/' },
      { text: 'Usage', link: '/usage/', activeMatch: '/usage/' },
      { text: 'API', link: '/api/', activeMatch: '/api/' },
      { text: 'Features', link: '/help/features' },
      { text: 'FAQ', link: '/help/faq' },
    ],
    sidebar: [
      {
        text: 'Installation',
        items: [
          { text: 'Get Started', link: '/installation/' },
          { text: 'System Requirements', link: '/installation/system-requirements' },
          { text: 'Run with Docker', link: '/installation/docker' },
          { text: 'Install on Windows', link: '/installation/windows' },
          { text: 'Install on Linux', link: '/installation/linux' },
          { text: 'Run from Source (Dev)', link: '/installation/from-source' },
          { text: 'Reverse Proxy', link: '/installation/reverse-proxy' },
          { text: 'Vercel Hosting', link: '/installation/vercel-hosting' },
          { text: 'Supabase Database', link: '/installation/supabase' },
        ],
      },
      {
        text: 'Administration',
        items: [
          { text: 'Configuration', link: '/administration/configuration' },
          { text: 'Roles & Permissions', link: '/administration/roles' },
          { text: 'Users & Menu Features', link: '/administration/users' },
          { text: 'Command Line', link: '/administration/command-line' },
          { text: 'Troubleshooting', link: '/administration/troubleshooting' },
        ],
      },
      {
        text: 'Usage',
        items: [
          { text: 'Basic Usage', link: '/usage/' },
          { text: 'Flat Owners & Household', link: '/usage/flats' },
          { text: 'Flat Self-Update Link', link: '/usage/flat-self-update' },
          { text: 'NOC Certificates', link: '/usage/noc' },
          { text: 'Move-In / Move-Out', link: '/usage/moves' },
          { text: 'Notices & Board', link: '/usage/notices-board' },
          { text: 'Staff Attendance', link: '/usage/attendance' },
          { text: 'School Bus Management', link: '/usage/school-bus' },
          { text: 'Inventory', link: '/usage/inventory' },
          { text: 'Purchasing & AMC', link: '/usage/purchasing' },
          { text: 'Reports & Alerts', link: '/usage/reports' },
          { text: 'Resident Portal', link: '/usage/resident-portal' },
          { text: 'Vendor Portal', link: '/usage/vendor-portal' },
          { text: 'Mobile & PWA', link: '/usage/mobile' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Introduction', link: '/api/' },
          { text: 'Identity API', link: '/api/identity' },
          { text: 'Association API', link: '/api/association' },
          { text: 'Inventory API', link: '/api/inventory' },
          { text: 'School Bus API', link: '/api/bus' },
        ],
      },
      {
        text: 'Contributing',
        items: [{ text: 'Developing', link: '/contributing/developing' }],
      },
      {
        text: 'Help',
        items: [
          { text: 'Feature List', link: '/help/features' },
          { text: 'Screenshot Gallery', link: '/help/gallery' },
          { text: 'FAQ', link: '/help/faq' },
        ],
      },
    ],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    footer: {
      message: 'New Haven Peenya Apartment Owners Welfare Association (NHPAOWA), Bengaluru.',
      copyright: 'Association-owned platform.',
    },
    docFooter: { prev: 'Previous page', next: 'Next page' },
  },
});
