import { TopicPage } from '@/components/TopicPage';
import { pageMeta } from '@/lib/site';
import { topic } from '@/lib/topics';

const t = topic('xbox-gamerscore')!;
export const metadata = { ...pageMeta('/xbox-gamerscore', t.title, t.description), title: { absolute: t.title } };

export default function Page() {
  return <TopicPage t={t} />;
}
