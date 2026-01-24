import { useState, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';

export default function Perfil() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile, uploadAvatar } = useProfile();
  const [storeName, setStoreName] = useState(profile?.store_name || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadAvatar(file);
    if (url) await updateProfile.mutateAsync({ avatar_url: url });
    setUploading(false);
  };

  const handleSave = () => updateProfile.mutate({ store_name: storeName });

  if (isLoading) return <AppLayout title="Meu Perfil"><div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout title="Meu Perfil">
      <div className="max-w-xl mx-auto">
        <Card className="glass-card">
          <CardHeader><CardTitle>Informações do Perfil</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/30">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl">{(profile?.store_name || user?.email || 'RM').substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{user?.email}</p>
            </div>

            <div><Label>Nome da Loja</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Minha Loja" className="input-glass" /></div>

            <Button onClick={handleSave} disabled={updateProfile.isPending} className="w-full gradient-primary">
              {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar Alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
