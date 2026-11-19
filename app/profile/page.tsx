import { redirect } from 'next/navigation';

// /profile on its own (a trimmed link) has no player to show: back to the search.
export default function Page() {
  redirect('/');
}
