import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Album {
  id: string;
  name: string;
  created_at: string;
  user_id?: string;
}

export interface Photo {
  id: string;
  album_id: string;
  image_url: string;
  created_at?: string;
}

export const albumService = {
  async fetchAlbums(userId: string): Promise<Album[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createAlbum(userId: string, name: string): Promise<Album> {
    const id = uuidv4();
    const { data, error } = await supabase
      .from('albums')
      .insert([{ id, name, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateAlbumName(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .update({ name })
      .eq('id', id);
    
    if (error) throw error;
  },

  async deleteAlbum(id: string): Promise<void> {
    // Note: Photos should be deleted via cascading or manually if RLS/Triggers aren't set
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export const photoService = {
  async fetchPhotos(albumId: string): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async uploadPhoto(albumId: string, file: File): Promise<Photo> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${albumId}/${fileName}`;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('memory-sphere-images')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('memory-sphere-images')
      .getPublicUrl(filePath);

    // 3. Insert into Database
    const newPhoto = {
      id: uuidv4(),
      album_id: albumId,
      image_url: publicUrl
    };

    const { data, error: insertError } = await supabase
      .from('photos')
      .insert([newPhoto])
      .select()
      .single();
    
    if (insertError) throw insertError;
    return data;
  },

  async deletePhoto(photoId: string, url: string): Promise<void> {
    // 1. Extract path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const storageIndex = pathParts.indexOf('memory-sphere-images');
    const filePath = pathParts.slice(storageIndex + 1).join('/');

    // 2. Delete from Storage first (if it fails, we still have the DB record to retry)
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('memory-sphere-images')
        .remove([filePath]);
      if (storageError) console.warn('Storage deletion failed:', storageError);
    }

    // 3. Delete from DB
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);
    
    if (dbError) throw dbError;
  }
};
