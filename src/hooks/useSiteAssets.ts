import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SiteAsset {
  id: string;
  asset_name: string;
  file_name: string;
  file_url: string;
  updated_at: string;
  created_at: string;
}

export const useSiteAssets = () => {
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('site_assets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Deduplicate by asset_name keeping the most recent
      const uniqueMap = new Map<string, SiteAsset>();
      (data || []).forEach((item) => {
        if (!uniqueMap.has(item.asset_name)) uniqueMap.set(item.asset_name, item);
      });

      setAssets(Array.from(uniqueMap.values()));
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      toast.error(`Erro ao carregar assets: ${error?.message ?? 'tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadAsset = async (assetName: string, file: File) => {
    try {
      setLoading(true);
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${assetName}-${Date.now()}.${fileExt}`;
      const filePath = `assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      // Update database
      const { error: dbError } = await supabase
        .from('site_assets')
        .upsert({
          asset_name: assetName,
          file_name: fileName,
          file_url: publicUrl
        });

      if (dbError) throw dbError;

      await fetchAssets();
      toast.success('Asset atualizado com sucesso!');
    } catch (error) {
      console.error('Error uploading asset:', error);
      toast.error('Erro ao fazer upload do asset');
    } finally {
      setLoading(false);
    }
  };

  const getAssetUrl = (assetName: string) => {
    const asset = assets.find(a => a.asset_name === assetName);
    // Add cache busting to force refresh when assets change
    return asset?.file_url ? `${asset.file_url}?v=${asset.updated_at}` : '/placeholder.svg';
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  return {
    assets,
    loading,
    uploadAsset,
    getAssetUrl,
    refetch: fetchAssets
  };
};