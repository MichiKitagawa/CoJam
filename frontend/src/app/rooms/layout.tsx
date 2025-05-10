import MainLayout from "../../components/layout/MainLayout";

export default function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
} 