import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import AuthForm from './components/AuthForm';
import NotesDashboard from './components/NotesDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [forceDemoMode, setForceDemoMode] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return undefined;
    }

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
      if (nextSession) {
        setForceDemoMode(false);
      }
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
        <p className="text-sm font-medium">Initialisation de VoxNote...</p>
      </div>
    );
  }

  // Mode Démo Local automatique si Supabase n'est pas encore configuré dans .env
  if (!isSupabaseConfigured) {
    return (
      <NotesDashboard
        user={{ id: 'demo-user', email: 'demo@voxnote.local' }}
        isDemoMode
      />
    );
  }

  // Si Supabase est configuré mais que l'utilisateur explore l'aperçu Démo
  if (forceDemoMode && !session) {
    return (
      <NotesDashboard
        user={{ id: 'demo-user', email: 'demo@voxnote.local' }}
        isDemoMode
        onExitDemoMode={() => setForceDemoMode(false)}
      />
    );
  }

  // Authentification Supabase requise pour bénéficier des politiques RLS
  if (!session) {
    return <AuthForm onEnterDemoMode={() => setForceDemoMode(true)} />;
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
