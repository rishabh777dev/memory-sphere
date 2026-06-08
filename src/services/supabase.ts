import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface Album {
  id: string;
  name: string;
  created_at: string;
  user_id?: string;
  is_public?: boolean;
  drive_folder_id?: string;
  invite_code?: string;
  allow_guest_uploads?: boolean;
}

export interface Photo {
  id: string;
  album_id: string;
  image_url: string;
  title?: string;
  description?: string;
  created_at?: string;
  uploaded_by?: string; // Track who uploaded the photo
}

export interface AlbumMember {
  album_id: string;
  user_id: string;
  role: 'owner' | 'contributor' | 'viewer';
}

export const albumService = {
  async fetchAlbums(userId: string): Promise<Album[]> {
    return this.fetchUserAlbums(userId);
  },

  async fetchUserAlbums(userId: string): Promise<Album[]> {
    const { data, error } = await supabase
      .from('album_members')
      .select('role, albums(*)')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map((item: any) => ({
      ...item.albums,
      user_role: item.role
    }));
  },

  async fetchAlbum(id: string): Promise<Album> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async fetchPublicAlbum(id: string): Promise<Album> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createAlbum(userId: string, name: string): Promise<Album> {
    const id = uuidv4();
    const invite_code = uuidv4().slice(0, 8).toUpperCase();
    const { data, error } = await supabase
      .from('albums')
      .insert([{ 
        id, 
        name, 
        user_id: userId, 
        is_public: false,
        invite_code,
        allow_guest_uploads: true
      }])
      .select()
      .single();
    
    if (error) throw error;

    // Auto-join the creator as 'owner'
    await albumMemberService.addMember(id, userId, 'owner');
    
    return data;
  },

  async joinAlbumByInviteCode(userId: string, inviteCode: string): Promise<Album> {
    const { data: album, error: findError } = await supabase
      .from('albums')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();
    
    if (findError) throw new Error('Invalid invite code');

    await albumMemberService.addMember(album.id, userId, 'contributor');
    return album;
  },

  async updateAlbum(id: string, updates: Partial<Album>): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateAlbumName(id: string, name: string): Promise<void> {
    return this.updateAlbum(id, { name });
  },

  async deleteAlbum(id: string): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export const albumMemberService = {
  async addMember(albumId: string, userId: string, role: 'owner' | 'contributor' | 'viewer'): Promise<void> {
    const { error } = await supabase
      .from('album_members')
      .upsert([{ album_id: albumId, user_id: userId, role }], { onConflict: 'album_id,user_id' });
    
    if (error) throw error;
  },

  async getRole(albumId: string, userId: string): Promise<'owner' | 'contributor' | 'viewer' | null> {
    const { data, error } = await supabase
      .from('album_members')
      .select('role')
      .eq('album_id', albumId)
      .eq('user_id', userId)
      .single();
    
    if (error) return null;
    return data.role;
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

    const { error: uploadError } = await supabase.storage
      .from('memory-sphere-images')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('memory-sphere-images')
      .getPublicUrl(filePath);

    const newPhoto = {
      id: uuidv4(),
      album_id: albumId,
      image_url: publicUrl,
      title: file.name.split('.')[0]
    };

    const { data, error: insertError } = await supabase
      .from('photos')
      .insert([newPhoto])
      .select()
      .single();
    
    if (insertError) throw insertError;
    return data;
  },

  async saveDriveMetadata(albumId: string, webContentLink: string, fileName: string): Promise<Photo> {
    const newPhoto = {
      id: uuidv4(),
      album_id: albumId,
      image_url: webContentLink, // Store the direct Drive link
      title: fileName.split('.')[0]
    };

    const { data, error } = await supabase
      .from('photos')
      .insert([newPhoto])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePhotoMetadata(id: string, updates: Partial<Photo>): Promise<void> {
    const { error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async deletePhotoRecord(photoId: string): Promise<void> {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);
    
    if (error) throw error;
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
