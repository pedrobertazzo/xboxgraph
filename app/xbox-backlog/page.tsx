import { TopicPage } from '@/components/TopicPage';
import { pageMeta } from '@/lib/site';
import { topic } from '@/lib/topics';

const t = topic('xbox-backlog')!;
export const metadata = { ...pageMeta('/xbox-backlog', t.title, t.description), title: { absolute: t.title } };

export default function Page() {
  return <TopicPage t={t} />;
}
