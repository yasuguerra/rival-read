import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RivalAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface Rival {
  name: string;
  archetype: string;
  skin: string;
  color: string;
}

export function RivalAvatar({ size = 'md', className = '' }: RivalAvatarProps) {
  const { user } = useAuth();
  const [rival, setRival] = useState<Rival>({
    name: 'RivalBot',
    archetype: 'disciplined',
    skin: 'classic',
    color: '#E11D48'
  });

  useEffect(() => {
    loadRival();
  }, [user]);

  const loadRival = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('rivals')
        .select('name, archetype, skin, color')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setRival(data);
      }
    } catch (error) {
      console.error('Error loading rival:', error);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8';
      case 'md':
        return 'w-12 h-12';
      case 'lg':
        return 'w-16 h-16';
      default:
        return 'w-12 h-12';
    }
  };

  const getArchetypeIcon = () => {
    switch (rival.archetype) {
      case 'speedster':
        return '⚡';
      case 'strategist':
        return '🎯';
      case 'disciplined':
      default:
        return '🤖';
    }
  };

  return (
    <div className={`${getSizeClasses()} ${className}`}>
      <div 
        className="w-full h-full rounded-full border-2 border-rival-primary/30 bg-gradient-rival flex items-center justify-center text-white font-bold shadow-gaming animate-rival-pulse"
        style={{ 
          borderColor: `${rival.color}40`,
          background: `linear-gradient(135deg, ${rival.color}, ${rival.color}CC)`
        }}
      >
        <span className={size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-2xl' : 'text-lg'}>
          {getArchetypeIcon()}
        </span>
      </div>
    </div>
  );
}