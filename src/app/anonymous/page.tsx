import { redirect } from 'next/navigation';

export default function AnonymousPage() {
  redirect('/login');
}
