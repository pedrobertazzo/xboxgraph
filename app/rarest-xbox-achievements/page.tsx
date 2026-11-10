import { TopicPage } from '@/components/TopicPage';
import { pageMeta } from '@/lib/site';
import { topic } from '@/lib/topics';

const t = topic('rarest-xbox-achievements')!;
export const metadata = { ...pageMeta('/rarest-xbox-achievements', t.title, t.description), title: { absolute: t.title } };

export default function Page() {
  return <TopicPage t={t} />;
}
