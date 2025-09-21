import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Image, Eye } from 'lucide-react';
import { useSiteAssets } from '@/hooks/useSiteAssets';
import { toast } from 'sonner';

const ASSET_CONFIGS = [
  {
    name: 'carousel_1',
    label: 'Imagem 1 do Carousel',
    description: 'Primeira imagem do carousel principal (1920x600 recomendado)'
  },
  {
    name: 'carousel_2',
    label: 'Imagem 2 do Carousel',
    description: 'Segunda imagem do carousel principal (1920x600 recomendado)'
  },
  {
    name: 'carousel_3',
    label: 'Imagem 3 do Carousel',
    description: 'Terceira imagem do carousel principal (1920x600 recomendado)'
  },
  {
    name: 'scratch_overlay',
    label: 'Imagem Superior da Raspadinha',
    description: 'Imagem que será raspada nas raspadinhas (400x300 recomendado)'
  },
  {
    name: 'logo',
    label: 'Logo do Header/Footer',
    description: 'Logo da empresa para header e footer (300x100 recomendado)'
  }
];

export function PersonalizationTab() {
  const { assets, loading, uploadAsset, getAssetUrl } = useSiteAssets();
  const [uploading, setUploading] = useState<string | null>(null);

  const handleFileUpload = async (assetName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB permitido');
      return;
    }

    setUploading(assetName);
    await uploadAsset(assetName, file);
    setUploading(null);
    
    // Reset input
    event.target.value = '';
  };

  const openPreview = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Personalização do Site</h2>
        <p className="text-muted-foreground">
          Faça upload dos assets principais do site. As alterações serão aplicadas automaticamente em toda aplicação.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {ASSET_CONFIGS.map((config) => (
          <Card key={config.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                {config.label}
              </CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Image Preview */}
              <div className="relative">
                <img
                  src={getAssetUrl(config.name)}
                  alt={config.label}
                  className="w-full h-32 object-cover rounded-lg border bg-muted"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => openPreview(getAssetUrl(config.name))}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Section */}
              <div className="space-y-2">
                <Label htmlFor={`upload-${config.name}`}>
                  Selecionar novo arquivo
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`upload-${config.name}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(config.name, e)}
                    disabled={uploading === config.name}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    disabled={uploading === config.name}
                    onClick={() => document.getElementById(`upload-${config.name}`)?.click()}
                  >
                    {uploading === config.name ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* File Info */}
              <div className="text-sm text-muted-foreground">
                <p><strong>Formatos:</strong> JPG, PNG, WEBP</p>
                <p><strong>Tamanho máximo:</strong> 5MB</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>💡 Dicas importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Use imagens de alta qualidade para melhor aparência</p>
          <p>• Mantenha as proporções recomendadas para evitar distorções</p>
          <p>• As alterações são aplicadas automaticamente após o upload</p>
          <p>• Recomendamos fazer backup das imagens originais</p>
        </CardContent>
      </Card>
    </div>
  );
}