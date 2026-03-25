import PageLayout from '../components/PageLayout';

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageLayout>{children}</PageLayout>;
}

