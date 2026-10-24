import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AuthForm from './components/AuthForm';
import NotesDashboard from './components/NotesDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        setSession(currentSession);
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Connexion à VoxNote...</p>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <NotesDashboard
      user={session.user}
      isDemoMode={false}
      onSignOut={handleSignOut}
    />
  );
}
