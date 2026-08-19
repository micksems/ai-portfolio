export const metadata = {
  title: "Career Control Center",
  description: "Misha Semenov's job search dashboard.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function JobSearchLayout({ children }) {
  return children;
}
