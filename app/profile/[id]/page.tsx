import { ProfileView, profileMetadata, type Search } from '@/components/ProfileView';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Search> };

export async function generateMetadata({ params, searchParams }: Props) {
  return profileMetadata((await params).id, await searchParams);
}

export default async function Page({ params, searchParams }: Props) {
  return <ProfileView id={(await params).id} sp={await searchParams} />;
}
