import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserProfile } from '@/services/firestore/users';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: displayName
      });

      // Create user profile in Firestore
      await createUserProfile(userCredential.user.uid, {
        displayName: displayName,
        email: email,
        avatar: '👤', // Default avatar
      });

      toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido creada.",
        variant: "default"
      });

      return { error: null, user: userCredential.user };
    } catch (error: any) {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: "¡Bienvenido de vuelta!",
        description: "Sesión iniciada correctamente.",
      });

      return { error: null, user: userCredential.user };
    } catch (error: any) {
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);

      toast({
        title: "Sesión cerrada",
        description: "¡Hasta la próxima!",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error inesperado",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);

      toast({
        title: "Revisa tu correo",
        description: "Te enviamos un enlace para restablecer tu contraseña."
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Error inesperado",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    sendPasswordReset
  };
}